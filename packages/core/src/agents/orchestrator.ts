/**
 * Multi-Agent Orchestration Engine
 *
 * Provides capabilities beyond the official Claude Code's single-agent + worktree model:
 * - Agent Teams: Groups of specialized agents that collaborate on complex tasks
 * - Task Decomposition: Break large tasks into sub-tasks assigned to appropriate agents
 * - Shared Context Bus: Real-time shared state between agents
 * - Coordinator Pattern: A lead agent that orchestrates sub-agents
 * - Agent Lifecycle: Spawn, monitor, stop agents with full control
 *
 * Architecture:
 * ```
 * AgentOrchestrator
 *   ├── AgentTeam "backend-team"
 *   │     ├── Agent "code-writer" (role: writer)
 *   │     └── Agent "code-reviewer" (role: reviewer)
 *   ├── AgentTeam "frontend-team"
 *   │     └── Agent "ui-builder" (role: writer)
 *   └── SharedContextBus ← agents read/write shared state
 * ```
 */

import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import { QueryEngine, type QueryEngineOptions } from '../engine/queryEngine.js'
import { toolRegistry } from '../tools/registry.js'

// ---- Types ----

export type AgentRole = 'coordinator' | 'writer' | 'reviewer' | 'researcher' | 'tester' | 'custom'
export type AgentStatus = 'idle' | 'running' | 'waiting' | 'completed' | 'failed' | 'stopped'

export interface AgentConfig {
  name: string
  role: AgentRole
  model?: string
  systemPrompt?: string
  /** Custom role description (when role is 'custom') */
  roleDescription?: string
  /** Tools this agent is allowed to use (subset of all tools) */
  allowedTools?: string[]
  /** Max turns before auto-stop */
  maxTurns?: number
  /** Priority for task assignment (higher = assigned first) */
  priority?: number
}

export interface AgentState {
  id: string
  config: AgentConfig
  status: AgentStatus
  currentTask?: string
  result?: string
  error?: string
  startedAt?: number
  completedAt?: number
  turnCount: number
}

export interface TaskDefinition {
  id: string
  description: string
  assignedTo?: string // agent name
  parentTaskId?: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  result?: string
  priority: number
  createdAt: number
}

export interface TeamConfig {
  name: string
  description?: string
  agents: AgentConfig[]
  /** How tasks are distributed: round-robin, least-busy, priority-match */
  schedulingStrategy?: 'round_robin' | 'least_busy' | 'priority_match'
  /** Whether agents can message each other */
  enableInterAgentMessaging?: boolean
}

export interface SharedStateEntry {
  key: string
  value: unknown
  updatedAt: number
  updatedBy: string // agent name
}

// ---- Events ----

export type OrchestratorEvent =
  | { type: 'agent_spawned'; agentId: string; agentName: string }
  | { type: 'agent_status_changed'; agentId: string; from: AgentStatus; to: AgentStatus }
  | { type: 'task_assigned'; taskId: string; agentName: string }
  | { type: 'task_completed'; taskId: string; result: string }
  | { type: 'task_failed'; taskId: string; error: string }
  | { type: 'shared_state_updated'; key: string; updatedBy: string }
  | { type: 'agent_message'; from: string; to: string; content: string }
  | { type: 'team_completed'; teamName: string }

// ---- Shared Context Bus ----

export class SharedContextBus {
  private state = new Map<string, SharedStateEntry>()
  private emitter = new EventEmitter()

  set(key: string, value: unknown, agentName: string): void {
    this.state.set(key, {
      key,
      value,
      updatedAt: Date.now(),
      updatedBy: agentName,
    })
    this.emitter.emit('update', { key, updatedBy: agentName })
  }

  get(key: string): SharedStateEntry | undefined {
    return this.state.get(key)
  }

  has(key: string): boolean {
    return this.state.has(key)
  }

  getAll(): SharedStateEntry[] {
    return Array.from(this.state.values())
  }

  delete(key: string): boolean {
    return this.state.delete(key)
  }

