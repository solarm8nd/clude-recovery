import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else files.push(full);
  }
}
walk(path.join(root, 'src'));

const codeFiles = files.filter((f) => /\.(ts|tsx|js|jsx)$/.test(f));
let bunShimImports = 0;
let brokenRelativeImports = 0;
const brokenSamples = [];
const bareImports = new Map();

function existsLike(base, spec) {
  const abs = path.resolve(path.dirname(base), spec);
  const tries = [
    abs, `${abs}.ts`, `${abs}.tsx`, `${abs}.js`, `${abs}.jsx`,
    path.join(abs, 'index.ts'), path.join(abs, 'index.tsx'),
    path.join(abs, 'index.js'), path.join(abs, 'index.jsx')
  ];
  return tries.some((p) => fs.existsSync(p));
}

for (const file of codeFiles) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes('src/shims/bun-bundle.js')) bunShimImports++;
  const regex = /(?:import|export)\s+(?:[^'"]+?\s+from\s+)?['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const m of text.matchAll(regex)) {
    const spec = m[1] || m[2];
    if (!spec) continue;
    if (spec.startsWith('.')) {
      if (!existsLike(file, spec)) {
        brokenRelativeImports++;
        if (brokenSamples.length < 20) brokenSamples.push({ file: path.relative(root, file), spec });
      }
    } else if (!spec.startsWith('src/') && !spec.startsWith('node:') && !/^(fs|path|os|crypto|child_process|util|http|https|url|stream|events|net|tls|dns|buffer|process|async_hooks|perf_hooks|zlib|v8|tty|readline|inspector)$/.test(spec)) {
      const pkg = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
      bareImports.set(pkg, (bareImports.get(pkg) || 0) + 1);
    }
  }
}

const smoke = spawnSync(process.execPath, ['scripts/source-smoke.js', '--json'], { cwd: root, encoding: 'utf8', timeout: 20000 });
let smokeJson = null;
try {
  smokeJson = JSON.parse(smoke.stdout || '{}');
} catch {}

const report = {
  checkedAt: new Date().toISOString(),
  files: codeFiles.length,
  bunShimImports,
  brokenRelativeImports,
  brokenSamples,
  topBareImports: [...bareImports.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30),
  smoke: smokeJson || {
    ok: false,
    parseError: true,
    stdout: smoke.stdout,
    stderr: smoke.stderr
  }
};

fs.writeFileSync(path.join(root, 'source-doctor.json'), JSON.stringify(report, null, 2));

const md = [
  '# Source Doctor',
  '',
  `Checked at: ${report.checkedAt}`,
  '',
  `- Code files scanned: **${report.files}**`,
  `- bun compatibility imports patched: **${report.bunShimImports}**`,
  `- unresolved relative imports found by static scan: **${report.brokenRelativeImports}**`,
  '',
  '## Smoke test',
  '',
  '```json',
  JSON.stringify(report.smoke, null, 2),
  '```',
  '',
  '## Top bare imports',
  '',
  ...report.topBareImports.map(([name, count]) => `- \`${name}\`: ${count}`),
  '',
  '## Sample unresolved relative imports',
  '',
  ...report.brokenSamples.map((x) => `- \`${x.file}\` -> \`${x.spec}\``)
].join('\n');
fs.writeFileSync(path.join(root, 'SOURCE-DOCTOR.md'), md);
console.log(JSON.stringify(report, null, 2));
