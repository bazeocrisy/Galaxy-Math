// Navigation screenshots for owner/UX review: the home page and both subject menus at the six review widths
// (viewport only, plus a full-page shot so the space below the content is visible).
// Run: node tests/review-shots-nav.mjs <outDir> [widths, e.g. 390,1280]
import fs from 'node:fs';
import path from 'node:path';
import { startServer, startBrowser, BASE } from './lib/harness.mjs';

const OUT = process.argv[2] || 'review-shots-nav';
const SIZES = { 320: 640, 375: 812, 390: 844, 768: 1024, 1280: 800, 1366: 768 };
const widths = (process.argv[3] || '320,375,390,768,1280,1366').split(',').map(Number);
fs.mkdirSync(OUT, { recursive: true });
const server = await startServer();
const b = await startBrowser();
const URL = server.origin + BASE;
const J = JSON.stringify;
const go = async (h) => { await b.js(`if (location.hash === ${J(h)}) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = ${J(h)};`); await b.wait(350); };
const shot = async (w, name) => { await b.wait(150); await b.shot(path.join(OUT, `${w}-${name}.jpg`), true); };
const failures = [];
try {
  for (const w of widths) {
    await b.viewport(w, SIZES[w]);
    await b.load(URL); await b.js('localStorage.clear();'); await b.load(URL);
    await b.js(`window.__galaxy.rootStore.recordLesson('equal-groups', 3, true);`);
    await go('#/'); await shot(w, '1-home');
    await go('#/multiplication'); await shot(w, '2-multiplication-menu');
    await go('#/division'); await shot(w, '3-division-menu');
    console.log(`${w}: done`);
  }
  failures.push(...b.errors);
} catch (e) { failures.push(String(e)); } finally { b.close(); server.close(); }
console.log(failures.length ? `ERRORS ${J(failures)}` : 'no page errors');
process.exit(failures.length ? 1 : 0);
