/**
 * Claude Code Agent SDK — runtime implementation.
 *
 * The SDK consumer runs in their own process. These functions spawn the CLI
 * as a subprocess and drive it via the NDJSON control protocol over
 * stdin/stdout (see sdk/controlTypes.ts).
 */

import { spawn, type Subprocess } from "bun"
import { randomUUID } from "crypto"
import { createInterface } from "readline"
import { readdir, readFile, writeFile, stat, mkdir } from "fs/promises"
import { join, resolve } from "path"
import { existsSync } from "fs"

import type {
  SDKMessage,
  SDKResultMessage,
  SDKSessionInfo,
  SDKUserMessage,
} from "./sdk/coreTypes.js"

import type {
  AnyZodRawShape,
  ForkSessionOptions,
  ForkSessionResult,
  GetSessionInfoOptions,
  GetSessionMessagesOptions,
  InferShape,
  InternalOptions,
  InternalQuery,
  ListSessionsOptions,
  McpSdkServerConfigWithInstance,
  Options,
  Query,
  SDKSession,
  SDKSessionOptions,
  SdkMcpToolDefinition,
  SessionMessage,
  SessionMutationOptions,
} from "./sdk/runtimeTypes.js"

import type {
  SDKControlRequest,
  SDKControlResponse,
  SDKControlInitializeResponse,
} from "./sdk/controlTypes.js"

import type { CallToolResult, ToolAnnotations } from "@modelcontextprotocol/sdk/types.js"

// ============================================================================
// Helpers
// ============================================================================

function ndjsonParse(line: string): unknown {
  if (!line.trim()) return undefined
  try { return JSON.parse(line) } catch { return undefined }
}

function ndjsonStringify(msg: unknown): string {
  return JSON.stringify(msg) + "\n"
}

/** Resolve the CLI command to spawn. Returns [cmd, ...args]. */
function resolveCliCommand(): string[] {
  // If CCLOCAL_PATH is set, use it directly
  const envPath = process.env.CCLOCAL_PATH
  if (envPath) {
    // .js files must be run through bun
    if (envPath.endsWith(".js") || envPath.endsWith(".ts") || envPath.endsWith(".tsx")) {
      return [process.execPath || "bun", envPath]
    }
    return [envPath]
  }

  // Try the globally installed cclocal
  try {
    const which = Bun.which("cclocal")
    if (which) return [which]
  } catch {}

  // Fall back to the local dist build (run via bun)
  const local = resolve(import.meta.dir, "../../../dist/cli.js")
  if (existsSync(local)) return [process.execPath || "bun", local]

  throw new Error(
    "Cannot find cclocal CLI. Set CCLOCAL_PATH or ensure cclocal is on PATH."
  )
}

// ============================================================================
// SubprocessSession — manages one CLI subprocess
// ============================================================================

class SubprocessSession {
  private proc: Subprocess | null = null
  private requestId = 0
  private pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
  private messageQueue: SDKMessage[] = []
  private resolvers: ((msg: SDKMessage | undefined) => void)[] = []
  private ended = false
  private rl: ReturnType<typeof createInterface> | null = null

  constructor(
    private cliCmd: string[],
    private args: string[],
    private options: Options & { _internal?: InternalOptions } = {},
  ) {}

  async start(): Promise<void> {
    const fullCmd = [...this.cliCmd, ...this.args]

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      ...this.options._internal?.environmentVariables,
    }

    this.proc = spawn({
      cmd: fullCmd,
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      env,
      cwd: this.options.cwd || process.cwd(),
    })

