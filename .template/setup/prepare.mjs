/**
 * `prepare` — runs on every `pnpm install` (or by hand: `pnpm prepare`).
 * Pure Node, no shell syntax — works the same in cmd, PowerShell, Git Bash,
 * macOS, Linux. Never fails the install: every problem becomes a one-line hint.
 *
 * 1. Fresh copy of the template (degit / zip, no commits yet) → your project:
 *    package.json gets the folder name and v1.0.0, projectConfig.name and the
 *    SEO title follow, the template's deploy URL is reset, its LICENSE goes.
 *    Works in any order: before or after `git init`, before or after install.
 * 2. Git hooks (husky) once dependencies are installed and a git repo exists.
 */

import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEMPLATE_NAME = 'next-template';
const TEMPLATE_TITLE = 'Next Template';
const say = (icon, text) => console.log(`  ${icon} ${text}`);
const edit = (file, fn) => {
  if (!existsSync(file)) return;
  const before = readFileSync(file, 'utf8');
  const after = fn(before);
  if (after !== before) writeFileSync(file, after);
};

// Always operate on the project root, whatever the cwd (paths below are relative).
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
process.chdir(ROOT);

/** THIS folder is a git repo root with commits (a copy inside another repo is not). */
const hasCommits = () => {
  try {
    const top = execSync('git rev-parse --show-toplevel', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    if (resolve(top) !== ROOT) return false;
    execSync('git rev-parse --verify HEAD', { stdio: 'ignore' });
    return true;
  } catch {
    return false; // no git, no repo, or `git init` without a commit yet
  }
};

// CI / Vercel build the template repo itself (Vercel ships no .git) — never rename it there.
const isCi = Boolean(process.env.CI || process.env.VERCEL);

// ── 1. Fresh copy → own project ──────────────────────────────

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

if (pkg.name === TEMPLATE_NAME && !isCi && !hasCommits()) {
  const folder = basename(ROOT);
  // npm name: lowercase ASCII, no leading dot/underscore, no edge dashes —
  // a non-Latin folder ("Мой сайт") falls back to my-app.
  const projectName =
    folder
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^[._-]+|[-.]+$/g, '') || 'my-app';

  // Human title for <title>/OG from the folder as typed: my-shop → My Shop,
  // "Мой сайт" → Мой Сайт.
  const projectTitle =
    folder
      .split(/[-._\s]+/)
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(' ') || 'My App';

  pkg.name = projectName;
  pkg.version = '1.0.0';
  delete pkg.description;
  delete pkg.author;
  delete pkg.license;
  delete pkg.repository;
  writeFileSync('package.json', `${JSON.stringify(pkg, null, 2)}\n`);
  rmSync('LICENSE', { force: true });

  edit('src/configs/project.ts', (s) =>
    s.replace(`name: '${TEMPLATE_NAME}'`, `name: '${projectName}'`),
  );
  for (const locale of existsSync('src/messages') ? readdirSync('src/messages') : []) {
    edit(join('src/messages', locale, 'metadata.json'), (s) =>
      s.replaceAll(TEMPLATE_TITLE, projectTitle),
    );
  }
  edit('.env.production', (s) =>
    s.replace(/^NEXT_PUBLIC_CLIENT_URL=.*$/m, 'NEXT_PUBLIC_CLIENT_URL=https://example.com'),
  );

  console.log('');
  say('✓', `Project "${projectName}" initialized (package.json v1.0.0, title "${projectTitle}")`);
  say('→', 'Set your domain: NEXT_PUBLIC_CLIENT_URL in .env.production');
  say('→', 'Start building: pnpm dev · new page: pnpm page about --nav');
}

// ── 2. Git hooks ─────────────────────────────────────────────

if (!existsSync('node_modules/husky')) {
  say('→', 'Dependencies not installed yet — run: pnpm install');
} else if (!existsSync('.git')) {
  say('→', 'No git repo yet — run: git init && pnpm prepare  (enables the git hooks)');
} else {
  const { default: husky } = await import('husky');
  // '' = installed; otherwise a reason (e.g. "HUSKY=0 skip install")
  const message = husky();
  say(
    message ? '−' : '✓',
    message ? `Git hooks: ${message}` : 'Git hooks enabled (pre-commit, commit-msg, pre-push)',
  );
}
