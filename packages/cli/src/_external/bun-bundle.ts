declare const __FEATURE_ABLATION_BASELINE__: boolean;
declare const __FEATURE_AGENT_MEMORY_SNAPSHOT__: boolean;
declare const __FEATURE_AGENT_TRIGGERS__: boolean;
declare const __FEATURE_AGENT_TRIGGERS_REMOTE__: boolean;
declare const __FEATURE_ALLOW_TEST_VERSIONS__: boolean;
declare const __FEATURE_ANTI_DISTILLATION_CC__: boolean;
declare const __FEATURE_AUTO_THEME__: boolean;
declare const __FEATURE_AWAY_SUMMARY__: boolean;
declare const __FEATURE_BASH_CLASSIFIER__: boolean;
declare const __FEATURE_BG_SESSIONS__: boolean;
declare const __FEATURE_BREAK_CACHE_COMMAND__: boolean;
declare const __FEATURE_BRIDGE_MODE__: boolean;
declare const __FEATURE_BUDDY__: boolean;
declare const __FEATURE_BUILDING_CLAUDE_APPS__: boolean;
declare const __FEATURE_BUILTIN_EXPLORE_PLAN_AGENTS__: boolean;
declare const __FEATURE_BYOC_ENVIRONMENT_RUNNER__: boolean;
declare const __FEATURE_CACHED_MICROCOMPACT__: boolean;
declare const __FEATURE_CCR_AUTO_CONNECT__: boolean;
declare const __FEATURE_CCR_MIRROR__: boolean;
declare const __FEATURE_CCR_REMOTE_SETUP__: boolean;
declare const __FEATURE_CHICAGO_MCP__: boolean;
declare const __FEATURE_COMMIT_ATTRIBUTION__: boolean;
declare const __FEATURE_COMPACTION_REMINDERS__: boolean;
declare const __FEATURE_CONNECTOR_TEXT__: boolean;
declare const __FEATURE_CONTEXT_COLLAPSE__: boolean;
declare const __FEATURE_COORDINATOR_MODE__: boolean;
declare const __FEATURE_COWORKER_TYPE_TELEMETRY__: boolean;
declare const __FEATURE_DAEMON__: boolean;
declare const __FEATURE_DIRECT_CONNECT__: boolean;
declare const __FEATURE_DOWNLOAD_USER_SETTINGS__: boolean;
declare const __FEATURE_DUMP_SYSTEM_PROMPT__: boolean;
declare const __FEATURE_ENHANCED_TELEMETRY_BETA__: boolean;
declare const __FEATURE_EXPERIMENTAL_SKILL_SEARCH__: boolean;
declare const __FEATURE_EXTRACT_MEMORIES__: boolean;
declare const __FEATURE_FILE_PERSISTENCE__: boolean;
declare const __FEATURE_FORK_SUBAGENT__: boolean;
declare const __FEATURE_HARD_FAIL__: boolean;
declare const __FEATURE_HISTORY_PICKER__: boolean;
declare const __FEATURE_HISTORY_SNIP__: boolean;
declare const __FEATURE_HOOK_PROMPTS__: boolean;
declare const __FEATURE_IS_LIBC_GLIBC__: boolean;
declare const __FEATURE_IS_LIBC_MUSL__: boolean;
declare const __FEATURE_KAIROS__: boolean;
declare const __FEATURE_KAIROS_BRIEF__: boolean;
declare const __FEATURE_KAIROS_CHANNELS__: boolean;
declare const __FEATURE_KAIROS_DREAM__: boolean;
declare const __FEATURE_KAIROS_GITHUB_WEBHOOKS__: boolean;
declare const __FEATURE_KAIROS_PUSH_NOTIFICATION__: boolean;
declare const __FEATURE_LODESTONE__: boolean;
declare const __FEATURE_MCP_RICH_OUTPUT__: boolean;
declare const __FEATURE_MCP_SKILLS__: boolean;
declare const __FEATURE_MEMORY_SHAPE_TELEMETRY__: boolean;
declare const __FEATURE_MESSAGE_ACTIONS__: boolean;
declare const __FEATURE_MONITOR_TOOL__: boolean;
declare const __FEATURE_NATIVE_CLIENT_ATTESTATION__: boolean;
declare const __FEATURE_NATIVE_CLIPBOARD_IMAGE__: boolean;
declare const __FEATURE_NEW_INIT__: boolean;
declare const __FEATURE_OVERFLOW_TEST_TOOL__: boolean;
declare const __FEATURE_PERFETTO_TRACING__: boolean;
declare const __FEATURE_POWERSHELL_AUTO_MODE__: boolean;
declare const __FEATURE_PROACTIVE__: boolean;
declare const __FEATURE_PROMPT_CACHE_BREAK_DETECTION__: boolean;
declare const __FEATURE_QUICK_SEARCH__: boolean;
declare const __FEATURE_REACTIVE_COMPACT__: boolean;
declare const __FEATURE_REVIEW_ARTIFACT__: boolean;
declare const __FEATURE_RUN_SKILL_GENERATOR__: boolean;
declare const __FEATURE_SELF_HOSTED_RUNNER__: boolean;
declare const __FEATURE_SHOT_STATS__: boolean;
declare const __FEATURE_SKIP_DETECTION_WHEN_AUTOUPDATES_DISABLED__: boolean;
declare const __FEATURE_SKILL_IMPROVEMENT__: boolean;
declare const __FEATURE_SLOW_OPERATION_LOGGING__: boolean;
declare const __FEATURE_SSH_REMOTE__: boolean;
declare const __FEATURE_STREAMLINED_OUTPUT__: boolean;
declare const __FEATURE_TEAMMEM__: boolean;
declare const __FEATURE_TEMPLATES__: boolean;
declare const __FEATURE_TERMINAL_PANEL__: boolean;
declare const __FEATURE_TOKEN_BUDGET__: boolean;
declare const __FEATURE_TORCH__: boolean;
declare const __FEATURE_TRANSCRIPT_CLASSIFIER__: boolean;
declare const __FEATURE_TREE_SITTER_BASH__: boolean;
declare const __FEATURE_TREE_SITTER_BASH_SHADOW__: boolean;
declare const __FEATURE_UDS_INBOX__: boolean;
declare const __FEATURE_ULTRAPLAN__: boolean;
declare const __FEATURE_ULTRATHINK__: boolean;
declare const __FEATURE_UNATTENDED_RETRY__: boolean;
declare const __FEATURE_UPLOAD_USER_SETTINGS__: boolean;
declare const __FEATURE_VERIFICATION_AGENT__: boolean;
declare const __FEATURE_VOICE_MODE__: boolean;
declare const __FEATURE_WEB_BROWSER_TOOL__: boolean;
declare const __FEATURE_WORKFLOW_SCRIPTS__: boolean;

