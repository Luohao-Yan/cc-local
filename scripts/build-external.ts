// Bun's bundler aggressively tree-shakes Zod v4 internal functions that are
// only referenced inside lazy __esm() wrappers. Since patching is fragile,
// we mark zod as external so it resolves at runtime from node_modules.
function patchZodUtilNamespace(content: string): string {
  return content;
}

// Commander.js doesn't have hideHelp() on Command (only on Option).
// The original source uses .hideHelp() on subcommands. Shim it as no-op.
function patchCommanderHideHelp(content: string): string {
  // Find the Commander Command class by its distinctive constructor pattern
  const marker = "this._allowUnknownOption = false";
  const idx = content.indexOf(marker);
  if (idx === -1) return content;

  // Walk back to find "class Command"
  const classStart = content.lastIndexOf("class Command", idx);
  if (classStart === -1) return content;

  // Find end of the class definition
  let depth = 0;
  let foundFirstBrace = false;
  let classEnd = classStart;
  for (let i = classStart; i < content.length; i++) {
    if (content[i] === "{") {
      depth++;
      foundFirstBrace = true;
    } else if (content[i] === "}") {
      depth--;
      if (foundFirstBrace && depth === 0) {
        classEnd = i + 1;
        break;
      }
    }
  }

  const shim = `
// Commander hideHelp() shim
Command.prototype.hideHelp = Command.prototype.hideHelp || function(_hide) { return this; };
`;
  return content.slice(0, classEnd) + "\n" + shim + content.slice(classEnd);
}

const EXTERNAL_DISABLED_FEATURES = [
  "ABLATION_BASELINE",
  "AGENT_MEMORY_SNAPSHOT",
  "AGENT_TRIGGERS",
  "AGENT_TRIGGERS_REMOTE",
  "ALLOW_TEST_VERSIONS",
  "ANTI_DISTILLATION_CC",
  "AWAY_SUMMARY",
  "BG_SESSIONS",
  "BASH_CLASSIFIER",
  "BRIDGE_MODE",
  "BUILDING_CLAUDE_APPS",
  "BYOC_ENVIRONMENT_RUNNER",
  "CCR_AUTO_CONNECT",
  "CCR_MIRROR",
  "CCR_REMOTE_SETUP",
  "CHICAGO_MCP",
  "COMMIT_ATTRIBUTION",
  "CONNECTOR_TEXT",
  "COORDINATOR_MODE",
  "COWORKER_TYPE_TELEMETRY",
  "DIRECT_CONNECT",
  "DOWNLOAD_USER_SETTINGS",
  "DUMP_SYSTEM_PROMPT",
  "ENHANCED_TELEMETRY_BETA",
  "EXPERIMENTAL_SKILL_SEARCH",
  "FILE_PERSISTENCE",
  "HARD_FAIL",
  "IS_LIBC_GLIBC",
  "IS_LIBC_MUSL",
  "KAIROS",
  "KAIROS_BRIEF",
  "KAIROS_CHANNELS",
  "KAIROS_DREAM",
  "KAIROS_GITHUB_WEBHOOKS",
  "KAIROS_PUSH_NOTIFICATION",
  "LODESTONE",
  "MCP_SKILLS",
  "MEMORY_SHAPE_TELEMETRY",
  "NATIVE_CLIENT_ATTESTATION",
  "NATIVE_CLIPBOARD_IMAGE",
  "OVERFLOW_TEST_TOOL",
  "PERFETTO_TRACING",
  "PROMPT_CACHE_BREAK_DETECTION",
  "REVIEW_ARTIFACT",
  "RUN_SKILL_GENERATOR",
  "SELF_HOSTED_RUNNER",
  "SHOT_STATS",
  "SKIP_DETECTION_WHEN_AUTOUPDATES_DISABLED",
  "SKILL_IMPROVEMENT",
  "SLOW_OPERATION_LOGGING",
  "SSH_REMOTE",
  "TEAMMEM",
  "TEMPLATES",
  "TORCH",
  "TREE_SITTER_BASH",
  "TREE_SITTER_BASH_SHADOW",
  "UDS_INBOX",
  "ULTRAPLAN",
  "ULTRATHINK",
  "UNATTENDED_RETRY",
  "UPLOAD_USER_SETTINGS",
  "VERIFICATION_AGENT",
  "VOICE_MODE",
  "WEB_BROWSER_TOOL",
] as const;

