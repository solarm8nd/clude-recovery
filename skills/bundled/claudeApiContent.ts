const placeholder = `# Claude API

Bundled Claude API reference content is unavailable in this local recovery build.
`

export const SKILL_MODEL_VARS = {
  OPUS_ID: 'claude-opus-4-6',
  OPUS_NAME: 'Claude Opus 4.6',
  SONNET_ID: 'claude-sonnet-4-6',
  SONNET_NAME: 'Claude Sonnet 4.6',
  HAIKU_ID: 'claude-haiku-4-5',
  HAIKU_NAME: 'Claude Haiku 4.5',
  PREV_SONNET_ID: 'claude-sonnet-4-5',
} satisfies Record<string, string>

export const SKILL_PROMPT: string = placeholder

export const SKILL_FILES: Record<string, string> = {
  'csharp/claude-api.md': placeholder,
  'curl/examples.md': placeholder,
  'go/claude-api.md': placeholder,
  'java/claude-api.md': placeholder,
  'php/claude-api.md': placeholder,
  'python/agent-sdk/README.md': placeholder,
  'python/agent-sdk/patterns.md': placeholder,
  'python/claude-api/README.md': placeholder,
  'python/claude-api/batches.md': placeholder,
  'python/claude-api/files-api.md': placeholder,
  'python/claude-api/streaming.md': placeholder,
  'python/claude-api/tool-use.md': placeholder,
  'ruby/claude-api.md': placeholder,
  'shared/error-codes.md': placeholder,
  'shared/live-sources.md': placeholder,
  'shared/models.md': placeholder,
  'shared/prompt-caching.md': placeholder,
  'shared/tool-use-concepts.md': placeholder,
  'typescript/agent-sdk/README.md': placeholder,
  'typescript/agent-sdk/patterns.md': placeholder,
  'typescript/claude-api/README.md': placeholder,
  'typescript/claude-api/batches.md': placeholder,
  'typescript/claude-api/files-api.md': placeholder,
  'typescript/claude-api/streaming.md': placeholder,
  'typescript/claude-api/tool-use.md': placeholder,
}
