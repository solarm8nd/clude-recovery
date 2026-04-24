import fs from 'node:fs';
import path from 'node:path';

export function getRoot(root = process.cwd()) {
  return root;
}

export function getStateFile(root = process.cwd()) {
  return path.join(getRoot(root), '.clude-recovery.json');
}

export function readState(root = process.cwd()) {
  try {
    return JSON.parse(fs.readFileSync(getStateFile(root), 'utf8'));
  } catch {
    return { bridgeEnabled: false };
  }
}

export function writeState(nextState, root = process.cwd()) {
  fs.writeFileSync(getStateFile(root), JSON.stringify(nextState, null, 2), 'utf8');
}

function readDotEnv(root = process.cwd()) {
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
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

function pickFirst(...values) {
  for (const value of values) {
    if (value && String(value).trim()) return String(value).trim();
  }
  return '';
}

function normalizeBaseUrl(baseUrl) {
  if (!baseUrl) return '';
  const clean = String(baseUrl).trim().replace(/\/$/, '');
  if (/\/v1$/i.test(clean)) return clean;
  return clean + '/v1';
}

export function getLocalModelConfig(root = process.cwd()) {
  const envFile = readDotEnv(root);
  const baseUrl = pickFirst(
    process.env.LOCAL_LLM_BASE_URL,
    envFile.LOCAL_LLM_BASE_URL,
    process.env.OPENAI_BASE_URL,
    envFile.OPENAI_BASE_URL,
    process.env.OPENAI_API_BASE,
    envFile.OPENAI_API_BASE,
    process.env.OLLAMA_BASE_URL,
    envFile.OLLAMA_BASE_URL,
    process.env.OLLAMA_HOST,
    envFile.OLLAMA_HOST
  );

  return {
    baseUrl: normalizeBaseUrl(baseUrl),
    model: pickFirst(
      process.env.LOCAL_LLM_MODEL,
      envFile.LOCAL_LLM_MODEL,
      process.env.OPENAI_MODEL,
      envFile.OPENAI_MODEL,
      process.env.OLLAMA_MODEL,
      envFile.OLLAMA_MODEL
    ),
    apiKey: pickFirst(
      process.env.LOCAL_LLM_API_KEY,
      envFile.LOCAL_LLM_API_KEY,
      process.env.OPENAI_API_KEY,
      envFile.OPENAI_API_KEY
    )
  };
}
