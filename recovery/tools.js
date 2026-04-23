import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { getChromeStatus, startChromeMcp, startChromeNativeHost } from './features/chrome.js';
import { getComputerStatus, startComputerUseMcp } from './features/computer.js';
import { getBridgeStatus, setBridgeEnabled } from './features/bridge.js';
import { getLocalModelConfig, readState } from './config.js';
import { analyzeProject as scanProject, renderAnalysisReport } from './projectAnalysis.js';

const execFile = promisify(execFileCb);
const IGNORE_ERR_CODES = new Set(['EPERM', 'EACCES', 'ENOENT', 'ENOTDIR', 'EBUSY']);
const SKIP_NAMES = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.cache', 'tmp', 'temp', '__pycache__', '.venv', 'venv', 'target', 'out']);

function clip(text, max = 12000) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '\n...[truncated]' : text;
}

function isIgnorableFsError(error) {
  return IGNORE_ERR_CODES.has(error?.code);
}

function shouldSkipName(name) {
  const lower = String(name || '').toLowerCase();
  return SKIP_NAMES.has(name) || SKIP_NAMES.has(lower) || lower.startsWith('tmp') || lower.startsWith('temp');
}

export function safeResolve(cwd, target = '.') {
  return path.resolve(cwd, target);
}

export async function listDir(cwd, target = '.') {
  const full = safeResolve(cwd, target);
  try {
    const items = await fs.readdir(full, { withFileTypes: true });
    return items.map(item => `${item.isDirectory() ? '[DIR]' : '[FILE]'} ${item.name}`).join('\n');
  } catch (error) {
    if (isIgnorableFsError(error)) return `Cannot read ${full}: ${error.code}`;
    throw error;
  }
}

export async function readTextFile(cwd, target) {
  const full = safeResolve(cwd, target);
  const data = await fs.readFile(full, 'utf8');
  return clip(data, 16000);
}

export async function writeTextFile(cwd, target, content) {
  const full = safeResolve(cwd, target);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, 'utf8');
  return `wrote ${full}`;
}

export async function searchFiles(cwd, query, target = '.') {
  const full = safeResolve(cwd, target);
  const results = [];
  const needle = String(query || '').toLowerCase();
  if (!needle) return 'Provide a search query. Example: /search spring | .';

  async function walk(dir) {
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      if (isIgnorableFsError(error)) return;
      throw error;
    }

    for (const entry of entries) {
      if (shouldSkipName(entry.name)) continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
      } else if (entry.isFile()) {
        try {
          const text = await fs.readFile(abs, 'utf8');
          if (text.toLowerCase().includes(needle)) results.push(path.relative(cwd, abs));
        } catch (error) {
          if (!isIgnorableFsError(error)) {
            // ignore non-text or protected files silently
          }
        }
      }
      if (results.length >= 50) return;
    }
  }

  await walk(full);
  return results.length ? results.join('\n') : 'No matches found.';
}

export async function runShell(cwd, command) {
  const isWin = process.platform === 'win32';
  const file = isWin ? 'powershell.exe' : '/bin/bash';
  const args = isWin
    ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command]
    : ['-lc', command];

  const { stdout, stderr } = await execFile(file, args, {
    cwd,
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true
  });
  const out = [stdout, stderr].filter(Boolean).join('\n');
  return clip(out || '(no output)', 16000);
}

export function doctor(cwd) {
  return JSON.stringify({
    cwd,
    localModel: getLocalModelConfig(cwd),
    bridge: getBridgeStatus(),
    chrome: getChromeStatus(cwd),
    computerUse: getComputerStatus(cwd),
    state: readState(cwd)
  }, null, 2);
}

export async function analyzeProject(cwd, target = '.') {
  const full = safeResolve(cwd, target);
  const report = await scanProject(full);
  return renderAnalysisReport(report);
}

export async function writeAnalysisFiles(cwd, target = '.') {
  const full = safeResolve(cwd, target);
  const report = await scanProject(full);
  const markdown = path.join(full, 'PROJECT-ANALYSIS.md');
  const json = path.join(full, 'project-analysis.json');
  await fs.writeFile(markdown, renderAnalysisReport(report, { markdown: true }), 'utf8');
  await fs.writeFile(json, JSON.stringify(report, null, 2), 'utf8');
  return { markdown, json };
}

export const featureApi = {
  chrome: { getStatus: getChromeStatus, startChromeMcp, startChromeNativeHost },
  computer: { getStatus: getComputerStatus, startComputerUseMcp },
  bridge: { getStatus: getBridgeStatus, setEnabled: setBridgeEnabled }
};