  /** Subscribe to state changes */
  onUpdate(callback: (key: string, updatedBy: string) => void): () => void {
    const handler = (data: { key: string; updatedBy: string }) => {
      callback(data.key, data.updatedBy)
    }
    this.emitter.on('update', handler)
    return () => this.emitter.off('update', handler)
  }

  clear(): void {
    this.state.clear()
  }
}

// ---- Agent Instance ----

export class Agent {
  readonly id: string
  readonly config: AgentConfig
  private _status: AgentStatus = 'idle'
  private _currentTask?: string
  private _result?: string
  private _error?: string
  private _startedAt?: number
  private _completedAt?: number
  private _turnCount = 0

  constructor(config: AgentConfig) {
    this.id = `agent-${randomUUID().slice(0, 8)}`
    this.config = config
  }

  get status(): AgentStatus { return this._status }
  get currentTask(): string | undefined { return this._currentTask }
  get result(): string | undefined { return this._result }
  get error(): string | undefined { return this._error }
  get startedAt(): number | undefined { return this._startedAt }
  get completedAt(): number | undefined { return this._completedAt }
  get turnCount(): number { return this._turnCount }

  /** Build the system prompt for this agent based on its role */
  buildSystemPrompt(teamContext?: string): string {
    const roleDescriptions: Record<AgentRole, string> = {
      coordinator: 'You are a coordinator agent. Your job is to decompose tasks, assign them to appropriate agents, and synthesize their results. You do NOT write code directly.',
      writer: 'You are a code writer agent. Your job is to write and modify code files. Focus on implementation.',
      reviewer: 'You are a code reviewer agent. Your job is to review code changes for quality, bugs, and best practices. You do NOT write code — only review and provide feedback.',
      researcher: 'You are a research agent. Your job is to search the codebase, read files, and gather information. You do NOT modify files.',
      tester: 'You are a testing agent. Your job is to write and run tests. Focus on test coverage and correctness.',
      custom: this.config.roleDescription ?? 'You are a specialized agent.',
    }

    const parts = [
      roleDescriptions[this.config.role],
      teamContext ? `\n\nTeam context: ${teamContext}` : '',
      this.config.systemPrompt ? `\n\nAdditional instructions: ${this.config.systemPrompt}` : '',
    ]

    return parts.filter(Boolean).join('')
  }

  /** Get tool list filtered by agent's allowedTools */
  getTools(): import('@cclocal/shared').Tool[] {
    const allTools = toolRegistry.getLoadedTools()
    if (!this.config.allowedTools?.length) return allTools
    return allTools.filter((t) => this.config.allowedTools!.includes(t.name))
  }

  setStatus(status: AgentStatus): void {
    this._status = status
    if (status === 'running') this._startedAt = Date.now()
    if (status === 'completed' || status === 'failed') this._completedAt = Date.now()
  }

  assignTask(taskId: string): void {
    this._currentTask = taskId
    this.setStatus('running')
  }

  complete(result: string): void {
    this._result = result
    this.setStatus('completed')
  }

  fail(error: string): void {
    this._error = error
    this.setStatus('failed')
  }

  stop(): void {
    this.setStatus('stopped')
  }

  incrementTurn(): void {
    this._turnCount++
  }

  getState(): AgentState {
    return {
      id: this.id,
      config: this.config,
      status: this._status,
      currentTask: this._currentTask,
      result: this._result,
      error: this._error,
      startedAt: this._startedAt,
      completedAt: this._completedAt,
      turnCount: this._turnCount,
    }
  }
}

// ---- Agent Team ----

export class AgentTeam {
  readonly name: string
  readonly description: string
  readonly agents: Map<string, Agent> = new Map()
  readonly schedulingStrategy: 'round_robin' | 'least_busy' | 'priority_match'
  readonly enableInterAgentMessaging: boolean
  private contextBus: SharedContextBus
  private roundRobinIndex = 0

  constructor(config: TeamConfig, contextBus: SharedContextBus) {
    this.name = config.name
    this.description = config.description ?? ''
    this.schedulingStrategy = config.schedulingStrategy ?? 'least_busy'
    this.enableInterAgentMessaging = config.enableInterAgentMessaging ?? true
    this.contextBus = contextBus

    for (const agentConfig of config.agents) {
      const agent = new Agent(agentConfig)
      this.agents.set(agentConfig.name, agent)
    }
  }