    // Pipe stderr for debugging
    if (this.proc.stderr) {
      const reader = this.proc.stderr.getReader()
      ;(async () => {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            // Swallow stderr in SDK mode — consumer can opt into debug
          }
        } catch {}
      })()
    }

    // Read stdout line-by-line (NDJSON) using Bun's ReadableStream
    if (this.proc.stdout) {
      const reader = this.proc.stdout.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      ;(async () => {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n")
            buffer = lines.pop() || ""  // keep incomplete line in buffer
            for (const line of lines) {
              const msg = ndjsonParse(line)
              if (!msg || typeof msg !== "object") continue
              this.handleMessage(msg as Record<string, unknown>)
            }
          }
          // Process any remaining buffer
          if (buffer.trim()) {
            const msg = ndjsonParse(buffer)
            if (msg && typeof msg === "object") {
              this.handleMessage(msg as Record<string, unknown>)
            }
          }
        } catch {} finally {
          this.ended = true
          // Flush remaining resolvers with undefined
          for (const r of this.resolvers) r(undefined)
          this.resolvers = []
          // Reject all pending control requests
          for (const [, p] of this.pending) p.reject(new Error("CLI process exited"))
          this.pending.clear()
        }
      })()
    }

    // Wait for system/init message
    const initMsg = await this.readOne()
    if (!initMsg || (initMsg as any).type !== "system" || (initMsg as any).subtype !== "init") {
      throw new Error("CLI did not send system/init message")
    }

    // Send initialize control_request
    const initOpts: Record<string, unknown> = {}
    if (this.options.systemPrompt) initOpts.systemPrompt = this.options.systemPrompt
    if (this.options.appendSystemPrompt) initOpts.appendSystemPrompt = this.options.appendSystemPrompt
    if (this.options.permissionMode) initOpts.permissionMode = this.options.permissionMode
    if (this.options.allowedTools) initOpts.allowedTools = this.options.allowedTools
    if (this.options.disallowedTools) initOpts.disallowedTools = this.options.disallowedTools
    if (this.options._internal?.hooks) initOpts.hooks = this.options._internal.hooks
    if (this.options._internal?.sdkMcpServers) initOpts.sdkMcpServers = this.options._internal.sdkMcpServers
    if (this.options._internal?.agents) initOpts.agents = this.options._internal.agents
    if (this.options._internal?.jsonSchema) initOpts.jsonSchema = this.options._internal.jsonSchema

    const initResp = await this.sendRequest({ subtype: "initialize", ...initOpts })
    if (!(initResp as any)?.success) {
      throw new Error("CLI initialization failed: " + JSON.stringify(initResp))
    }
  }

  private handleMessage(msg: Record<string, unknown>) {
    // Control response — resolve pending request
    if (msg.type === "control_response") {
      const requestId = msg.request_id as string | undefined
      if (requestId && this.pending.has(requestId)) {
        this.pending.get(requestId)!.resolve(msg.response)
        this.pending.delete(requestId)
      }
      return
    }

    // Control request from CLI (e.g. can_use_tool permission prompt)
    if (msg.type === "control_request") {
      this.handleControlRequest(msg as any)
      return
    }

    // SDK message — deliver to consumer
    if (this.resolvers.length > 0) {
      this.resolvers.shift()!(msg as SDKMessage)
    } else {
      this.messageQueue.push(msg as SDKMessage)
    }
  }

  private async handleControlRequest(req: SDKControlRequest & { request_id?: string }) {
    const reqId = req.request_id
    const inner = req.request as Record<string, unknown>

    if (inner?.subtype === "can_use_tool") {
      // Permission callback
      const handler = this.options.permissionCallback || this.options._internal?.permissionCallback
      if (handler) {
        try {
          const result = await (handler as any)({
            tool_name: inner.tool_name as string,
            tool_input: inner.tool_input as Record<string, unknown>,
          })
          this.sendControlResponse(reqId!, result)
        } catch (e: any) {
          this.sendControlResponse(reqId!, {
            behavior: "deny",
            message: e.message || "Permission denied",
            toolUseID: inner.tool_use_id,
            decisionClassification: "manual",
          })
        }
      } else {
        // Default: deny with message
        this.sendControlResponse(reqId!, {
          behavior: "deny",
          message: "No permission handler configured. Set permissionCallback in options.",
          toolUseID: inner.tool_use_id,
          decisionClassification: "manual",
        })
      }
    } else if (inner?.subtype === "mcp_message") {
      // MCP message bridge — forward to in-process MCP server
      const serverName = inner.server_name as string
      const mcpMsg = inner.message
      const server = this.options._internal?.mcpServerInstances?.[serverName]
      if (server) {
        try {
          const result = await server.handleMessage(mcpMsg)
          this.sendControlResponse(reqId!, result)
        } catch (e: any) {
          this.sendControlResponse(reqId!, { error: e.message })
        }
      } else {
        this.sendControlResponse(reqId!, { error: `Unknown MCP server: ${serverName}` })
      }
    } else {
      // Unknown control request — send generic response
      this.sendControlResponse(reqId!, { acknowledged: true })
    }
  }

  /** Read one SDK message from the stream */
  readOne(): Promise<SDKMessage | undefined> {
    if (this.messageQueue.length > 0) {
      return Promise.resolve(this.messageQueue.shift()!)
    }
    if (this.ended) return Promise.resolve(undefined)
    return new Promise<SDKMessage | undefined>((resolve) => {
      this.resolvers.push(resolve)
    })
  }

  /** Async iterable of SDK messages until the process ends */
  async *messages(): AsyncGenerator<SDKMessage, void, void> {
    while (true) {
      const msg = await this.readOne()
      if (msg === undefined) break
      yield msg
      if ((msg as any).type === "result") break
    }
  }

  /** Send a user message to the CLI */
  sendMessage(content: string | unknown[]): void {
    const msg: SDKUserMessage = {
      type: "human",
      role: "user",
      content,
    } as SDKUserMessage
    this.write(msg)
  }

  /** Send a control request and wait for response */
  sendRequest(request: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const requestId = String(++this.requestId)
      const msg: SDKControlRequest = {
        type: "control_request",
        request_id: requestId,
        request,
      }
      this.pending.set(requestId, { resolve, reject })
      this.write(msg)

      // Timeout after 120s
      setTimeout(() => {
        if (this.pending.has(requestId)) {
          this.pending.delete(requestId)
          reject(new Error("Control request timed out: " + JSON.stringify(request)))
        }
      }, 120_000)
    })
  }

  /** Send a control response */
  sendControlResponse(requestId: string, response: unknown): void {
    const msg: SDKControlResponse = {
      type: "control_response",
      request_id: requestId,
      response: response as Record<string, unknown>,
    }
    this.write(msg)
  }

  /** Send interrupt */
  async interrupt(): Promise<void> {
    await this.sendRequest({ subtype: "interrupt" })
  }

  /** End session */
  async endSession(reason?: string): Promise<void> {
    try {
      await this.sendRequest({ subtype: "end_session", reason })
    } catch {}
    this.kill()
  }

  /** Kill the subprocess */
  kill(): void {
    if (this.proc) {
      this.proc.kill()
      this.proc = null
    }
    this.ended = true
    for (const r of this.resolvers) r(undefined)
    this.resolvers = []
    for (const [, p] of this.pending) p.reject(new Error("Session killed"))
    this.pending.clear()
  }

  /** Write a message to stdin */
  private write(msg: unknown): void {
    if (!this.proc?.stdin) throw new Error("CLI process not started or stdin closed")
    this.proc.stdin.write(ndjsonStringify(msg))
  }
}

