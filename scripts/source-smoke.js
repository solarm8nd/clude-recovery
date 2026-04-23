import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const tsxBin = fs.existsSync(path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx'))
  ? path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx')
  : null;

function trim(s, n = 1200) {
  s = s || '';
  return s.length > n ? s.slice(0, n) + '\n...[truncated]' : s;
}

function run(args, timeoutMs = 10000) {
  const cmd = tsxBin || 'npx';
  const finalArgs = tsxBin ? args : ['--yes', 'tsx', ...args];
  const res = spawnSync(cmd, finalArgs, {
    cwd: root,
    encoding: 'utf8',
    timeout: timeoutMs,
    killSignal: 'SIGKILL',
    shell: false
  });
  return {
    ok: res.status === 0 && !res.signal,
    timedOut: res.signal === 'SIGTERM' || res.signal === 'SIGKILL' || /ETIMEDOUT/i.test(String(res.error || '')),
    code: res.status,
    signal: res.signal,
    stdout: trim(res.stdout, 4000),
    stderr: trim(res.stderr, 4000),
    error: res.error ? String(res.error) : ''
  };
}

function runImport(specifier, timeoutMs = 8000) {
  const snippet = `import(${JSON.stringify(specifier)}).then(() => { console.log("IMPORT_OK"); }).catch((err) => { console.error(err?.stack || err?.message || String(err)); process.exit(1); });`;
  return run(['-e', snippet], timeoutMs);
}

const wantHelp = process.argv.includes('--help');
const onlyMain = process.argv.includes('--main');
const jsonMode = process.argv.includes('--json');

const modules = [
  'src/commands.ts',
  'src/tools.ts',
  'src/services/mcp/client.ts',
  'src/skills/bundled/index.ts'
];

const results = {};
if (!onlyMain) {
  for (const mod of modules) {
    results[mod] = runImport('./' + mod, 8000);
  }
}
const mainArgs = wantHelp ? ['src/main.tsx', '--help'] : ['src/main.tsx'];
const main = run(mainArgs, wantHelp ? 12000 : 8000);
const payload = {
  checkedAt: new Date().toISOString(),
  command: wantHelp ? 'src/main.tsx --help' : 'src/main.tsx',
  main,
  modules: results
};
console.log(jsonMode ? JSON.stringify(payload, null, 2) : `source smoke test\n${JSON.stringify(payload, null, 2)}`);
