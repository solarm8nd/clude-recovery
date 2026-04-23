import fs from 'node:fs/promises';
import path from 'node:path';
import { exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';
import { getChromeStatus, startChromeMcp, startChromeNativeHost } from './features/chrome.js';
import { getComputerStatus, startComputerUseMcp } from './features/computer.js';
import { getBridgeStatus, setBridgeEnabled } from './features/bridge.js';
import { getLocalModelConfig, readState } from './config.js';
import { analyzeProject as scanProject, renderAnalysisReport } from './projectAnalysis.js';

const exec = promisify(execCb);

function clip(text, max = 12000) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '\n...[truncated]' : text;
}

export function safeResolve(cwd, target = '.') {
  return path.resolve(cwd, target);
}

export async function listDir(cwd, target = '.') {
  const full = safeResolve(cwd, target);
  const items = await fs.readdir(full, { withFileTypes: true });
  return items.map(item => `${item.isDirectory() ? '[DIR]' : '[FILE]'} ${item.name}`).join('\n');
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
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
      } else if (entry.isFile()) {
        try {
          const text = await fs.readFile(abs, 'utf8');
          if (text.toLowerCase().includes(query.toLowerCase())) {
            results.push(path.relative(cwd, abs));
          }
        } catch {}
      }
      if (results.length >= 50) return;
    }
  }
  await walk(full);
  return results.length ? results.join('\n') : 'No matches found.';
}

export async function runShell(cwd, command) {
  const { stdout, stderr } = await exec(command, {
    cwd,
    shell: true,
    maxBuffer: 8 * 1024 * 1024
  });
  const out = [stdout, stderr].filter(Boolean).join('\n');
  return clip(out || '(no output)', 16000);
}

export function doctor(cwd) {
  return JSON.stringify({
    cwd,
    localModel: getLocalModelConfig(),
    bridge: getBridgeStatus(),
    chrome: getChromeStatus(cwd),
    computerUse: getComputerStatus(cwd),
    state: readState()
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
