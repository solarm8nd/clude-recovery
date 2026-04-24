import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RECOVERY_ROOT = path.resolve(HERE, '..');
const SOURCE_ENTRY = path.join(RECOVERY_ROOT, 'src', 'main.tsx');
const IS_WIN = process.platform === 'win32';
const TSX_BIN = path.join(RECOVERY_ROOT, 'node_modules', '.bin', IS_WIN ? 'tsx.cmd' : 'tsx');

function trim(text, max = 2000) {
  const value = String(text || '');
  return value.length > max ? value.slice(0, max) + '\n...[truncated]' : value;
}

function hasSourcePrereqs() {
  return fs.existsSync(SOURCE_ENTRY) && fs.existsSync(TSX_BIN);
}

function buildEnv() {
  return {
    ...process.env,
    CLUDE_SOURCE_HANDOFF: '1'
  };
}

export function getSourceHandoffStatus(targetCwd = process.cwd()) {
  if (process.env.CLUDE_DISABLE_SOURCE_HANDOFF === '1') {
    return { ok: false, reason: 'disabled-by-env' };
  }
  if (process.env.CLUDE_SOURCE_HANDOFF === '1') {
    return { ok: false, reason: 'already-in-source-handoff' };
  }
  if (!hasSourcePrereqs()) {
    return {
      ok: false,
      reason: 'missing-source-prereqs',
      sourceEntry: SOURCE_ENTRY,
      tsxBin: TSX_BIN
    };
  }

  const probe = spawnSync(
    TSX_BIN,
    [SOURCE_ENTRY, '--help'],
    {
      cwd: targetCwd,
      env: buildEnv(),
      encoding: 'utf8',
      timeout: 12000,
      windowsHide: true,
      shell: false
    }
  );

  const stdout = trim(probe.stdout, 3000);
  const stderr = trim(probe.stderr, 3000);
  const combined = `${stdout}\n${stderr}`;
  const fatalPatterns = [
    /Cannot find module/i,
    /ERR_MODULE_NOT_FOUND/i,
    /SyntaxError/i,
    /ReferenceError/i,
    /TypeError/i
  ];
  const looksFatal = fatalPatterns.some(pattern => pattern.test(combined));
  const ok = probe.status === 0 && !probe.signal && !looksFatal;

  return {
    ok,
    reason: ok ? 'ready' : 'preflight-failed',
    code: probe.status,
    signal: probe.signal,
    stdout,
    stderr,
    sourceEntry: SOURCE_ENTRY,
    tsxBin: TSX_BIN
  };
}

export async function attemptSourceHandoff(targetCwd = process.cwd()) {
  const status = getSourceHandoffStatus(targetCwd);
  if (!status.ok) return status;

  return await new Promise((resolve) => {
    const child = spawn(
      TSX_BIN,
      [SOURCE_ENTRY],
      {
        cwd: targetCwd,
        env: buildEnv(),
        stdio: 'inherit',
        windowsHide: false,
        shell: false
      }
    );

    child.on('error', (error) => {
      resolve({ ok: false, reason: 'spawn-error', error: String(error) });
    });
    child.on('exit', (code, signal) => {
      resolve({ ok: code === 0, reason: 'source-exited', code, signal });
    });
  });
}