const ENABLED_FEATURES = [
  "AUTO_THEME",
  "AWAY_SUMMARY",
  "BASH_CLASSIFIER",
  "BG_SESSIONS",
  "BREAK_CACHE_COMMAND",
  "BUDDY",
  "BUILTIN_EXPLORE_PLAN_AGENTS",
  "CACHED_MICROCOMPACT",
  "COMPACTION_REMINDERS",
  "CONTEXT_COLLAPSE",
  "DAEMON",
  "EXTRACT_MEMORIES",
  "FORK_SUBAGENT",
  "HISTORY_PICKER",
  "HISTORY_SNIP",
  "HOOK_PROMPTS",
  "MCP_RICH_OUTPUT",
  "MESSAGE_ACTIONS",
  "MONITOR_TOOL",
  "NEW_INIT",
  "POWERSHELL_AUTO_MODE",
  "PROACTIVE",
  "QUICK_SEARCH",
  "REACTIVE_COMPACT",
  "STREAMLINED_OUTPUT",
  "TERMINAL_PANEL",
  "TOKEN_BUDGET",
  "TRANSCRIPT_CLASSIFIER",
  "WORKFLOW_SCRIPTS",
] as const;

const ENABLED_SET = new Set<string>(ENABLED_FEATURES);

const featureModuleCode = `
export function feature(name) {
  const ENABLED = ${JSON.stringify(Array.from(ENABLED_FEATURES))};
  return ENABLED.includes(name);
}
`;

const version = process.env.CLI_VERSION || "99.99-local";

import { plugin } from "bun";
import { rmSync, mkdirSync } from "node:fs";
import { basename } from "node:path";

// Clean dist directory before build to ensure no stale files
const distDir = "./dist";
try {
  rmSync(distDir, { recursive: true, force: true });
  mkdirSync(distDir, { recursive: true });
  console.log(`Cleaned ${distDir}/`);
} catch (e) {
  console.log(`Warning: could not clean ${distDir}/: ${e}`);
}

const reactCompilerRuntimeCode = `
export function c(size) {
  return new Array(size).fill(Symbol.for("react.memo_cache_sentinel"));
}
`;

const bunBundlePlugin = {
  name: "bun-bundle-shim",
  setup(build: any) {
    build.onResolve({ filter: /^bun:bundle$/ }, () => ({
      path: "bun:bundle",
      namespace: "bun-bundle-shim",
    }));
    build.onLoad({ filter: /.*/, namespace: "bun-bundle-shim" }, () => ({
      contents: featureModuleCode,
      loader: "js",
    }));

    build.onResolve({ filter: /^react\/compiler-runtime$/ }, () => ({
      path: "react/compiler-runtime",
      namespace: "react-compiler-runtime-shim",
    }));
    build.onLoad({ filter: /.*/, namespace: "react-compiler-runtime-shim" }, () => ({
      contents: reactCompilerRuntimeCode,
      loader: "js",
    }));

    // Resolve .js imports to .ts/.tsx files (TypeScript ESM convention)
    // Also handles off-by-one path depth issues from React Compiler output
    build.onResolve({ filter: /^\.{1,2}[\\/].*\.js$/ }, (args: any) => {
      if (args.path.includes('node_modules')) return undefined;
      const fs = require('fs');
      const pathModule = require('path');
      const dir = args.resolveDir || '.';

      // Try exact path with .ts/.tsx extension
      const tryResolve = (importPath: string) => {
        const candidates = [
          importPath.replace(/\.js$/, '.ts'),
          importPath.replace(/\.js$/, '.tsx'),
        ];
        for (const candidate of candidates) {
          const resolved = pathModule.resolve(dir, candidate);
          if (fs.existsSync(resolved)) {
            return resolved;
          }
        }
        return null;
      };

      // 1. Try exact path
      let result = tryResolve(args.path);
      if (result) return { path: result, external: false };

      // 2. Try removing one ../ level (React Compiler off-by-one fix)
      const segments = args.path.split('/');
      const hasExtraParent = segments.length > 1 && segments[0] === '..';
      if (hasExtraParent) {
        const adjusted = segments.slice(1).join('/');
        result = tryResolve(adjusted);
        if (result) return { path: result, external: false };
      }

      // 3. Try adding one ../ level
      result = tryResolve('../' + args.path);
      if (result) return { path: result, external: false };

      return undefined; // let Bun handle it
    });
  },
};

const buildLegacy = process.env.CCLOCAL_BUILD_LEGACY === "1";
const entrypoint = "./packages/cli/src/index.ts";

