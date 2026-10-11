// Publish an owner-approved build to the gh-pages testing site and verify it live.
//   node scripts/publish-gh-pages.mjs [ref]        (default ref: origin/feature/galaxy-math-foundation)
//   node scripts/publish-gh-pages.mjs --verify      (only verify the current live site against origin/gh-pages)
//   add --skip-browser to stop after the byte-for-byte check; then run LIVE_URL=... npm run test:browser on its own
// Steps: unit tests → merge <ref> into gh-pages (never force-push) → push → wait for the Pages build of that
// commit → compare every app file on the public URL with the commit → run the browser suite on the public URL.
// Needs a GitHub token from `git credential fill` (the same login git push uses). No dependencies.
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'bazeocrisy/Galaxy-Math';
const LIVE_URL = 'https://bazeocrisy.github.io/Galaxy-Math/';
const APP_FILES = /^(index\.html|css\/.+|js\/.+|assets\/.+)$/;
const verifyOnly = process.argv.includes('--verify');
const skipBrowser = process.argv.includes('--skip-browser');
const ref = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'origin/feature/galaxy-math-foundation';

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const npm = (script, env = {}) => execSync(`npm ${script}`, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const die = (msg) => { console.error(`\nPUBLISH STOPPED: ${msg}`); process.exit(1); };

function token() {
  const out = execFileSync('git', ['credential', 'fill'], { input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf8' });
  const t = out.match(/^password=(.+)$/m)?.[1];
  if (!t) die('no GitHub credential available from `git credential fill`.');
  return t;
}
async function api(p) {
  const r = await fetch(`https://api.github.com/repos/${REPO}${p}`, { headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json' } });
  if (!r.ok) die(`GitHub API ${p} → ${r.status} ${await r.text()}`);
  return r.json();
}
const TOKEN = token();

git('fetch', 'origin', '--prune');
const pages = await api('/pages');
if (pages.source?.branch !== 'gh-pages' || pages.source?.path !== '/') die(`Pages source is ${JSON.stringify(pages.source)}, expected gh-pages at /.`);

let published = git('rev-parse', 'origin/gh-pages');
if (!verifyOnly) {
  const sha = git('rev-parse', `${ref}^{commit}`);
  console.log(`Publishing ${ref} (${sha.slice(0, 7)}) to gh-pages (currently ${published.slice(0, 7)})`);
  npm('test');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gm-publish-'));
  try {
    git('worktree', 'add', '--detach', dir, 'origin/gh-pages');
    const wt = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
    let already = false;
    try { wt('merge-base', '--is-ancestor', sha, 'HEAD'); already = true; console.log('Already on gh-pages; nothing to merge.'); } catch { /* needs merge */ }
    if (!already) {
      wt('merge', '--no-ff', '-m', `publish: ${ref.replace(/^origin\//, '')} ${sha.slice(0, 7)} to gh-pages testing site`, sha);
      if (!fs.existsSync(path.join(dir, '.nojekyll'))) { fs.writeFileSync(path.join(dir, '.nojekyll'), ''); wt('add', '.nojekyll'); wt('commit', '-m', 'chore: keep .nojekyll for GitHub Pages'); }
      wt('push', 'origin', 'HEAD:gh-pages');
    }
    published = wt('rev-parse', 'HEAD');
  } finally {
    try { git('worktree', 'remove', '--force', dir); } catch { /* ignore */ }
  }
}
console.log(`gh-pages commit to verify: ${published}`);

// Wait for the Pages build of that exact commit.
for (let i = 0; ; i++) {
  const b = await api('/pages/builds/latest');
  if (b.commit === published && b.status === 'built') { console.log(`Pages build ${b.status} for ${b.commit.slice(0, 7)} at ${b.updated_at}`); break; }
  if (b.commit === published && b.status === 'errored') die(`Pages build errored: ${b.error?.message}`);
  if (i >= 60) die(`Pages build for ${published.slice(0, 7)} not finished after 10 minutes (latest: ${b.commit?.slice(0, 7)} ${b.status}).`);
  await sleep(10000);
}

// Every app file on the public site must match the commit byte-for-byte (retry while the CDN catches up).
const files = git('ls-tree', '-r', '--name-only', published).split('\n').filter((f) => APP_FILES.test(f));
for (let i = 0; ; i++) {
  const diff = [];
  for (const f of files) {
    const live = Buffer.from(await (await fetch(`${LIVE_URL}${f}?v=${Date.now()}`, { cache: 'no-store' })).arrayBuffer());
    const want = execFileSync('git', ['show', `${published}:${f}`], { cwd: ROOT, maxBuffer: 64 << 20 });
    if (!live.equals(want)) diff.push(f);
  }
  if (!diff.length) { console.log(`Live files match ${published.slice(0, 7)}: ${files.join(', ')}`); break; }
  if (i >= 30) die(`live files still differ after 5 minutes: ${diff.join(', ')}`);
  await sleep(10000);
}

if (skipBrowser) console.log(`Browser suite skipped. Run it next: LIVE_URL=${LIVE_URL} npm run test:browser`);
else npm('run test:browser', { LIVE_URL });
console.log(`\nPublished and verified: ${LIVE_URL} serves gh-pages ${published}`);
