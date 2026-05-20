declare const MACRO: {
  VERSION: string;
  BUILD_TIME: string;
  PACKAGE_URL: string;
  NATIVE_PACKAGE_URL: string;
  VERSION_CHANGELOG: string;
  FEEDBACK_CHANNEL: string;
  ISSUES_EXPLAINER: string;
};

// Bun's bundler inlines process.env.USER_TYPE at build time.
// In external builds it becomes the literal "external", in internal builds "ant".
// TypeScript then sees `("external" as string) === 'ant'` as always-false, producing TS2367.
// This utility function hides the comparison from TypeScript's type checker.
declare function __isAntBuild(): boolean;
