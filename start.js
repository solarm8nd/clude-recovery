#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = __dirname;
const TOP_LEVEL_SOURCE_DIRS = [
  'assistant','bootstrap','bridge','buddy','commands','components','constants','context','coordinator','entrypoints','hooks','ink','keybindings','outputStyles','query','remote','schemas','server','services','skills','state','tasks','tools','types','utils'
];

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function walk(dir, exts, limit = Infinity) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries = [];
    try { entries = fs.readdirSync(cur, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        stack.push(full);
      } else if (!exts || exts.some(ext => entry.name.endsWith(ext))) {
        out.push(full);
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

function countFiles() {
  return walk(ROOT, ['.ts', '.tsx', '.js', '.json', '.md']).length;
}

function listCommandNames() {
  const commandsDir = path.join(ROOT, 'commands');
  if (!exists(commandsDir)) return [];
  return fs.readdirSync(commandsDir, { withFileTypes: true })
    .filter(x => x.isDirectory() || x.name.endsWith('.ts') || x.name.endsWith('.tsx') || x.name.endsWith('.js'))
    .map(x => x.name)
    .sort();
}

function listTopLevel() {
  return fs.readdirSync(ROOT, { withFileTypes: true })
    .map(x => `${x.isDirectory() ? '[DIR]' : '[FILE]'} ${x.name}`)
    .sort();
}

function readPreview(relPath, lines = 80) {
  const full = path.resolve(ROOT, relPath);
  if (!full.startsWith(ROOT)) {
    return 'Refusing to read outside project root.';
  }
  if (!exists(full)) return `Not found: ${relPath}`;
  if (fs.statSync(full).isDirectory()) return `${relPath} is a directory.`;
  const text = fs.readFileSync(full, 'utf8');
  return text.split(/\r?\n/).slice(0, lines).join('\n');
}

function searchText(term, limit = 20) {
  const files = walk(ROOT, ['.ts', '.tsx', '.js', '.json', '.md']);
  const results = [];
  const needle = term.toLowerCase();
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(needle)) {
        results.push(`${rel}:${i + 1}: ${lines[i].trim()}`);
        if (results.length >= limit) return results;
      }
    }
  }
  return results;
}

function getDoctorReport() {
  const checks = [];
  const requiredDirs = TOP_LEVEL_SOURCE_DIRS.filter(name => exists(path.join(ROOT, name)));
  const missingDirs = TOP_LEVEL_SOURCE_DIRS.filter(name => !exists(path.join(ROOT, name)));
  const cmdCount = listCommandNames().length;
  const codeFiles = walk(ROOT, ['.ts', '.tsx', '.js']).length;
  checks.push(`Project root: ${ROOT}`);
  checks.push(`Code files discovered: ${codeFiles}`);
  checks.push(`Command entries discovered: ${cmdCount}`);
  checks.push(`Top-level source folders present: ${requiredDirs.length}`);
  if (missingDirs.length) checks.push(`Top-level source folders missing: ${missingDirs.slice(0, 12).join(', ')}${missingDirs.length > 12 ? ', ...' : ''}`);
  checks.push(`package.json present: ${exists(path.join(ROOT, 'package.json')) ? 'yes' : 'no'}`);
  checks.push(`tsconfig.json present: ${exists(path.join(ROOT, 'tsconfig.json')) ? 'yes' : 'no'}`);
  checks.push('Runtime mode: recovery launcher');
  checks.push('Note: the original upstream build pipeline is incomplete in this archive, so this launcher provides a working terminal entrypoint for inspection and navigation.');
  return checks.join('\n');
}

function printBanner() {
  const banner = [
    'clude local recovery terminal',
    '--------------------------------',
    `root      : ${ROOT}`,
    `files     : ${countFiles()}`,
    `commands  : ${listCommandNames().length}`,
    '',
    'Type /help for commands.'
  ].join('\n');
  console.log(banner);
}

function showHelp() {
  console.log([
    '',
    'Available commands:',
    '  /help                 Show this help.',
    '  /doctor               Print environment and project diagnostics.',
    '  /commands             List discovered command folders/files.',
    '  /tree                 List top-level files and directories.',
    '  /read <path>          Preview the first lines of a file.',
    '  /search <text>        Search the source tree.',
    '  /pwd                  Print project root.',
    '  /exit                 Quit.',
    ''
  ].join('\n'));
}

function runNonInteractive(args) {
  if (args.includes('--doctor')) {
    console.log(getDoctorReport());
    return 0;
  }
  if (args.includes('--commands')) {
    console.log(listCommandNames().join('\n'));
    return 0;
  }
  return null;
}

const quickExit = runNonInteractive(process.argv.slice(2));
if (quickExit !== null) process.exit(quickExit);

printBanner();
showHelp();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'clude> '
});

rl.prompt();
rl.on('line', line => {
  const input = line.trim();
  if (!input) {
    rl.prompt();
    return;
  }
  if (input === '/exit') {
    rl.close();
    return;
  }
  if (input === '/help') {
    showHelp();
  } else if (input === '/doctor') {
    console.log(getDoctorReport());
  } else if (input === '/commands') {
    const cmds = listCommandNames();
    console.log(cmds.length ? cmds.join('\n') : 'No commands directory found.');
  } else if (input === '/tree') {
    console.log(listTopLevel().join('\n'));
  } else if (input === '/pwd') {
    console.log(ROOT);
  } else if (input.startsWith('/read ')) {
    console.log(readPreview(input.slice(6).trim()));
  } else if (input.startsWith('/search ')) {
    const results = searchText(input.slice(8).trim());
    console.log(results.length ? results.join('\n') : 'No matches found.');
  } else {
    console.log('Unknown command. Type /help.');
  }
  rl.prompt();
});

rl.on('close', () => {
  console.log('Bye.');
  process.exit(0);
});