// ============================================================================
// Public API — tool()
// ============================================================================

export function tool<Schema extends AnyZodRawShape>(
  name: string,
  description: string,
  inputSchema: Schema,
  handler: (args: InferShape<Schema>, extra: unknown) => Promise<CallToolResult>,
  extras?: {
    annotations?: ToolAnnotations
    searchHint?: string
    alwaysLoad?: boolean
  },
): SdkMcpToolDefinition<Schema> {
  return {
    name,
    description,
    inputSchema,
    handler,
    annotations: extras?.annotations,
    searchHint: extras?.searchHint,
    alwaysLoad: extras?.alwaysLoad,
  } as SdkMcpToolDefinition<Schema>
}

// ============================================================================
// Public API — createSdkMcpServer()
// ============================================================================

type CreateSdkMcpServerOptions = {
  name: string
  version?: string
  tools?: Array<SdkMcpToolDefinition<any>>
}

/** Minimal in-process MCP server that can handle tool calls via the control bridge. */
class InProcessMcpServer {
  name: string
  version: string
  private tools: Map<string, SdkMcpToolDefinition<any>> = new Map()

  constructor(opts: CreateSdkMcpServerOptions) {
    this.name = opts.name
    this.version = opts.version || "1.0.0"
    if (opts.tools) {
      for (const t of opts.tools) {
        this.tools.set(t.name as string, t)
      }
    }
  }

