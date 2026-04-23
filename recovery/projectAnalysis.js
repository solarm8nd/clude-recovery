import fs from 'node:fs/promises';
import path from 'node:path';

const SKIP_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.cache',
  'tmp', 'temp', '__pycache__', '.venv', 'venv', 'target', 'out', '.idea', '.vscode'
]);

const IMPORT_CODE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const CODE_EXTS = new Set([
  ...IMPORT_CODE_EXTS,
  '.java', '.kt', '.kts', '.py', '.rb', '.php', '.cs', '.go', '.rs', '.c', '.cc', '.cpp', '.h', '.hpp', '.swift'
]);
const TEXT_EXTS = new Set([
  ...CODE_EXTS,
  '.json', '.md', '.yml', '.yaml', '.txt', '.ps1', '.cmd', '.toml', '.xml', '.properties',
  '.gradle', '.html', '.css', '.scss', '.ini', '.cfg', '.env'
]);
const MANIFEST_FILES = new Set([
  'package.json', 'tsconfig.json', 'bunfig.toml', 'pom.xml', 'build.gradle', 'build.gradle.kts',
  'requirements.txt', 'pyproject.toml', 'Cargo.toml', 'go.mod', 'composer.json', 'Gemfile',
  'settings.gradle', 'settings.gradle.kts'
]);
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
  const lower = String(name || '').toLowerCase();
  if (SKIP_DIRS.has(name) || SKIP_DIRS.has(lower)) return true;
  return lower.startsWith('tmp') || lower.startsWith('temp');
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
  return TEXT_EXTS.has(path.extname(file).toLowerCase());
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
    while ((match = pattern.exec(text)) !== null) imports.push(match[1]);
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
  } catch {
    return '';
  }
}

function detectEcosystems(relPath, text, packageJson) {
  const lower = relPath.toLowerCase();
  const hits = new Set();

  if (lower.endsWith('pom.xml') || lower.endsWith('.gradle') || lower.endsWith('.gradle.kts')) hits.add('java');
  if (lower.endsWith('package.json') || lower.endsWith('tsconfig.json') || lower.endsWith('bunfig.toml')) hits.add('node');
  if (lower.endsWith('pyproject.toml') || lower.endsWith('requirements.txt')) hits.add('python');
  if (lower.endsWith('cargo.toml')) hits.add('rust');
  if (lower.endsWith('go.mod')) hits.add('go');

  if (packageJson) {
    const deps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
    const keys = Object.keys(deps);
    if (keys.some(key => ['react', 'next', 'vite', 'electron', 'vue', 'svelte'].includes(key))) hits.add('node');
    if (deps.react) hits.add('react');
    if (deps.next) hits.add('nextjs');
    if (deps.vite) hits.add('vite');
    if (deps.electron) hits.add('electron');
  }

  if (/spring-boot|org\.springframework|springframework/i.test(text)) hits.add('spring');
  if (/electron/i.test(text)) hits.add('electron');
  if (/next\/?dist|next\.config/i.test(text)) hits.add('nextjs');
  if (/vite/i.test(text) && lower.includes('package.json')) hits.add('vite');
  if (/react/i.test(text) && lower.includes('package.json')) hits.add('react');

  return Array.from(hits);
}

