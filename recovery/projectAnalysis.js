import fs from 'node:fs/promises';
import path from 'node:path';

const SKIP_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.cache',
  'tmp', 'temp', '__pycache__', '.venv', 'venv', 'target', 'out', '.idea', '.vscode'
]);
const CODE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const IGNORE_ERR_CODES = new Set(['EPERM', 'EACCES', 'ENOENT', 'ENOTDIR', 'EBUSY']);

function clip(text, max = 30000) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '\n...[truncated]' : text;
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function shouldSkipDir(name) {
  const lower = name.toLowerCase();
  if (SKIP_DIRS.has(name) || SKIP_DIRS.has(lower)) return true;
  if (lower.startsWith('tmp') || lower.startsWith('temp')) return true;
  return false;
}

function isIgnorableFsError(error) {
  return IGNORE_ERR_CODES.has(error?.code);
}

async function safeReadDir(dir) {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (isIgnorableFsError(error)) return [];
    throw error;
  }
}

async function walk(rootDir) {
  const files = [];
  const dirs = [];
  const skipped = [];

  async function inner(dir) {
    dirs.push(dir);
    const entries = await safeReadDir(dir);
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (shouldSkipDir(entry.name)) {
          skipped.push(abs);
          continue;
        }
        await inner(abs);
      } else if (entry.isFile()) {
        files.push(abs);
      }
    }
  }

  await inner(rootDir);
  return { files, dirs, skipped };
}

function isTextCandidate(file) {
  const ext = path.extname(file).toLowerCase();
  return CODE_EXTS.has(ext) || ['.json', '.md', '.yml', '.yaml', '.txt', '.ps1', '.cmd', '.toml', '.java', '.kt', '.xml', '.properties', '.gradle'].includes(ext);
}

function sortObjectEntries(obj, limit = 20) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function parseImports(text) {
  const imports = [];
  const patterns = [
    /import\s+(?:[^'"\n]+?\s+from\s+)?['"]([^'"]+)['"]/g,
    /export\s+[^'"\n]*?from\s+['"]([^'"]+)['"]/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      imports.push(match[1]);
    }
  }
  return imports;
}

async function resolveRelativeImport(sourceFile, spec) {
  const sourceDir = path.dirname(sourceFile);
  const targetBase = path.resolve(sourceDir, spec);
  const candidates = [];

  if (path.extname(targetBase)) {
    candidates.push(targetBase);
  } else {
    for (const ext of ['.ts', '.tsx', '.js', '.jsx', '.json']) candidates.push(targetBase + ext);
    for (const ext of ['.ts', '.tsx', '.js', '.jsx', '.json']) candidates.push(path.join(targetBase, 'index' + ext));
  }

  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  return null;
}

async function readTextSafe(file) {
  try {
    return await fs.readFile(file, 'utf8');
  } catch (error) {
    if (isIgnorableFsError(error)) return '';
    return '';
  }
}

export async function analyzeProject(rootDir = process.cwd()) {
  const { files, dirs, skipped } = await walk(rootDir);
  const extCounts = {};
  const dirCounts = {};
  const todoMatches = [];
  const entrypoints = [];
  const missingImports = [];
  const missingBySpec = {};
  const missingByDir = {};

  for (const file of files) {
    const rel = path.relative(rootDir, file);
    const ext = path.extname(file).toLowerCase() || '<noext>';
    extCounts[ext] = (extCounts[ext] || 0) + 1;

    const top = rel.split(path.sep)[0] || '.';
    dirCounts[top] = (dirCounts[top] || 0) + 1;

    const lower = rel.toLowerCase();
    if (
      lower === 'package.json' ||
      lower === 'bunfig.toml' ||
      lower === 'tsconfig.json' ||
      lower === 'pom.xml' ||
      lower === 'build.gradle' ||
      lower === 'build.gradle.kts' ||
      /(^|\/)(main|index|setup|queryengine|agent|app|server)\.(ts|tsx|js|jsx|java|kt)$/.test(lower)
    ) {
      entrypoints.push(rel);
    }

    if (!isTextCandidate(file)) continue;
    const text = await readTextSafe(file);
    if (!text) continue;

    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      if (/\b(TODO|FIXME|XXX|HACK)\b/i.test(lines[i])) {
        todoMatches.push(`${rel}:${i + 1}: ${lines[i].trim()}`);
        if (todoMatches.length >= 100) break;
      }
    }

    if (CODE_EXTS.has(ext)) {
      const imports = parseImports(text);
      for (const spec of imports) {
        if (!spec.startsWith('.')) continue;
        const resolved = await resolveRelativeImport(file, spec);
        if (!resolved) {
          missingImports.push({ file: rel, spec });
          missingBySpec[spec] = (missingBySpec[spec] || 0) + 1;
          missingByDir[path.dirname(rel)] = (missingByDir[path.dirname(rel)] || 0) + 1;
          break;
        }
      }
    }
  }

  const packageJsonPath = path.join(rootDir, 'package.json');
  let packageJson = null;
  if (await exists(packageJsonPath)) {
    try {
      packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    } catch {
      packageJson = null;
    }
  }

  const findings = [];
  if (!packageJson) findings.push('package.json is missing or unreadable.');
  if (!(await exists(path.join(rootDir, 'tsconfig.json'))) && !(await exists(path.join(rootDir, 'pom.xml'))) && !(await exists(path.join(rootDir, 'build.gradle'))) && !(await exists(path.join(rootDir, 'build.gradle.kts')))) {
    findings.push('No obvious JS/TS or Java build manifest was found at the project root.');
  }
  if (missingImports.length > 0) findings.push(`There are ${missingImports.length} source files with broken relative imports.`);
  if (entrypoints.length === 0) findings.push('No obvious entrypoint files were detected.');
  if (skipped.length > 0) findings.push(`Skipped ${skipped.length} directories that looked temporary, generated, or not accessible.`);

  const plan = [
    'Phase 1: identify the real app type and primary entrypoint (web, CLI, backend, desktop, or mixed workspace).',
    'Phase 2: verify root manifests and runnable scripts, then lock one reproducible start command.',
    'Phase 3: repair missing imports, missing generated files, and compatibility shims in the smallest startup path first.',
    'Phase 4: isolate optional integrations behind lazy checks so they do not crash startup.',
    'Phase 5: run a smoke test for the main target (web dev server, desktop shell, or backend service).'
  ];

  return {
    rootDir,
    totals: {
      files: files.length,
      directories: dirs.length,
      skippedDirectories: skipped.length,
      codeFiles: files.filter(file => CODE_EXTS.has(path.extname(file).toLowerCase())).length,
      todoCount: todoMatches.length,
      brokenRelativeImportFiles: missingImports.length
    },
    package: packageJson ? {
      name: packageJson.name || null,
      version: packageJson.version || null,
      scripts: packageJson.scripts || {},
      dependencies: Object.keys(packageJson.dependencies || {}).length,
      devDependencies: Object.keys(packageJson.devDependencies || {}).length
    } : null,
    topExtensions: sortObjectEntries(extCounts, 15),
    topDirectories: sortObjectEntries(dirCounts, 15),
    entrypoints: Array.from(new Set(entrypoints)).sort().slice(0, 40),
    skippedDirectorySamples: skipped.slice(0, 30).map(item => path.relative(rootDir, item)),
    todoSamples: todoMatches.slice(0, 30),
    brokenImportSamples: missingImports.slice(0, 30),
    topBrokenImportSpecs: sortObjectEntries(missingBySpec, 20),
    topBrokenImportDirs: sortObjectEntries(missingByDir, 20),
    findings,
    plan
  };
}

