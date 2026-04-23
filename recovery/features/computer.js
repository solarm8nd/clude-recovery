import { findClaudeBinary, spawnDetached } from './common.js';

export function getComputerStatus(rootDir = process.cwd()) {
  const cli = findClaudeBinary(rootDir);
  return {
    available: Boolean(cli),
    cliPath: cli,
    note: cli ? 'Computer-use MCP can be attempted through the local Claude binary.' : 'No Claude-compatible binary was found. Set CLAUDE_CLI_PATH to enable this feature.'
  };
}

export function startComputerUseMcp(rootDir = process.cwd()) {
  const cli = findClaudeBinary(rootDir);
  if (!cli) {
    throw new Error('No Claude-compatible binary found for computer-use MCP.');
  }
  return spawnDetached(cli, ['--computer-use-mcp'], { cwd: rootDir });
}
