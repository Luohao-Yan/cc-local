import { plugin } from "bun";

const version = process.env.CLI_VERSION || "99.99-local";

(globalThis as any).MACRO = {
  VERSION: version,
  BUILD_TIME: new Date().toISOString(),
  PACKAGE_URL: "https://www.npmjs.com/package/@anthropic-ai/claude-code",
  NATIVE_PACKAGE_URL: "",
  VERSION_CHANGELOG: "",
  FEEDBACK_CHANNEL: "",
  ISSUES_EXPLAINER: "https://github.com/anthropics/claude-code/issues",
};

// 开发环境启用的 feature flags（与 scripts/build-external.ts 保持一致）
const ENABLED_FEATURES = new Set([
  "AUTO_THEME",
  "BREAK_CACHE_COMMAND",
  "BUDDY",
  "BUILTIN_EXPLORE_PLAN_AGENTS",
  "TRANSCRIPT_CLASSIFIER",
  "BASH_CLASSIFIER",
]);

// Shim for react/compiler-runtime - this is a no-op since we're using the compiled output
const reactCompilerRuntimeShim = {
  c: (size: number) => new Array(size).fill(Symbol.for("react.memo_cache_sentinel")),
};

plugin({
  name: "bun-bundle-shim",
  setup(build) {
    build.module("bun:bundle", () => {
      return {
        exports: {
          feature: (name: string): boolean => ENABLED_FEATURES.has(name),
        },
        loader: "object",
      };
    });

    build.module("react/compiler-runtime", () => {
      return {
        exports: reactCompilerRuntimeShim,
        loader: "object",
      };
    });
  },
});