  /** Get an agent by name */
  getAgent(name: string): Agent | undefined {
    return this.agents.get(name)
  }

  /** Select the next agent based on scheduling strategy */
  selectAgentForTask(task: TaskDefinition): Agent | undefined {
    const candidates = Array.from(this.agents.values()).filter(
      (a) => a.status === 'idle' || a.status === 'waiting',
    )

    if (candidates.length === 0) return undefined

    switch (this.schedulingStrategy) {
      case 'round_robin': {
        const agent = candidates[this.roundRobinIndex % candidates.length]
        this.roundRobinIndex++
        return agent
      }
      case 'least_busy': {
        return candidates.sort((a, b) => a.turnCount - b.turnCount)[0]
      }
      case 'priority_match': {
        // Match task priority to agent priority, fall back to highest priority
        const sorted = candidates.sort((a, b) => (b.config.priority ?? 0) - (a.config.priority ?? 0))
        return sorted[0]
      }
      default:
        return candidates[0]
    }
  }

  /** Send a message from one agent to another within the team */
  sendMessage(fromAgent: string, toAgent: string, content: string): void {
    if (!this.enableInterAgentMessaging) return
    this.contextBus.set(`msg:${fromAgent}:${toAgent}:${Date.now()}`, content, fromAgent)
  }

  /** Get all pending messages for an agent */
  getMessagesForAgent(agentName: string): SharedStateEntry[] {
    return this.contextBus.getAll().filter(
      (e) => e.key.startsWith('msg:') && e.key.includes(`:${agentName}:`),
    )
  }

  /** Check if all agents have completed */
  isComplete(): boolean {
    return Array.from(this.agents.values()).every(
      (a) => a.status === 'completed' || a.status === 'failed' || a.status === 'stopped',
    )
  }

  /** Get team summary */
  getSummary(): {
    name: string
    totalAgents: number
    completedAgents: number
    failedAgents: number
    runningAgents: number
  } {
    const states = Array.from(this.agents.values()).map((a) => a.status)
    return {
      name: this.name,
      totalAgents: states.length,
      completedAgents: states.filter((s) => s === 'completed').length,
      failedAgents: states.filter((s) => s === 'failed').length,
      runningAgents: states.filter((s) => s === 'running' || s === 'waiting').length,
    }
  }
}

// ---- Orchestrator ----

export class AgentOrchestrator extends EventEmitter {
  private teams = new Map<string, AgentTeam>()
  private tasks = new Map<string, TaskDefinition>()
  private contextBus = new SharedContextBus()
  private engines = new Map<string, QueryEngine>() // agentId → engine

  constructor() {
    super()
  }

  /** Create a new agent team */
  createTeam(config: TeamConfig): AgentTeam {
    const team = new AgentTeam(config, this.contextBus)
    this.teams.set(config.name, team)
    this.emit('team_created', config.name)
    return team
  }

  /** Get a team by name */
  getTeam(name: string): AgentTeam | undefined {
    return this.teams.get(name)
  }

  /** List all teams */
  listTeams(): string[] {
    return Array.from(this.teams.keys())
  }

  /** Create a task in the orchestrator */
  createTask(description: string, priority = 0, parentTaskId?: string): TaskDefinition {
    const task: TaskDefinition = {
      id: `task-${randomUUID().slice(0, 8)}`,
      description,
      priority,
      status: 'pending',
      parentTaskId,
      createdAt: Date.now(),
    }
    this.tasks.set(task.id, task)
    return task
  }

  /** Assign a task to a team (auto-selects agent) */
  assignTask(taskId: string, teamName: string): Agent | undefined {
    const task = this.tasks.get(taskId)
    const team = this.teams.get(teamName)
    if (!task || !team) return undefined

    const agent = team.selectAgentForTask(task)
    if (!agent) return undefined

    task.assignedTo = agent.config.name
    task.status = 'in_progress'
    agent.assignTask(taskId)

    this.emitEvent({ type: 'task_assigned', taskId, agentName: agent.config.name })
    return agent
  }