  addTool(t: SdkMcpToolDefinition<any>) {
    this.tools.set(t.name as string, t)
  }

  async handleMessage(msg: unknown): Promise<unknown> {
    if (!msg || typeof msg !== "object") return { error: "Invalid message" }
    const m = msg as Record<string, unknown>
    if (m.method === "tools/list") {
      return {
        tools: [...this.tools.values()].map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      }
    }
    if (m.method === "tools/call") {
      const toolName = m.params?.name as string
      const args = (m.params?.arguments ?? {}) as Record<string, unknown>
      const t = this.tools.get(toolName)
      if (!t) return { error: { code: -32601, message: `Unknown tool: ${toolName}` } }
      try {
        const result = await t.handler(args, {})
        return result
      } catch (e: any) {
        return {
          content: [{ type: "text", text: e.message || "Tool execution failed" }],
          isError: true,
        }
      }
    }
    if (m.method === "initialize") {
      return {
        protocolVersion: "2025-03-26",
        capabilities: { tools: {} },
        serverInfo: { name: this.name, version: this.version },
      }
    }
    return { error: { code: -32601, message: `Unknown method: ${m.method}` } }
  }
}

export function createSdkMcpServer(
  options: CreateSdkMcpServerOptions,
): McpSdkServerConfigWithInstance {
  const server = new InProcessMcpServer(options)
  return {
    name: options.name,
    config: {
      command: "cclocal-sdk-mcp-bridge",
      args: [],
    },
    instance: server,
  } as McpSdkServerConfigWithInstance
}

// ============================================================================
// Public API — AbortError
// ============================================================================

export class AbortError extends Error {
  constructor(message?: string) {
    super(message || "Aborted")
    this.name = "AbortError"
  }
}

// ============================================================================
// Public API — query()
// ============================================================================

export function query(params: {
  prompt: string | AsyncIterable<SDKUserMessage>
  options?: InternalOptions
}): InternalQuery
export function query(params: {
  prompt: string | AsyncIterable<SDKUserMessage>
  options?: Options
}): Query
export function query(params: {
  prompt: string | AsyncIterable<SDKUserMessage>
  options?: Options | InternalOptions
}): Query | InternalQuery {
  const cliCmd = resolveCliCommand()
  const opts = (params.options || {}) as Options & { _internal?: InternalOptions }

  const args = [
    "-p",
    "--output-format", "stream-json",
    "--verbose",
    "--input-format", "stream-json",
  ]

  // Forward common options
  if (opts.model) args.push("--model", opts.model)
  if (opts.effort) args.push("--effort", opts.effort)
  if (opts.cwd) args.push("--cwd", opts.cwd)
  if (opts.maxTurns) args.push("--max-turns", String(opts.maxTurns))
  if (opts.maxBudgetUSD) args.push("--max-budget-usd", String(opts.maxBudgetUSD))
  if (opts.systemPrompt) args.push("--system-prompt", opts.systemPrompt as string)
  if (opts.appendSystemPrompt) args.push("--append-system-prompt", opts.appendSystemPrompt as string)
  if (opts.permissionMode) args.push("--permission-mode", opts.permissionMode as string)
  if (opts.allowedTools) args.push("--allowed-tools", ...(opts.allowedTools as string[]))
  if (opts.disallowedTools) args.push("--disallowed-tools", ...(opts.disallowedTools as string[]))
  if (opts.mcpConfig) {
    const configs = Array.isArray(opts.mcpConfig) ? opts.mcpConfig : [opts.mcpConfig]
    for (const c of configs) args.push("--mcp-config", c as string)
  }
  if (opts.betas) args.push("--betas", ...(opts.betas as string[]))
  if (opts.sessionId) args.push("--session-id", opts.sessionId as string)
  if (opts.continue) args.push("--continue")
  if (opts.resume) args.push("--resume", opts.resume as string)

  const session = new SubprocessSession(cliCmd, args, opts)

  const queryResult: Query = {
    async *[Symbol.asyncIterator]() {
      await session.start()
      if (typeof params.prompt === "string") {
        session.sendMessage(params.prompt)
      } else {
        // Stream user messages
        for await (const msg of params.prompt) {
          session.write(msg)
        }
      }
      yield* session.messages()
      session.kill()
    },
  }

  return queryResult
}

