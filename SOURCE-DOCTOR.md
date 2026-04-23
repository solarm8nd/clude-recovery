# Source Doctor

Checked at: 2026-04-23T11:34:00.688Z

- Code files scanned: **1946**
- bun compatibility imports patched: **196**
- unresolved relative imports found by static scan: **12412**

## Smoke test

```json
{}
```

## Top bare imports

- `react`: 1151
- `fs`: 146
- `@anthropic-ai/sdk`: 135
- `zod`: 128
- `lodash-es`: 124
- `figures`: 89
- `axios`: 57
- `chalk`: 47
- `@modelcontextprotocol/sdk`: 44
- `diff`: 19
- `execa`: 16
- `usehooks-ts`: 14
- `strip-ansi`: 12
- `@opentelemetry/api`: 10
- `@ant/computer-use-mcp`: 10
- `undici`: 6
- `qrcode`: 5
- `marked`: 5
- `ignore`: 5
- `semver`: 5
- `react-reconciler`: 5
- `@alcalzone/ansi-tokenize`: 5
- `chokidar`: 5
- `lru-cache`: 5
- `@opentelemetry/sdk-logs`: 4
- `type-fest`: 4
- `path`: 4
- `@opentelemetry/api-logs`: 3
- `@opentelemetry/sdk-metrics`: 3
- `ws`: 3

## Sample unresolved relative imports

- `src/QueryEngine.ts` -> `./commands.js`
- `src/QueryEngine.ts` -> `./commands.js`
- `src/QueryEngine.ts` -> `./constants/xml.js`
- `src/QueryEngine.ts` -> `./cost-tracker.js`
- `src/QueryEngine.ts` -> `./hooks/useCanUseTool.js`
- `src/QueryEngine.ts` -> `./memdir/memdir.js`
- `src/QueryEngine.ts` -> `./memdir/paths.js`
- `src/QueryEngine.ts` -> `./query.js`
- `src/QueryEngine.ts` -> `./services/api/errors.js`
- `src/QueryEngine.ts` -> `./services/mcp/types.js`
- `src/QueryEngine.ts` -> `./state/AppState.js`
- `src/QueryEngine.ts` -> `./Tool.js`
- `src/QueryEngine.ts` -> `./tools/AgentTool/loadAgentsDir.js`
- `src/QueryEngine.ts` -> `./tools/SyntheticOutputTool/SyntheticOutputTool.js`
- `src/QueryEngine.ts` -> `./types/message.js`
- `src/QueryEngine.ts` -> `./types/textInputTypes.js`
- `src/QueryEngine.ts` -> `./utils/abortController.js`
- `src/QueryEngine.ts` -> `./utils/commitAttribution.js`
- `src/QueryEngine.ts` -> `./utils/config.js`
- `src/QueryEngine.ts` -> `./utils/cwd.js`