export function renderAnalysisReport(report, { markdown = false } = {}) {
  if (markdown) {
    const lines = [];
    lines.push('# Project analysis');
    lines.push('');
    lines.push(`- Root: ${report.rootDir}`);
    lines.push(`- Files: ${report.totals.files}`);
    lines.push(`- Directories: ${report.totals.directories}`);
    lines.push(`- Skipped directories: ${report.totals.skippedDirectories}`);
    lines.push(`- Code files: ${report.totals.codeFiles}`);
    lines.push(`- Broken relative import files: ${report.totals.brokenRelativeImportFiles}`);
    lines.push('');
    if (report.package) {
      lines.push('## Package');
      lines.push('');
      lines.push(`- Name: ${report.package.name || '(none)'}`);
      lines.push(`- Version: ${report.package.version || '(none)'}`);
      lines.push(`- Dependencies: ${report.package.dependencies}`);
      lines.push(`- Dev dependencies: ${report.package.devDependencies}`);
      lines.push('');
      if (Object.keys(report.package.scripts).length) {
        lines.push('### Scripts');
        for (const [key, value] of Object.entries(report.package.scripts)) lines.push(`- ${key}: ${value}`);
        lines.push('');
      }
    }
    lines.push('## Findings');
    for (const finding of report.findings) lines.push(`- ${finding}`);
    lines.push('');
    lines.push('## Suggested plan');
    for (const item of report.plan) lines.push(`- ${item}`);
    lines.push('');
    if (report.entrypoints.length) {
      lines.push('## Entrypoints');
      for (const item of report.entrypoints) lines.push(`- ${item}`);
      lines.push('');
    }
    if (report.skippedDirectorySamples.length) {
      lines.push('## Skipped directories');
      for (const item of report.skippedDirectorySamples) lines.push(`- ${item}`);
      lines.push('');
    }
    if (report.brokenImportSamples.length) {
      lines.push('## Broken import samples');
      for (const item of report.brokenImportSamples) lines.push(`- ${item.file} -> ${item.spec}`);
      lines.push('');
    }
    return clip(lines.join('\n'), 50000);
  }

  const parts = [];
  parts.push('Project analysis');
  parts.push(`Root: ${report.rootDir}`);
  parts.push(`Files: ${report.totals.files} | Directories: ${report.totals.directories} | Skipped: ${report.totals.skippedDirectories} | Code files: ${report.totals.codeFiles}`);
  parts.push(`Broken relative import files: ${report.totals.brokenRelativeImportFiles}`);

  if (report.package) {
    parts.push('');
    parts.push('Package');
    parts.push(`- name: ${report.package.name || '(none)'}`);
    parts.push(`- version: ${report.package.version || '(none)'}`);
    parts.push(`- scripts: ${Object.keys(report.package.scripts).length}`);
  }

  parts.push('');
  parts.push('Main findings');
  for (const finding of report.findings) parts.push(`- ${finding}`);

  parts.push('');
  parts.push('Suggested plan');
  for (const item of report.plan) parts.push(`- ${item}`);

  if (report.entrypoints.length) {
    parts.push('');
    parts.push('Entrypoints');
    for (const item of report.entrypoints.slice(0, 15)) parts.push(`- ${item}`);
  }

  if (report.skippedDirectorySamples.length) {
    parts.push('');
    parts.push('Skipped directories');
    for (const item of report.skippedDirectorySamples.slice(0, 10)) parts.push(`- ${item}`);
  }

  if (report.brokenImportSamples.length) {
    parts.push('');
    parts.push('Broken import samples');
    for (const item of report.brokenImportSamples.slice(0, 12)) parts.push(`- ${item.file} -> ${item.spec}`);
  }

  return clip(parts.join('\n'), 22000);
}
