import { getLocalModelConfig } from './config.js';

export function isLocalModelConfigured(root = process.cwd()) {
  const cfg = getLocalModelConfig(root);
  return Boolean(cfg.baseUrl && cfg.model);
}

function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/$/, '');
}

export async function callLocalModel(messages, systemPrompt, root = process.cwd()) {
  const cfg = getLocalModelConfig(root);
  if (!cfg.baseUrl || !cfg.model) {
    throw new Error('LOCAL_LLM_BASE_URL or LOCAL_LLM_MODEL is not set.');
  }

  const url = normalizeBaseUrl(cfg.baseUrl) + '/chat/completions';
  const headers = { 'content-type': 'application/json' };
  if (cfg.apiKey) headers.authorization = `Bearer ${cfg.apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ]
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(JSON.stringify(data));
  return data?.choices?.[0]?.message?.content || '';
}
