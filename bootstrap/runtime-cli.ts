const DEFAULT_MACRO = {
  VERSION: '99.0.0',
  PACKAGE_URL: '@anthropic-ai/claude-code',
  NATIVE_PACKAGE_URL: '@anthropic-ai/claude-code',
  FEEDBACK_CHANNEL: 'support',
  ISSUES_EXPLAINER: 'open an issue',
  VERSION_CHANGELOG: '',
  BUILD_TIME: '',
} as const

const existingMacro =
  typeof globalThis !== 'undefined' && 'MACRO' in globalThis
    ? (globalThis as typeof globalThis & { MACRO?: typeof DEFAULT_MACRO }).MACRO
    : undefined

;(globalThis as typeof globalThis & { MACRO: typeof DEFAULT_MACRO }).MACRO = {
  ...DEFAULT_MACRO,
  ...existingMacro,
}

// The extracted source tree expects build-time globals like `MACRO.VERSION`.
// Direct Bun execution skips that bundling phase, so we publish a real global
// variable before loading the original CLI entrypoint.
;(0, eval)('var MACRO = globalThis.MACRO')

await import('../entrypoints/cli.tsx')