// ============================================================================
// V2 Session API
// ============================================================================

class V2Session implements SDKSession {
  id: string
  private session: SubprocessSession
  private started = false

  constructor(id: string, session: SubprocessSession) {
    this.id = id
    this.session = session
  }

  async start(): Promise<void> {
    if (this.started) return
    await this.session.start()
    this.started = true
  }

  async *prompt(message: string | SDKUserMessage): AsyncGenerator<SDKMessage, void, void> {
    if (!this.started) await this.start()
    if (typeof message === "string") {
      this.session.sendMessage(message)
    } else {
      this.session.write(message)
    }
    yield* this.session.messages()
  }

  async interrupt(): Promise<void> {
    await this.session.interrupt()
  }

  async end(reason?: string): Promise<void> {
    await this.session.endSession(reason)
    this.started = false
  }
}

export function unstable_v2_createSession(
  options: SDKSessionOptions,
): SDKSession {
  const cliCmd = resolveCliCommand()
  const args = [
    "-p", "--output-format", "stream-json", "--verbose", "--input-format", "stream-json",
  ]
  if ((options as any).model) args.push("--model", (options as any).model as string)
  if ((options as any).sessionId) args.push("--session-id", (options as any).sessionId as string)

  const session = new SubprocessSession(cliCmd, args, options as any)
  const sessionId = (options as any).sessionId || randomUUID()
  return new V2Session(sessionId, session)
}

export function unstable_v2_resumeSession(
  sessionId: string,
  options: SDKSessionOptions,
): SDKSession {
  const opts = { ...options, sessionId, resume: sessionId } as any
  return unstable_v2_createSession(opts)
}

export async function unstable_v2_prompt(
  message: string,
  options: SDKSessionOptions,
): Promise<SDKResultMessage> {
  const session = unstable_v2_createSession(options)
  let result: SDKResultMessage | undefined
  for await (const msg of (session as any).prompt(message)) {
    if ((msg as any).type === "result") {
      result = msg as SDKResultMessage
    }
  }
  if (!result) throw new Error("No result message received")
  return result
}

// ============================================================================
// Session Management Functions
// ============================================================================

function getClaudeDir(): string {
  return process.env.CLAUDE_CONFIG_DIR || join(process.env.HOME || process.env.USERPROFILE || "~", ".claude")
}

function getSessionsDir(dir?: string): string {
  const projectDir = dir || process.cwd()
  // Hash the project path to create a unique directory name
  const hash = createHash("sha256").update(resolve(projectDir)).digest("hex").slice(0, 16)
  return join(getClaudeDir(), "projects", hash)
}

import { createHash } from "crypto"

export async function listSessions(
  options?: ListSessionsOptions,
): Promise<SDKSessionInfo[]> {
  const sessions: SDKSessionInfo[] = []
  const claudeDir = getClaudeDir()
  const projectsDir = join(claudeDir, "projects")

  if (!existsSync(projectsDir)) return sessions

  // If dir is specified, only scan that project's sessions
  const dirsToScan: string[] = []
  if ((options as any)?.dir) {
    dirsToScan.push(getSessionsDir((options as any).dir))
  } else {
    try {
      const entries = await readdir(projectsDir)
      for (const entry of entries) {
        dirsToScan.push(join(projectsDir, entry))
      }
    } catch { return sessions }
  }

  const limit = (options as any)?.limit ?? 100
  const offset = (options as any)?.offset ?? 0
  let count = 0

  for (const dir of dirsToScan) {
    if (!existsSync(dir)) continue
    try {
      const files = await readdir(dir)
      for (const file of files) {
        if (!file.endsWith(".jsonl")) continue
        if (count < offset) { count++; continue }
        if (sessions.length >= limit) return sessions
        count++
        try {
          const info = await extractSessionInfo(join(dir, file))
          if (info) sessions.push(info)
        } catch {}
      }
    } catch {}
  }

  // Sort by most recent
  sessions.sort((a, b) => ((b as any).lastModified || 0) - ((a as any).lastModified || 0))
  return sessions
}