function detectEntrypoint(rel) {
  const lower = rel.toLowerCase();
  return (
    lower === 'package.json' ||
    lower === 'pom.xml' ||
    lower === 'build.gradle' ||
    lower === 'build.gradle.kts' ||
    lower === 'requirements.txt' ||
    lower === 'pyproject.toml' ||
    lower === 'cargo.toml' ||
    /(^|\/)(main|index|setup|queryengine|agent|app|server|manage|cli|program)\.(ts|tsx|js|jsx|java|kt|py|go|rs|cs)$/i.test(lower)
  );
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
  const manifests = [];
  const ecosystems = new Set();

  for (const file of files) {
    const rel = path.relative(rootDir, file);
    const ext = path.extname(file).toLowerCase() || '<noext>';
    extCounts[ext] = (extCounts[ext] || 0) + 1;

    const top = rel.split(path.sep)[0] || '.';
    dirCounts[top] = (dirCounts[top] || 0) + 1;

    if (detectEntrypoint(rel)) entrypoints.push(rel);

    const basename = path.basename(file);
    const text = isTextCandidate(file) ? await readTextSafe(file) : '';

    if (MANIFEST_FILES.has(basename)) {
      let parsed = null;
      if (basename === 'package.json' && text) {
        try { parsed = JSON.parse(text); } catch {}
      }
      manifests.push({ path: rel, type: basename, packageName: parsed?.name || null, scripts: Object.keys(parsed?.scripts || {}).slice(0, 15) });
      for (const hit of detectEcosystems(rel, text, parsed)) ecosystems.add(hit);
    } else if (text) {
      for (const hit of detectEcosystems(rel, text, null)) ecosystems.add(hit);
    }

    if (!text) continue;

    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      if (/\b(TODO|FIXME|XXX|HACK)\b/i.test(lines[i])) {
        todoMatches.push(`${rel}:${i + 1}: ${lines[i].trim()}`);
        if (todoMatches.length >= 100) break;
      }
    }

    if (IMPORT_CODE_EXTS.has(ext)) {
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

  const rootManifestTypes = new Set(manifests.filter(item => !item.path.includes(path.sep)).map(item => item.type));
  const nestedManifestCount = manifests.filter(item => item.path.includes(path.sep)).length;
  const rootPackageManifest = manifests.find(item => item.path === 'package.json') || null;

  const findings = [];
  if (!rootManifestTypes.size) findings.push('No obvious build manifest was found at the repository root.');
  if (!rootPackageManifest && manifests.length > 0) findings.push(`Root package.json is missing, but ${manifests.length} manifest file(s) were detected under subdirectories.`);
  if (missingImports.length > 0) findings.push(`There are ${missingImports.length} source files with broken relative imports.`);
  if (entrypoints.length === 0) findings.push('No obvious entrypoint files were detected.');
  if (skipped.length > 0) findings.push(`Skipped ${skipped.length} directories that looked temporary, generated, or not accessible.`);
  if (ecosystems.size > 0) findings.push(`Detected stack signals: ${Array.from(ecosystems).sort().join(', ')}.`);

  const plan = [
    'Phase 1: pick the primary runnable target by checking detected manifests and entrypoints instead of assuming the repo root is the app root.',
    'Phase 2: lock one reproducible start path for that target (web, desktop, backend, or CLI).',
    'Phase 3: repair missing imports and generated files only in that startup path first.',
    'Phase 4: isolate optional integrations behind lazy checks so they do not crash startup.',
    'Phase 5: run a smoke test for the chosen target and document the exact command.'
  ];

  return {
    rootDir,
    totals: {
      files: files.length,
      directories: dirs.length,
      skippedDirectories: skipped.length,
      codeFiles: files.filter(file => CODE_EXTS.has(path.extname(file).toLowerCase())).length,
      todoCount: todoMatches.length,
      brokenRelativeImportFiles: missingImports.length,
      manifestFiles: manifests.length,
      nestedManifestFiles: nestedManifestCount
    },
    rootPackage: rootPackageManifest ? {
      name: rootPackageManifest.packageName || null,
      scripts: rootPackageManifest.scripts || []
    } : null,
    ecosystems: Array.from(ecosystems).sort(),
    manifests: manifests.slice(0, 80),
    topExtensions: sortObjectEntries(extCounts, 15),
    topDirectories: sortObjectEntries(dirCounts, 15),
    entrypoints: Array.from(new Set(entrypoints)).sort().slice(0, 60),
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
    lines.push(`- Manifest files: ${report.totals.manifestFiles}`);
    lines.push(`- Broken relative import files: ${report.totals.brokenRelativeImportFiles}`);
    lines.push('');
    if (report.rootPackage) {
      lines.push('## Root package');
      lines.push('');
      lines.push(`- Name: ${report.rootPackage.name || '(none)'}`);
      if (report.rootPackage.scripts.length) {
        lines.push('- Scripts:');
        for (const script of report.rootPackage.scripts) lines.push(`  - ${script}`);
      }
      lines.push('');
    }
    if (report.ecosystems.length) {
      lines.push('## Detected stack signals');
      lines.push('');
      for (const item of report.ecosystems) lines.push(`- ${item}`);
      lines.push('');
    }
    if (report.manifests.length) {
      lines.push('## Manifest files');
      lines.push('');
      for (const item of report.manifests.slice(0, 30)) {
        const label = item.packageName ? `${item.path} (${item.packageName})` : item.path;
        lines.push(`- ${label}`);
      }
      lines.push('');
    }
    lines.push('## Findings');
    for (const finding of report.findings) lines.push(`- ${finding}`);
    lines.push('');
    lines.push('## Suggested plan');
    for (const item of report.plan) lines.push(`- ${item}`);
    lines.push('');
    if (report.entrypoints.length) {
      lines.push('## Entrypoints');
      for (const item of report.entrypoints.slice(0, 30)) lines.push(`- ${item}`);
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
  parts.push(`Manifest files: ${report.totals.manifestFiles} | Broken relative import files: ${report.totals.brokenRelativeImportFiles}`);

  if (report.ecosystems.length) {
    parts.push('');
    parts.push(`Detected stack signals: ${report.ecosystems.join(', ')}`);
  }

  if (report.manifests.length) {
    parts.push('');
    parts.push('Manifest files');
    for (const item of report.manifests.slice(0, 15)) {
      const label = item.packageName ? `${item.path} (${item.packageName})` : item.path;
      parts.push(`- ${label}`);
    }
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
