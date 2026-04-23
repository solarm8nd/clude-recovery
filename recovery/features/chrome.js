import { findClaudeBinary, spawnDetached } from './common.js';

export function getChromeStatus(rootDir = process.cwd()) {
  const cli = findClaudeBinary(rootDir);
  return {
    available: Boolean(cli),
    cliPath: cli,
    note: cli ? 'Chrome feature can be attempted through the local Claude binary.' : 'No Claude-compatible binary was found. Set CLAUDE_CLI_PATH to enable this feature.'
  };
}

export function startChromeMcp(rootDir = process.cwd()) {
  const cli = findClaudeBinary(rootDir);
  if (!cli) {
    throw new Error('No Claude-compatible binary found for Chrome MCP.');
  }
  return spawnDetached(cli, ['--claude-in-chrome-mcp'], { cwd: rootDir });
}

export function startChromeNativeHost(rootDir = process.cwd()) {
  const cli = findClaudeBinary(rootDir);
  if (!cli) {
    throw new Error('No Claude-compatible binary found for Chrome native host.');
  }
  return spawnDetached(cli, ['--chrome-native-host'], { cwd: rootDir });
}
