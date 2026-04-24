import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  analyzeProject,
  doctor,
  featureApi,
  listDir,
  planProject,
  readTextFile,
  runShell,
  safeResolve,
  searchFiles,
  writeTextFile,
  writeAnalysisFiles
} from './recovery/tools.js';
import { callLocalModel, isLocalModelConfigured } from './recovery/localModel.js';
import { answerOfflineQuery } from './recovery/offlineAgent.js';

const rl = readline.createInterface({ input, output, terminal: true });
let cwd = process.cwd();
let history = [];
const MAX_STEPS = 8;
let shouldExit = false;
let readlineClosed = false;

rl.on('close', () => {
  readlineClosed = true;
  shouldExit = true;
});

rl.on('SIGINT', () => {
  console.log('\nInterrupted. The agent is still running. Use /exit to close it cleanly.\n');
});

function banner() {
  console.log(`
clude recovered agent
cwd: ${cwd}

slash commands:
  /help
  /exit
  /pwd
  /cd <path>
  /ls [path]
  /read <file>
  /search <text> [path]
  /shell <command>
  /doctor
  /analyze [path]
  /plan [path]
  /chrome status|start|native-host
  /computer status|start
  /bridge status|enable|disable

natural language:
  - if LOCAL_LLM_BASE_URL and LOCAL_LLM_MODEL are set, the agent will use your local model
  - otherwise the agent still works in offline recovery mode for project analysis and file inspection
`);
}

function extractJson(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  try { return JSON.parse(trimmed); } catch {}
  const block = trimmed.match(/```json\s*([\s\S]*?)```/i);
  if (block) {
    try { return JSON.parse(block[1].trim()); } catch {}
  }
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try { return JSON.parse(trimmed.slice(first, last + 1)); } catch {}
  }
  return null;
}

function systemPrompt() {
  return `You are a terminal coding agent inside a recovered project.
Current working directory: ${cwd}
Respond with exactly one JSON object.
Allowed forms:
{"type":"answer","text":"..."}
{"type":"shell","command":"..."}
{"type":"read","path":"..."}
{"type":"write","path":"...","content":"..."}
{"type":"list","path":"..."}
{"type":"search","query":"...","path":"..."}
{"type":"cd","path":"..."}
{"type":"doctor"}
{"type":"analyze","path":"..."}
{"type":"plan","path":"..."}
Use small safe steps. Prefer inspection before modification.`;
}

function normalizeBareCommand(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('/')) {
    if (trimmed === 'pwd') return '/pwd';
    if (trimmed === 'ls') return '/ls';
    if (trimmed === 'doctor') return '/doctor';
    if (trimmed === 'analyze') return '/analyze';
    if (trimmed === 'plan') return '/plan';
    if (trimmed.startsWith('cd ')) return '/cd ' + trimmed.slice(3);
    if (trimmed.startsWith('read ')) return '/read ' + trimmed.slice(5);
    if (trimmed.startsWith('search ')) return '/search ' + trimmed.slice(7);
    if (trimmed.startsWith('shell ')) return '/shell ' + trimmed.slice(6);
  }
  return trimmed;
}

function splitPastedCommands(line) {
  const normalized = line.replace(/\r/g, '');
  if (normalized.includes('\n')) {
    return normalized.split('\n').map(item => item.trim()).filter(Boolean);
  }
  return [normalized.trim()].filter(Boolean);
}

async function runModelBackedAgent(userText) {
  let messages = [...history, { role: 'user', content: userText }];
  for (let step = 0; step < MAX_STEPS; step += 1) {
    const raw = await callLocalModel(messages, systemPrompt(), cwd);
    const action = extractJson(raw);

    if (!action || !action.type) {
      console.log(`\nassistant:\n${raw}\n`);
      history = [...messages, { role: 'assistant', content: raw }];
      return;
    }

    if (action.type === 'answer') {
      console.log(`\nassistant:\n${action.text || ''}\n`);
      history = [...messages, { role: 'assistant', content: JSON.stringify(action) }];
      return;
    }

    let result = '';
    try {
      if (action.type === 'shell') result = await runShell(cwd, action.command || '');
      else if (action.type === 'read') result = await readTextFile(cwd, action.path || '');
      else if (action.type === 'write') result = await writeTextFile(cwd, action.path || '', action.content || '');
      else if (action.type === 'list') result = await listDir(cwd, action.path || '.');
      else if (action.type === 'search') result = await searchFiles(cwd, action.query || '', action.path || '.');
      else if (action.type === 'cd') {
        cwd = safeResolve(cwd, action.path || '.');
        result = `cwd changed to ${cwd}`;
      } else if (action.type === 'doctor') result = doctor(cwd);
      else if (action.type === 'analyze') result = await analyzeProject(cwd, action.path || '.');
      else if (action.type === 'plan') result = await planProject(cwd, action.path || '.');
      else result = `Unknown action type: ${action.type}`;
    } catch (error) {
      result = `Action failed: ${error?.message || String(error)}`;
    }

    messages.push({ role: 'assistant', content: JSON.stringify(action) });
    messages.push({ role: 'user', content: `Tool result:\n${result}\nContinue.` });
  }

  console.log('\nassistant:\nReached max tool steps without a final answer.\n');
  history = messages;
}