async function buildEntrypoint(source: string, destination: string): Promise<void> {
  const buildName = basename(destination, ".js");
  const outdir = `./dist/.build-${buildName}`;
  rmSync(outdir, { recursive: true, force: true });

  const result = await Bun.build({
    entrypoints: [source],
    outdir,
    target: "bun",
    format: "esm",
    sourcemap: "linked",
    minify: false,
    plugins: [bunBundlePlugin],
    // 启用 feature flags
    // BUDDY: 伙伴功能
    // TRANSCRIPT_CLASSIFIER: Auto Mode 自动模式（安全分类器）
    // BASH_CLASSIFIER: Bash 命令分类器（Auto Mode 依赖）
    // AUTO_THEME: 主题自动切换和完整主题列表
    features: Array.from(ENABLED_FEATURES),
    define: {
      "MACRO.VERSION": JSON.stringify(version),
      "MACRO.BUILD_TIME": JSON.stringify(new Date().toISOString()),
      "MACRO.PACKAGE_URL": JSON.stringify("https://www.npmjs.com/package/@anthropic-ai/claude-code"),
      "MACRO.NATIVE_PACKAGE_URL": JSON.stringify(""),
      "MACRO.VERSION_CHANGELOG": JSON.stringify(""),
      "MACRO.FEEDBACK_CHANNEL": JSON.stringify(""),
      "MACRO.ISSUES_EXPLAINER": JSON.stringify("https://github.com/anthropics/claude-code/issues"),
    },
    loader: {
      ".md": "text",
    },
    external: [
      "@anthropic-ai/bedrock-sdk",
      "@anthropic-ai/foundry-sdk",
      "@anthropic-ai/vertex-sdk",
      "@anthropic-ai/sandbox-runtime",
      "@anthropic-ai/mcpb",
      "@anthropic-ai/claude-agent-sdk",
      "@ant/claude-for-chrome-mcp",
      "@ant/computer-use-mcp",
      "@ant/computer-use-swift",
      "@ant/computer-use-input",
      "audio-capture-napi",
      "color-diff-napi",
      "image-processor-napi",
      "modifiers-napi",
      "url-handler-napi",
      "sharp",
      "bun:ffi",
      // Zod v4 has aggressive tree-shaking issues with Bun's bundler.
      // Marking as external ensures all internals are available at runtime.
      "zod",
      // 注意：@aws-sdk 和 @smithy 包不标记为 external，确保它们被打包进去
      // "@aws-sdk/client-bedrock",
      // "@aws-sdk/client-bedrock-runtime",
      // "@aws-sdk/client-sts",
      // "@aws-sdk/credential-providers",
      // "@smithy/core",
      // "@smithy/node-http-handler",
      "@azure/identity",
      "google-auth-library",
    ],
  });

  if (!result.success) {
    console.error("Build failed:");
    for (const log of result.logs) {
      console.error(log);
    }
    process.exit(1);
  }

  console.log(`Build succeeded: ${result.outputs.length} output(s)`);
  console.log(`  Entrypoint: ${source}`);
  for (const output of result.outputs) {
    console.log(`  ${output.path} (${output.kind})`);
  }

  const builtEntry = result.outputs.find((output) => output.kind === "entry-point");
  if (!builtEntry) {
    console.error("Build failed: entry-point output not found");
    process.exit(1);
  }

  let content = await Bun.file(builtEntry.path).text();
  content = content.replace(/\n\/\/# sourceMappingURL=.*(?:\n)?$/u, "\n");

  // Patch Zod v4 namespace bug: Bun's bundler tree-shakes functions only
  // accessed via `util.*` namespace in Zod classic/mini schemas.
  content = patchZodUtilNamespace(content);

  // Patch Commander.js hideHelp() shim
  content = patchCommanderHideHelp(content);

  if (!content.startsWith("#!/")) {
    content = `#!/usr/bin/env bun\n${content}`;
    console.log(`  Added shebang to ${destination}`);
  }
  await Bun.write(destination, content);
  console.log(`  Wrote ${destination}`);
  rmSync(outdir, { recursive: true, force: true });
  console.log(`  Cleaned ${outdir}`);
}

// 统一发布入口为 dist/cli.js，使全局安装和 package.json bin 不随入口文件名变化。
await buildEntrypoint(entrypoint, "./dist/cli.js");
// TODO: next-cli.js requires runtime/ directory which needs to be restored
// 灰度候选入口：默认走 native 路径，供 cclocal-next 全局命令使用
// await buildEntrypoint("./packages/cli/src/entrypoints/next.ts", "./dist/next-cli.js");
if (!buildLegacy) {
  await buildEntrypoint("./packages/server/src/index.ts", "./dist/server.js");
  await buildEntrypoint("./packages/cli/src/entrypoints/cli.tsx", "./dist/legacy-cli.js");
}

// 生成发布用的 package.json
const publishPkg = {
  name: "cc-local",
  version: version,
  description: "Claude Code Local - 支持第三方兼容 Anthropic API 的 LLM 服务",
  type: "module",
  bin: {
    "cclocal": "./cli.js",
    // "cclocal-next": "./next-cli.js",
  },
  files: ["cli.js", "server.js", "legacy-cli.js"],
  engines: {
    bun: ">=1.1.0",
  },
  keywords: ["claude", "code", "cli", "llm", "anthropic"],
  license: "UNLICENSED",
  dependencies: {
    // zod is externalized due to Bun bundler tree-shaking bugs with Zod v4
    zod: "^3.25.76",
  },
};
await Bun.write("./dist/package.json", JSON.stringify(publishPkg, null, 2) + "\n");
console.log("  Generated dist/package.json");
