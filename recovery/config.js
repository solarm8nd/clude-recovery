import fs from 'node:fs';
import path from 'node:path';

export const ROOT = process.cwd();
export const STATE_FILE = path.join(ROOT, '.clude-recovery.json');

export function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { bridgeEnabled: false };
  }
}

export function writeState(nextState) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(nextState, null, 2), 'utf8');
}

function readDotEnv(root = ROOT) {
  const envPath = path.join(root, '.env');
  try {
    const raw = fs.readFileSync(envPath, 'utf8');
    const out = {};
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

export function getLocalModelConfig() {
  const envFile = readDotEnv();
  return {
    baseUrl: process.env.LOCAL_LLM_BASE_URL || envFile.LOCAL_LLM_BASE_URL || '',
    model: process.env.LOCAL_LLM_MODEL || envFile.LOCAL_LLM_MODEL || '',
    apiKey: process.env.LOCAL_LLM_API_KEY || envFile.LOCAL_LLM_API_KEY || ''
  };
}