  /** Run a task on a specific agent using a QueryEngine */
  async runTask(
    taskId: string,
    teamName: string,
    agentName: string,
    queryOptions: Omit<QueryEngineOptions, 'model' | 'tools'> & { model?: string },
  ): Promise<string> {
    const task = this.tasks.get(taskId)
    const team = this.teams.get(teamName)
    if (!task || !team) throw new Error(`Task ${taskId} or team ${teamName} not found`)

    const agent = team.getAgent(agentName)
    if (!agent) throw new Error(`Agent ${agentName} not found in team ${teamName}`)

    agent.assignTask(taskId)

    const engine = new QueryEngine()
    this.engines.set(agent.id, engine)

    try {
      // @ts-ignore
      const result = await engine.query({
        ...queryOptions,
        model: agent.config.model || queryOptions.model || 'opus',
        systemPrompt: agent.buildSystemPrompt(`Team: ${teamName}. Task: ${task.description}`),
        tools: agent.getTools(),
        maxTurns: agent.config.maxTurns ?? 50,
      })

      agent.complete(result.finalText ?? '')
      task.status = 'completed'
      task.result = result.finalText
      this.emitEvent({ type: 'task_completed', taskId, result: result.finalText ?? '' })
      return result.finalText ?? ''
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      agent.fail(errMsg)
      task.status = 'failed'
      task.result = errMsg
      this.emitEvent({ type: 'task_failed', taskId, error: errMsg })
      throw error
    }
  }

  /** Decompose a complex task into sub-tasks and assign to a team */
  decomposeTask(
    parentTaskId: string,
    subtasks: Array<{ description: string; priority?: number }>,
    teamName: string,
  ): TaskDefinition[] {
    const created: TaskDefinition[] = []
    for (const sub of subtasks) {
      const task = this.createTask(sub.description, sub.priority ?? 0, parentTaskId)
      this.assignTask(task.id, teamName)
      created.push(task)
    }
    return created
  }

  /** Stop all agents in a team */
  stopTeam(teamName: string): void {
    const team = this.teams.get(teamName)
    if (!team) return
    for (const agent of team.agents.values()) {
      agent.stop()
    }
  }

  /** Get the shared context bus for cross-agent state */
  getSharedContext(): SharedContextBus {
    return this.contextBus
  }

  /** Get a task by ID */
  getTask(taskId: string): TaskDefinition | undefined {
    return this.tasks.get(taskId)
  }

  /** List all tasks */
  listTasks(): TaskDefinition[] {
    return Array.from(this.tasks.values())
  }

  /** Get overall orchestrator status */
  getStatus(): {
    teams: number
    totalAgents: number
    activeAgents: number
    pendingTasks: number
    completedTasks: number
  } {
    let totalAgents = 0
    let activeAgents = 0
    let pendingTasks = 0
    let completedTasks = 0

    for (const team of this.teams.values()) {
      totalAgents += team.agents.size
      for (const agent of team.agents.values()) {
        if (agent.status === 'running' || agent.status === 'waiting') activeAgents++
      }
    }

    for (const task of this.tasks.values()) {
      if (task.status === 'pending') pendingTasks++
      if (task.status === 'completed') completedTasks++
    }

    return { teams: this.teams.size, totalAgents, activeAgents, pendingTasks, completedTasks }
  }

  private emitEvent(event: OrchestratorEvent): void {
    this.emit('orchestrator', event)
  }

  /** Subscribe to orchestrator events */
  onEvent(callback: (event: OrchestratorEvent) => void): () => void {
    const handler = (event: OrchestratorEvent) => callback(event)
    this.on('orchestrator', handler)
    return () => this.off('orchestrator', handler)
  }

  /** Clean up all resources */
  destroy(): void {
    for (const team of this.teams.values()) {
      this.stopTeam(team.name)
    }
    this.teams.clear()
    this.tasks.clear()
    this.engines.clear()
    this.contextBus.clear()
    this.removeAllListeners()
  }
}

// Global orchestrator instance
export const orchestrator = new AgentOrchestrator()