async function extractSessionInfo(filePath: string): Promise<SDKSessionInfo | undefined> {
  try {
    const content = await readFile(filePath, "utf-8")
    const lines = content.trim().split("\n").filter(Boolean)
    let sessionId = ""
    let title = ""
    let lastModified = 0

    for (const line of lines) {
      try {
        const entry = JSON.parse(line)
        if (entry.sessionId) sessionId = entry.sessionId
        if (entry.type === "summary") title = (entry.summary || entry.message || "") as string
        if (entry.type === "custom_title") title = entry.title as string
        if (entry.timestamp) {
          const ts = new Date(entry.timestamp as string).getTime()
          if (ts > lastModified) lastModified = ts
        }
      } catch {}
    }

    if (!sessionId) {
      sessionId = filePath.split("/").pop()?.replace(".jsonl", "") || ""
    }

    // Get file modification time as fallback
    if (lastModified === 0) {
      const s = await stat(filePath)
      lastModified = s.mtimeMs
    }

    return {
      sessionId,
      title: title || undefined,
      lastModified,
      path: filePath,
    } as unknown as SDKSessionInfo
  } catch {
    return undefined
  }
}

export async function getSessionMessages(
  sessionId: string,
  options?: GetSessionMessagesOptions,
): Promise<SessionMessage[]> {
  const filePath = await findSessionFile(sessionId, (options as any)?.dir)
  if (!filePath) return []

  const content = await readFile(filePath, "utf-8")
  const entries = content.trim().split("\n").filter(Boolean).map((line) => {
    try { return JSON.parse(line) } catch { return null }
  }).filter(Boolean)

  // Build parent chain
  const byUuid = new Map<string, any>()
  const roots: any[] = []
  for (const entry of entries) {
    if (entry.uuid) byUuid.set(entry.uuid, entry)
  }
  for (const entry of entries) {
    if (!entry.parentUuid || !byUuid.has(entry.parentUuid)) {
      roots.push(entry)
    }
  }

  // Walk the chain
  const chain: any[] = []
  let current = roots[0]
  while (current) {
    chain.push(current)
    const children = entries.filter((e: any) => e.parentUuid === current.uuid)
    current = children[0]
  }

  const limit = (options as any)?.limit ?? chain.length
  const offset = (options as any)?.offset ?? 0
  const includeSystem = (options as any)?.includeSystemMessages ?? false
  const sliced = chain.slice(offset, offset + limit)

  const messages: SessionMessage[] = []
  for (const entry of sliced) {
    const type = entry.type as string
    if (type === "human" || type === "user") {
      messages.push({ role: "user", content: entry.message || entry.content, uuid: entry.uuid, timestamp: entry.timestamp } as SessionMessage)
    } else if (type === "assistant") {
      messages.push({ role: "assistant", content: entry.message || entry.content, uuid: entry.uuid, timestamp: entry.timestamp } as SessionMessage)
    } else if (includeSystem && (type === "system" || type === "summary")) {
      messages.push({ role: "system", content: entry.message || entry.content, uuid: entry.uuid, timestamp: entry.timestamp } as SessionMessage)
    }
  }

  return messages
}

export async function getSessionInfo(
  sessionId: string,
  options?: GetSessionInfoOptions,
): Promise<SDKSessionInfo | undefined> {
  const filePath = await findSessionFile(sessionId, (options as any)?.dir)
  if (!filePath) return undefined
  return extractSessionInfo(filePath)
}

export async function renameSession(
  sessionId: string,
  title: string,
  options?: SessionMutationOptions,
): Promise<void> {
  const filePath = await findSessionFile(sessionId, (options as any)?.dir)
  if (!filePath) throw new Error(`Session not found: ${sessionId}`)

  const entry = { type: "custom_title", title, timestamp: new Date().toISOString(), uuid: randomUUID() }
  await writeFile(filePath, JSON.stringify(entry) + "\n", { flag: "a" })
}

