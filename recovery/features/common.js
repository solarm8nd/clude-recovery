import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

export function findClaudeBinary(rootDir = process.cwd()) {
  const candidates = [
    process.env.CLAUDE_CLI_PATH,
    path.join(rootDir, 'node_modules', '@anthropic-ai', 'claude-agent-sdk-win32-x64', 'claude.exe'),
    path.join(rootDir, 'node_modules', '@anthropic-ai', 'claude-agent-sdk-darwin-arm64', 'claude'),
    path.join(rootDir, 'node_modules', '@anthropic-ai', 'claude-agent-sdk-darwin-x64', 'claude'),
    path.join(rootDir, 'node_modules', '@anthropic-ai', 'claude-agent-sdk-linux-x64', 'claude'),
    'claude'
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (candidate === 'claude') {
      try {
        const result = spawnSync(candidate, ['--version'], { stdio: 'ignore', shell: process.platform === 'win32' });
        if (result.status === 0) return candidate;
      } catch {}
      continue;
    }
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export function spawnDetached(command, args = [], options = {}) {
  const child = spawn(command, args, {
    stdio: 'ignore',
    detached: true,
    windowsHide: true,
    ...options
  });
  child.unref();
  return { pid: child.pid, command, args };
}