const FEATURE_MAP: Record<string, boolean> = {
  ABLATION_BASELINE: typeof __FEATURE_ABLATION_BASELINE__ !== "undefined" ? __FEATURE_ABLATION_BASELINE__ : false,
  AGENT_MEMORY_SNAPSHOT: typeof __FEATURE_AGENT_MEMORY_SNAPSHOT__ !== "undefined" ? __FEATURE_AGENT_MEMORY_SNAPSHOT__ : false,
  AGENT_TRIGGERS: typeof __FEATURE_AGENT_TRIGGERS__ !== "undefined" ? __FEATURE_AGENT_TRIGGERS__ : false,
  AGENT_TRIGGERS_REMOTE: typeof __FEATURE_AGENT_TRIGGERS_REMOTE__ !== "undefined" ? __FEATURE_AGENT_TRIGGERS_REMOTE__ : false,
  ALLOW_TEST_VERSIONS: typeof __FEATURE_ALLOW_TEST_VERSIONS__ !== "undefined" ? __FEATURE_ALLOW_TEST_VERSIONS__ : false,
  ANTI_DISTILLATION_CC: typeof __FEATURE_ANTI_DISTILLATION_CC__ !== "undefined" ? __FEATURE_ANTI_DISTILLATION_CC__ : false,
  AUTO_THEME: typeof __FEATURE_AUTO_THEME__ !== "undefined" ? __FEATURE_AUTO_THEME__ : true,
  AWAY_SUMMARY: typeof __FEATURE_AWAY_SUMMARY__ !== "undefined" ? __FEATURE_AWAY_SUMMARY__ : false,
  BASH_CLASSIFIER: typeof __FEATURE_BASH_CLASSIFIER__ !== "undefined" ? __FEATURE_BASH_CLASSIFIER__ : false,
  BG_SESSIONS: typeof __FEATURE_BG_SESSIONS__ !== "undefined" ? __FEATURE_BG_SESSIONS__ : false,
  BREAK_CACHE_COMMAND: typeof __FEATURE_BREAK_CACHE_COMMAND__ !== "undefined" ? __FEATURE_BREAK_CACHE_COMMAND__ : true,
  BRIDGE_MODE: typeof __FEATURE_BRIDGE_MODE__ !== "undefined" ? __FEATURE_BRIDGE_MODE__ : false,
  BUDDY: typeof __FEATURE_BUDDY__ !== "undefined" ? __FEATURE_BUDDY__ : false,
  BUILDING_CLAUDE_APPS: typeof __FEATURE_BUILDING_CLAUDE_APPS__ !== "undefined" ? __FEATURE_BUILDING_CLAUDE_APPS__ : false,
  BUILTIN_EXPLORE_PLAN_AGENTS: typeof __FEATURE_BUILTIN_EXPLORE_PLAN_AGENTS__ !== "undefined" ? __FEATURE_BUILTIN_EXPLORE_PLAN_AGENTS__ : true,
  BYOC_ENVIRONMENT_RUNNER: typeof __FEATURE_BYOC_ENVIRONMENT_RUNNER__ !== "undefined" ? __FEATURE_BYOC_ENVIRONMENT_RUNNER__ : false,
  CACHED_MICROCOMPACT: typeof __FEATURE_CACHED_MICROCOMPACT__ !== "undefined" ? __FEATURE_CACHED_MICROCOMPACT__ : false,
  CCR_AUTO_CONNECT: typeof __FEATURE_CCR_AUTO_CONNECT__ !== "undefined" ? __FEATURE_CCR_AUTO_CONNECT__ : false,
  CCR_MIRROR: typeof __FEATURE_CCR_MIRROR__ !== "undefined" ? __FEATURE_CCR_MIRROR__ : false,
  CCR_REMOTE_SETUP: typeof __FEATURE_CCR_REMOTE_SETUP__ !== "undefined" ? __FEATURE_CCR_REMOTE_SETUP__ : false,
  CHICAGO_MCP: typeof __FEATURE_CHICAGO_MCP__ !== "undefined" ? __FEATURE_CHICAGO_MCP__ : false,
  COMMIT_ATTRIBUTION: typeof __FEATURE_COMMIT_ATTRIBUTION__ !== "undefined" ? __FEATURE_COMMIT_ATTRIBUTION__ : false,
  COMPACTION_REMINDERS: typeof __FEATURE_COMPACTION_REMINDERS__ !== "undefined" ? __FEATURE_COMPACTION_REMINDERS__ : false,
  CONNECTOR_TEXT: typeof __FEATURE_CONNECTOR_TEXT__ !== "undefined" ? __FEATURE_CONNECTOR_TEXT__ : false,
  CONTEXT_COLLAPSE: typeof __FEATURE_CONTEXT_COLLAPSE__ !== "undefined" ? __FEATURE_CONTEXT_COLLAPSE__ : false,
  COORDINATOR_MODE: typeof __FEATURE_COORDINATOR_MODE__ !== "undefined" ? __FEATURE_COORDINATOR_MODE__ : false,
  COWORKER_TYPE_TELEMETRY: typeof __FEATURE_COWORKER_TYPE_TELEMETRY__ !== "undefined" ? __FEATURE_COWORKER_TYPE_TELEMETRY__ : false,
  DAEMON: typeof __FEATURE_DAEMON__ !== "undefined" ? __FEATURE_DAEMON__ : false,
  DIRECT_CONNECT: typeof __FEATURE_DIRECT_CONNECT__ !== "undefined" ? __FEATURE_DIRECT_CONNECT__ : false,
  DOWNLOAD_USER_SETTINGS: typeof __FEATURE_DOWNLOAD_USER_SETTINGS__ !== "undefined" ? __FEATURE_DOWNLOAD_USER_SETTINGS__ : false,
  DUMP_SYSTEM_PROMPT: typeof __FEATURE_DUMP_SYSTEM_PROMPT__ !== "undefined" ? __FEATURE_DUMP_SYSTEM_PROMPT__ : false,
  ENHANCED_TELEMETRY_BETA: typeof __FEATURE_ENHANCED_TELEMETRY_BETA__ !== "undefined" ? __FEATURE_ENHANCED_TELEMETRY_BETA__ : false,
  EXPERIMENTAL_SKILL_SEARCH: typeof __FEATURE_EXPERIMENTAL_SKILL_SEARCH__ !== "undefined" ? __FEATURE_EXPERIMENTAL_SKILL_SEARCH__ : false,
  EXTRACT_MEMORIES: typeof __FEATURE_EXTRACT_MEMORIES__ !== "undefined" ? __FEATURE_EXTRACT_MEMORIES__ : false,
  FILE_PERSISTENCE: typeof __FEATURE_FILE_PERSISTENCE__ !== "undefined" ? __FEATURE_FILE_PERSISTENCE__ : false,
  FORK_SUBAGENT: typeof __FEATURE_FORK_SUBAGENT__ !== "undefined" ? __FEATURE_FORK_SUBAGENT__ : false,
  HARD_FAIL: typeof __FEATURE_HARD_FAIL__ !== "undefined" ? __FEATURE_HARD_FAIL__ : false,
  HISTORY_PICKER: typeof __FEATURE_HISTORY_PICKER__ !== "undefined" ? __FEATURE_HISTORY_PICKER__ : false,
  HISTORY_SNIP: typeof __FEATURE_HISTORY_SNIP__ !== "undefined" ? __FEATURE_HISTORY_SNIP__ : false,
  HOOK_PROMPTS: typeof __FEATURE_HOOK_PROMPTS__ !== "undefined" ? __FEATURE_HOOK_PROMPTS__ : false,
  IS_LIBC_GLIBC: typeof __FEATURE_IS_LIBC_GLIBC__ !== "undefined" ? __FEATURE_IS_LIBC_GLIBC__ : false,
  IS_LIBC_MUSL: typeof __FEATURE_IS_LIBC_MUSL__ !== "undefined" ? __FEATURE_IS_LIBC_MUSL__ : false,
  KAIROS: typeof __FEATURE_KAIROS__ !== "undefined" ? __FEATURE_KAIROS__ : false,
  KAIROS_BRIEF: typeof __FEATURE_KAIROS_BRIEF__ !== "undefined" ? __FEATURE_KAIROS_BRIEF__ : false,
  KAIROS_CHANNELS: typeof __FEATURE_KAIROS_CHANNELS__ !== "undefined" ? __FEATURE_KAIROS_CHANNELS__ : false,
  KAIROS_DREAM: typeof __FEATURE_KAIROS_DREAM__ !== "undefined" ? __FEATURE_KAIROS_DREAM__ : false,
  KAIROS_GITHUB_WEBHOOKS: typeof __FEATURE_KAIROS_GITHUB_WEBHOOKS__ !== "undefined" ? __FEATURE_KAIROS_GITHUB_WEBHOOKS__ : false,
  KAIROS_PUSH_NOTIFICATION: typeof __FEATURE_KAIROS_PUSH_NOTIFICATION__ !== "undefined" ? __FEATURE_KAIROS_PUSH_NOTIFICATION__ : false,
  LODESTONE: typeof __FEATURE_LODESTONE__ !== "undefined" ? __FEATURE_LODESTONE__ : false,
  MCP_RICH_OUTPUT: typeof __FEATURE_MCP_RICH_OUTPUT__ !== "undefined" ? __FEATURE_MCP_RICH_OUTPUT__ : false,
  MCP_SKILLS: typeof __FEATURE_MCP_SKILLS__ !== "undefined" ? __FEATURE_MCP_SKILLS__ : false,
  MEMORY_SHAPE_TELEMETRY: typeof __FEATURE_MEMORY_SHAPE_TELEMETRY__ !== "undefined" ? __FEATURE_MEMORY_SHAPE_TELEMETRY__ : false,
  MESSAGE_ACTIONS: typeof __FEATURE_MESSAGE_ACTIONS__ !== "undefined" ? __FEATURE_MESSAGE_ACTIONS__ : false,
  MONITOR_TOOL: typeof __FEATURE_MONITOR_TOOL__ !== "undefined" ? __FEATURE_MONITOR_TOOL__ : false,
  NATIVE_CLIENT_ATTESTATION: typeof __FEATURE_NATIVE_CLIENT_ATTESTATION__ !== "undefined" ? __FEATURE_NATIVE_CLIENT_ATTESTATION__ : false,
  NATIVE_CLIPBOARD_IMAGE: typeof __FEATURE_NATIVE_CLIPBOARD_IMAGE__ !== "undefined" ? __FEATURE_NATIVE_CLIPBOARD_IMAGE__ : false,
  NEW_INIT: typeof __FEATURE_NEW_INIT__ !== "undefined" ? __FEATURE_NEW_INIT__ : false,
  OVERFLOW_TEST_TOOL: typeof __FEATURE_OVERFLOW_TEST_TOOL__ !== "undefined" ? __FEATURE_OVERFLOW_TEST_TOOL__ : false,
  PERFETTO_TRACING: typeof __FEATURE_PERFETTO_TRACING__ !== "undefined" ? __FEATURE_PERFETTO_TRACING__ : false,
  POWERSHELL_AUTO_MODE: typeof __FEATURE_POWERSHELL_AUTO_MODE__ !== "undefined" ? __FEATURE_POWERSHELL_AUTO_MODE__ : false,
  PROACTIVE: typeof __FEATURE_PROACTIVE__ !== "undefined" ? __FEATURE_PROACTIVE__ : false,
  PROMPT_CACHE_BREAK_DETECTION: typeof __FEATURE_PROMPT_CACHE_BREAK_DETECTION__ !== "undefined" ? __FEATURE_PROMPT_CACHE_BREAK_DETECTION__ : false,
  QUICK_SEARCH: typeof __FEATURE_QUICK_SEARCH__ !== "undefined" ? __FEATURE_QUICK_SEARCH__ : false,
  REACTIVE_COMPACT: typeof __FEATURE_REACTIVE_COMPACT__ !== "undefined" ? __FEATURE_REACTIVE_COMPACT__ : false,
  REVIEW_ARTIFACT: typeof __FEATURE_REVIEW_ARTIFACT__ !== "undefined" ? __FEATURE_REVIEW_ARTIFACT__ : false,
  RUN_SKILL_GENERATOR: typeof __FEATURE_RUN_SKILL_GENERATOR__ !== "undefined" ? __FEATURE_RUN_SKILL_GENERATOR__ : false,
  SELF_HOSTED_RUNNER: typeof __FEATURE_SELF_HOSTED_RUNNER__ !== "undefined" ? __FEATURE_SELF_HOSTED_RUNNER__ : false,
  SHOT_STATS: typeof __FEATURE_SHOT_STATS__ !== "undefined" ? __FEATURE_SHOT_STATS__ : false,
  SKIP_DETECTION_WHEN_AUTOUPDATES_DISABLED: typeof __FEATURE_SKIP_DETECTION_WHEN_AUTOUPDATES_DISABLED__ !== "undefined" ? __FEATURE_SKIP_DETECTION_WHEN_AUTOUPDATES_DISABLED__ : false,
  SKILL_IMPROVEMENT: typeof __FEATURE_SKILL_IMPROVEMENT__ !== "undefined" ? __FEATURE_SKILL_IMPROVEMENT__ : false,
  SLOW_OPERATION_LOGGING: typeof __FEATURE_SLOW_OPERATION_LOGGING__ !== "undefined" ? __FEATURE_SLOW_OPERATION_LOGGING__ : false,
  SSH_REMOTE: typeof __FEATURE_SSH_REMOTE__ !== "undefined" ? __FEATURE_SSH_REMOTE__ : false,
  STREAMLINED_OUTPUT: typeof __FEATURE_STREAMLINED_OUTPUT__ !== "undefined" ? __FEATURE_STREAMLINED_OUTPUT__ : false,
  TEAMMEM: typeof __FEATURE_TEAMMEM__ !== "undefined" ? __FEATURE_TEAMMEM__ : false,
  TEMPLATES: typeof __FEATURE_TEMPLATES__ !== "undefined" ? __FEATURE_TEMPLATES__ : false,
  TERMINAL_PANEL: typeof __FEATURE_TERMINAL_PANEL__ !== "undefined" ? __FEATURE_TERMINAL_PANEL__ : false,
  TOKEN_BUDGET: typeof __FEATURE_TOKEN_BUDGET__ !== "undefined" ? __FEATURE_TOKEN_BUDGET__ : false,
  TORCH: typeof __FEATURE_TORCH__ !== "undefined" ? __FEATURE_TORCH__ : false,
  TRANSCRIPT_CLASSIFIER: typeof __FEATURE_TRANSCRIPT_CLASSIFIER__ !== "undefined" ? __FEATURE_TRANSCRIPT_CLASSIFIER__ : false,
  TREE_SITTER_BASH: typeof __FEATURE_TREE_SITTER_BASH__ !== "undefined" ? __FEATURE_TREE_SITTER_BASH__ : false,
  TREE_SITTER_BASH_SHADOW: typeof __FEATURE_TREE_SITTER_BASH_SHADOW__ !== "undefined" ? __FEATURE_TREE_SITTER_BASH_SHADOW__ : false,
  UDS_INBOX: typeof __FEATURE_UDS_INBOX__ !== "undefined" ? __FEATURE_UDS_INBOX__ : false,
  ULTRAPLAN: typeof __FEATURE_ULTRAPLAN__ !== "undefined" ? __FEATURE_ULTRAPLAN__ : false,
  ULTRATHINK: typeof __FEATURE_ULTRATHINK__ !== "undefined" ? __FEATURE_ULTRATHINK__ : false,
  UNATTENDED_RETRY: typeof __FEATURE_UNATTENDED_RETRY__ !== "undefined" ? __FEATURE_UNATTENDED_RETRY__ : false,
  UPLOAD_USER_SETTINGS: typeof __FEATURE_UPLOAD_USER_SETTINGS__ !== "undefined" ? __FEATURE_UPLOAD_USER_SETTINGS__ : false,
  VERIFICATION_AGENT: typeof __FEATURE_VERIFICATION_AGENT__ !== "undefined" ? __FEATURE_VERIFICATION_AGENT__ : false,
  VOICE_MODE: typeof __FEATURE_VOICE_MODE__ !== "undefined" ? __FEATURE_VOICE_MODE__ : false,
  WEB_BROWSER_TOOL: typeof __FEATURE_WEB_BROWSER_TOOL__ !== "undefined" ? __FEATURE_WEB_BROWSER_TOOL__ : false,
  WORKFLOW_SCRIPTS: typeof __FEATURE_WORKFLOW_SCRIPTS__ !== "undefined" ? __FEATURE_WORKFLOW_SCRIPTS__ : false,
};

export function feature(name: string): boolean {
  return FEATURE_MAP[name] ?? false;
}