export async function tagSession(
  sessionId: string,
  tag: string | null,
  options?: SessionMutationOptions,
): Promise<void> {
  const filePath = await findSessionFile(sessionId, (options as any)?.dir)
  if (!filePath) throw new Error(`Session not found: ${sessionId}`)

  const entry = { type: "tag", tag, timestamp: new Date().toISOString(), uuid: randomUUID() }
  await writeFile(filePath, JSON.stringify(entry) + "\n", { flag: "a" })
}

export async function forkSession(
  sessionId: string,
  options?: ForkSessionOptions,
): Promise<ForkSessionResult> {
  const filePath = await findSessionFile(sessionId, (options as any)?.dir)
  if (!filePath) throw new Error(`Session not found: ${sessionId}`)

  const content = await readFile(filePath, "utf-8")
  const entries = content.trim().split("\n").filter(Boolean).map((line) => {
    try { return JSON.parse(line) } catch { return null }
  }).filter(Boolean)

  // Optionally truncate at upToMessageId
  let sourceEntries = entries
  if ((options as any)?.upToMessageId) {
    const idx = entries.findIndex((e: any) => e.uuid === (options as any).upToMessageId)
    if (idx >= 0) sourceEntries = entries.slice(0, idx + 1)
  }

  // Remap all UUIDs
  const uuidMap = new Map<string, string>()
  for (const entry of sourceEntries) {
    if (entry.uuid) {
      const newUuid = randomUUID()
      uuidMap.set(entry.uuid, newUuid)
      entry.uuid = newUuid
    }
    if (entry.parentUuid && uuidMap.has(entry.parentUuid)) {
      entry.parentUuid = uuidMap.get(entry.parentUuid)
    }
  }

  // Write to new session file
  const newSessionId = randomUUID()
  const dir = filePath.substring(0, filePath.lastIndexOf("/"))
  const newPath = join(dir, newSessionId + ".jsonl")

  const newContent = sourceEntries.map((e) => JSON.stringify(e)).join("\n") + "\n"
  await writeFile(newPath, newContent)

  // Set title if provided
  if ((options as any)?.title) {
    await renameSession(newSessionId, (options as any).title, options as SessionMutationOptions)
  }

  return { sessionId: newSessionId } as ForkSessionResult
}

/** Find a session JSONL file by its session ID, searching across all projects or a specific dir */
async function findSessionFile(sessionId: string, dir?: string): Promise<string | undefined> {
  const claudeDir = getClaudeDir()

  const dirsToSearch: string[] = []
  if (dir) {
    dirsToSearch.push(getSessionsDir(dir))
  } else {
    const projectsDir = join(claudeDir, "projects")
    if (existsSync(projectsDir)) {
      try {
        const entries = await readdir(projectsDir)
        for (const entry of entries) {
          dirsToSearch.push(join(projectsDir, entry))
        }
      } catch {}
    }
  }

  for (const searchDir of dirsToSearch) {
    if (!existsSync(searchDir)) continue
    try {
      const files = await readdir(searchDir)
      // Try exact filename match first
      const exactMatch = files.find((f) => f === sessionId + ".jsonl")
      if (exactMatch) return join(searchDir, exactMatch)
      // Then search by session ID in the file content
      for (const file of files) {
        if (!file.endsWith(".jsonl")) continue
        const path = join(searchDir, file)
        try {
          const content = await readFile(path, "utf-8")
          if (content.includes(`"sessionId":"${sessionId}"`) || content.includes(`"sessionId": "${sessionId}"`)) {
            return path
          }
        } catch {}
      }
    } catch {}
  }

  return undefined
}

// ============================================================================
// Internal daemon primitives — stubs (not for public use)
// ============================================================================

export function watchScheduledTasks(_opts: {
  dir: string
  signal: AbortSignal
  getJitterConfig?: () => any
}): any {
  throw new Error("not implemented")
}

export function buildMissedTaskNotification(_missed: any[]): string {
  throw new Error("not implemented")
}

export async function connectRemoteControl(_opts: any): Promise<any> {
  throw new Error("not implemented")
}