async function runAgent(userText) {
  if (!isLocalModelConfigured(cwd)) {
    const answer = await answerOfflineQuery(cwd, userText);
    console.log(`\nassistant:\n${answer}\n`);
    return;
  }
  await runModelBackedAgent(userText);
}

async function handleFeatureCommand(parts) {
  const [group, action] = parts;
  if (group === '/chrome') {
    if (action === 'status') console.log(JSON.stringify(featureApi.chrome.getStatus(cwd), null, 2));
    else if (action === 'start') console.log(JSON.stringify(featureApi.chrome.startChromeMcp(cwd), null, 2));
    else if (action === 'native-host') console.log(JSON.stringify(featureApi.chrome.startChromeNativeHost(cwd), null, 2));
    else console.log('usage: /chrome status|start|native-host');
    return true;
  }
  if (group === '/computer') {
    if (action === 'status') console.log(JSON.stringify(featureApi.computer.getStatus(cwd), null, 2));
    else if (action === 'start') console.log(JSON.stringify(featureApi.computer.startComputerUseMcp(cwd), null, 2));
    else console.log('usage: /computer status|start');
    return true;
  }
  if (group === '/bridge') {
    if (action === 'status') console.log(JSON.stringify(featureApi.bridge.getStatus(cwd), null, 2));
    else if (action === 'enable') console.log(JSON.stringify(featureApi.bridge.setEnabled(true, cwd), null, 2));
    else if (action === 'disable') console.log(JSON.stringify(featureApi.bridge.setEnabled(false, cwd), null, 2));
    else console.log('usage: /bridge status|enable|disable');
    return true;
  }
  return false;
}

async function handleSlash(line) {
  const parts = line.trim().split(' ');
  const cmd = parts[0];
  const rest = parts.slice(1).join(' ').trim();
  if (await handleFeatureCommand(parts.slice(0, 2))) return;

  try {
    switch (cmd) {
      case '/help':
        banner();
        break;
      case '/exit':
        shouldExit = true;
        await rl.close();
        return;
      case '/pwd':
        console.log(cwd);
        break;
      case '/cd':
        cwd = safeResolve(cwd, rest || '.');
        console.log(cwd);
        break;
      case '/ls':
        console.log(await listDir(cwd, rest || '.'));
        break;
      case '/read':
        console.log(await readTextFile(cwd, rest));
        break;
      case '/search': {
        let query = rest;
        let searchPath = '.';
        if (rest.includes(' | ')) {
          const split = rest.split(' | ');
          query = split[0] || '';
          searchPath = split[1] || '.';
        } else {
          const tokens = rest.split(/\s+/).filter(Boolean);
          if (tokens.length > 1) {
            query = tokens[0];
            searchPath = tokens.slice(1).join(' ');
          }
        }
        console.log(await searchFiles(cwd, query || '', searchPath || '.'));
        break;
      }
      case '/shell':
        console.log(await runShell(cwd, rest));
        break;
      case '/doctor':
        console.log(doctor(cwd));
        break;
      case '/analyze': {
        const target = rest || '.';
        const summary = await analyzeProject(cwd, target);
        console.log(summary);
        const written = await writeAnalysisFiles(cwd, target);
        console.log(`\nSaved analysis files:\n- ${written.markdown}\n- ${written.json}`);
        break;
      }
      case '/plan': {
        const target = rest || '.';
        console.log(await planProject(cwd, target));
        break;
      }
      default:
        console.log('Unknown command. Use /help');
    }
  } catch (error) {
    if (error?.code === 'ABORT_ERR' || error?.code === 'ERR_USE_AFTER_CLOSE') {
      if (readlineClosed) return;
      console.log('\nInterrupted. The agent is still running. Use /exit to close it cleanly.\n');
      return;
    }
    console.log(`error: ${error?.message || String(error)}`);
  }
}

async function processInput(rawLine) {
  for (const item of splitPastedCommands(rawLine)) {
    const line = normalizeBareCommand(item);
    if (!line) continue;
    if (line.startsWith('/')) await handleSlash(line);
    else {
      try {
        await runAgent(line);
      } catch (error) {
        console.log(`\nagent error:\n${error?.message || String(error)}\n`);
      }
    }
    if (shouldExit || readlineClosed) break;
  }
}

async function main() {
  banner();
  while (!shouldExit && !readlineClosed) {
    let line = '';
    try {
      line = await rl.question('clude> ');
    } catch (error) {
      if (error?.code === 'ABORT_ERR' || error?.code === 'ERR_USE_AFTER_CLOSE') {
        if (readlineClosed) break;
        console.log('\nInterrupted. The agent is still running. Use /exit to close it cleanly.\n');
        continue;
      }
      throw error;
    }
    if (!line.trim()) continue;
    await processInput(line);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
