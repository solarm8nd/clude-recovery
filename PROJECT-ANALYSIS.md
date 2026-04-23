# Project analysis

- Root: /mnt/data/clude_recovered_agent
- Files: 1994
- Directories: 328
- Code files: 1957
- Broken relative import files: 1671

## Package

- Name: clude-recovered-agent
- Version: 0.2.0
- Dependencies: 0
- Dev dependencies: 0

### Scripts
- start: node agent.js
- agent: node agent.js
- doctor: node scripts/doctor.js
- analyze: node scripts/analyze.js

## Findings
- There are 1671 source files with broken relative imports.

## Suggested plan
- Phase 1: confirm the runtime entrypoint and lock one runnable terminal-first path.
- Phase 2: repair package metadata, scripts, and runtime bootstrap files.
- Phase 3: reduce broken-import count by restoring real modules or safe compatibility shims.
- Phase 4: isolate optional integrations (Chrome, Computer Use, Bridge) behind lazy startup checks instead of eager crashes.
- Phase 5: test interactive terminal startup and one natural-language analysis task end-to-end.

## Entrypoints
- agent.js
- package.json
- src/QueryEngine.ts
- src/commands/add-dir/index.ts
- src/commands/agents/index.ts
- src/commands/ant-trace/index.js
- src/commands/autofix-pr/index.js
- src/commands/backfill-sessions/index.js
- src/commands/branch/index.ts
- src/commands/break-cache/index.js
- src/commands/bridge/index.ts
- src/commands/btw/index.ts
- src/commands/bughunter/index.js
- src/commands/chrome/index.ts
- src/commands/clear/index.ts
- src/commands/color/index.ts
- src/commands/compact/index.ts
- src/commands/config/index.ts
- src/commands/context/index.ts
- src/commands/copy/index.ts
- src/commands/cost/index.ts
- src/commands/ctx_viz/index.js
- src/commands/debug-tool-call/index.js
- src/commands/desktop/index.ts
- src/commands/diff/index.ts
- src/commands/doctor/index.ts
- src/commands/effort/index.ts
- src/commands/env/index.js
- src/commands/exit/index.ts
- src/commands/export/index.ts
- src/commands/extra-usage/index.ts
- src/commands/fast/index.ts
- src/commands/feedback/index.ts
- src/commands/files/index.ts
- src/commands/good-claude/index.js
- src/commands/heapdump/index.ts
- src/commands/help/index.ts
- src/commands/hooks/index.ts
- src/commands/ide/index.ts
- src/commands/install-github-app/index.ts

## Broken import samples
- src/QueryEngine.ts -> ./commands.js
- src/Task.ts -> ./state/AppState.js
- src/Tool.ts -> ./commands.js
- src/assistant/sessionDiscovery.ts -> ../recovery/magicProxy.js
- src/assistant/sessionHistory.ts -> ../constants/oauth.js
- src/bridge/bridgeApi.ts -> ./debugUtils.js
- src/bridge/bridgeConfig.ts -> ../constants/oauth.js
- src/bridge/bridgeDebug.ts -> ../utils/debug.js
- src/bridge/bridgeEnabled.ts -> ../utils/auth.js
- src/bridge/bridgeMain.ts -> ../constants/product.js
- src/bridge/bridgeMessaging.ts -> ../entrypoints/agentSdkTypes.js
- src/bridge/bridgePermissionCallbacks.ts -> ../utils/permissions/PermissionUpdateSchema.js
- src/bridge/bridgePointer.ts -> ../utils/debug.js
- src/bridge/bridgeStatusUtil.ts -> ../ink/stringWidth.js
- src/bridge/bridgeUI.ts -> ../ink/stringWidth.js
- src/bridge/codeSessionApi.ts -> ../utils/debug.js
- src/bridge/createSession.ts -> ../entrypoints/agentSdkTypes.js
- src/bridge/debugUtils.ts -> ../utils/debug.js
- src/bridge/envLessBridgeConfig.ts -> ../services/analytics/growthbook.js
- src/bridge/inboundAttachments.ts -> ../bootstrap/state.js
- src/bridge/inboundMessages.ts -> ../entrypoints/agentSdkTypes.js
- src/bridge/initReplBridge.ts -> ../bootstrap/state.js
- src/bridge/jwtUtils.ts -> ../services/analytics/index.js
- src/bridge/pollConfig.ts -> ../services/analytics/growthbook.js
- src/bridge/remoteBridgeCore.ts -> ./workSecret.js
- src/bridge/replBridge.ts -> ./types.js
- src/bridge/replBridgeHandle.ts -> ../utils/concurrentSessions.js
- src/bridge/replBridgeTransport.ts -> ../cli/transports/ccrClient.js
- src/bridge/sessionRunner.ts -> ../utils/slowOperations.js
- src/bridge/trustedDevice.ts -> ../constants/oauth.js
