const EXTERNAL_DISABLED_FEATURES = [
  "ABLATION_BASELINE",
  "AGENT_MEMORY_SNAPSHOT",
  "AGENT_TRIGGERS",
  "AGENT_TRIGGERS_REMOTE",
  "ALLOW_TEST_VERSIONS",
  "ANTI_DISTILLATION_CC",
  "AWAY_SUMMARY",
  "BASH_CLASSIFIER",
  "BG_SESSIONS",
  "BRIDGE_MODE",
  "BUDDY",
  "BUILDING_CLAUDE_APPS",
  "BYOC_ENVIRONMENT_RUNNER",
  "CACHED_MICROCOMPACT",
  "CCR_AUTO_CONNECT",
  "CCR_MIRROR",
  "CCR_REMOTE_SETUP",
  "CHICAGO_MCP",
  "COMMIT_ATTRIBUTION",
  "COMPACTION_REMINDERS",
  "CONNECTOR_TEXT",
  "CONTEXT_COLLAPSE",
  "COORDINATOR_MODE",
  "COWORKER_TYPE_TELEMETRY",
  "DAEMON",
  "DIRECT_CONNECT",
  "DOWNLOAD_USER_SETTINGS",
  "DUMP_SYSTEM_PROMPT",
  "ENHANCED_TELEMETRY_BETA",
  "EXPERIMENTAL_SKILL_SEARCH",
  "EXTRACT_MEMORIES",
  "FILE_PERSISTENCE",
  "FORK_SUBAGENT",
  "HARD_FAIL",
  "HISTORY_PICKER",
  "HISTORY_SNIP",
  "HOOK_PROMPTS",
  "IS_LIBC_GLIBC",
  "IS_LIBC_MUSL",
  "KAIROS",
  "KAIROS_BRIEF",
  "KAIROS_CHANNELS",
  "KAIROS_DREAM",
  "KAIROS_GITHUB_WEBHOOKS",
  "KAIROS_PUSH_NOTIFICATION",
  "LODESTONE",
  "MCP_RICH_OUTPUT",
  "MCP_SKILLS",
  "MEMORY_SHAPE_TELEMETRY",
  "MESSAGE_ACTIONS",
  "MONITOR_TOOL",
  "NATIVE_CLIENT_ATTESTATION",
  "NATIVE_CLIPBOARD_IMAGE",
  "NEW_INIT",
  "OVERFLOW_TEST_TOOL",
  "PERFETTO_TRACING",
  "POWERSHELL_AUTO_MODE",
  "PROACTIVE",
  "PROMPT_CACHE_BREAK_DETECTION",
  "QUICK_SEARCH",
  "REACTIVE_COMPACT",
  "REVIEW_ARTIFACT",
  "RUN_SKILL_GENERATOR",
  "SELF_HOSTED_RUNNER",
  "SHOT_STATS",
  "SKIP_DETECTION_WHEN_AUTOUPDATES_DISABLED",
  "SKILL_IMPROVEMENT",
  "SLOW_OPERATION_LOGGING",
  "SSH_REMOTE",
  "STREAMLINED_OUTPUT",
  "TEAMMEM",
  "TEMPLATES",
  "TERMINAL_PANEL",
  "TOKEN_BUDGET",
  "TORCH",
  "TRANSCRIPT_CLASSIFIER",
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
  "WORKFLOW_SCRIPTS",
] as const;

const ENABLED_FEATURES = [
  "AUTO_THEME",
  "BREAK_CACHE_COMMAND",
  "BUILTIN_EXPLORE_PLAN_AGENTS",
] as const;

const ENABLED_SET = new Set<string>(ENABLED_FEATURES);

const featureModuleCode = `
export function feature(name) {
  const ENABLED = ${JSON.stringify(Array.from(ENABLED_FEATURES))};
  return ENABLED.includes(name);
}
`;

const version = process.env.CLI_VERSION || "99.0.0-external";

import { plugin } from "bun";

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
  },
};

const result = await Bun.build({
  entrypoints: ["./src/entrypoints/cli.tsx"],
  outdir: "./dist",
  target: "bun",
  format: "esm",
  sourcemap: "linked",
  minify: false,
  plugins: [bunBundlePlugin],
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
    "@ant/computer-use-mcp",
    "@ant/computer-use-swift",
    "@ant/computer-use-input",
    "@ant/claude-for-chrome-mcp",
    "audio-capture-napi",
    "color-diff-napi",
    "image-processor-napi",
    "modifiers-napi",
    "url-handler-napi",
    "sharp",
    "bun:ffi",
    "@aws-sdk/client-bedrock",
    "@aws-sdk/client-bedrock-runtime",
    "@aws-sdk/client-sts",
    "@aws-sdk/credential-providers",
    "@smithy/core",
    "@smithy/node-http-handler",
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
for (const output of result.outputs) {
  console.log(`  ${output.path} (${output.kind})`);
}
