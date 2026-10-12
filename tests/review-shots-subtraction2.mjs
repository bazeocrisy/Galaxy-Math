// Subtraction 2.0 screenshots for owner/QA review at the six review widths: the menu, every Math Thinking Lab kind (A–L),
// Lab feedback and report, Flashcards (card, answer, See the regrouping, summary), Parent Settings and Progress.
// Run: node tests/review-shots-subtraction2.mjs <outDir> [widths, e.g. 390,1280]
import fs from 'node:fs';
import path from 'node:path';
import { startServer, startBrowser, BASE } from './lib/harness.mjs';

const OUT = process.argv[2] || 'review-shots-subtraction2';
const SIZES = { 320: 640, 375: 812, 390: 844, 768: 1024, 1280: 800, 1366: 768 };
const widths = (process.argv[3] || '320,375,390,768,1280,1366').split(',').map(Number);
fs.mkdirSync(OUT, { recursive: true });
const server = await startServer();
const b = await startBrowser();
const URL = server.origin + BASE;
const J = JSON.stringify;
const go = async (h) => { await b.js(`if (location.hash === ${J(h)}) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = ${J(h)};`); await b.wait(350); };
const click = async (sel, wait = 150) => { await b.js(`const e = document.querySelector(${J(sel)}); if (e) e.click();`); await b.wait(wait); };
const shot = async (w, name) => { await b.wait(150); await b.shot(path.join(OUT, `${w}-${name}.jpg`), true); };
const KINDS = ['vsub', 'missub', 'missmin', 'exchange', 'error', 'inverse', 'word', 'estimate', 'place', 'zeros', 'strategy', 'model'];
const failures = [];
try {
  for (const w of widths) {
    await b.viewport(w, SIZES[w]);
    await b.load(URL); await b.js('localStorage.clear();'); await b.load(URL);
    await go('#/subtraction'); await shot(w, '01-menu');
    await go('#/subtraction/lab'); await shot(w, '02-lab-setup');
    for (let k = 0; k < KINDS.length; k++) {
      await b.js(`GalaxySubtraction.store.startLab({ seed: ${101 + k}, count: 3, level: 3, kind: 'misses', types: [${J(KINDS[k])}] })`);
      await go('#/subtraction/lab'); await click('#labContinue', 300);
      await shot(w, `${String(3 + k).padStart(2, '0')}-lab-${String.fromCharCode(65 + k)}-${KINDS[k]}`);
      if (KINDS[k] === 'zeros' || KINDS[k] === 'error') {   // feedback after a wrong answer, with the worked answer open
        await click('#qSkip', 200); await click('#sub [data-seeit]', 250);
        await shot(w, `${String(3 + k).padStart(2, '0')}b-lab-${KINDS[k]}-feedback`);
      }
    }
    await b.js(`GalaxySubtraction.store.quitLab()`);
    await go('#/subtraction/lab'); await click('[data-size="10"]', 300);
    for (let k = 0; k < 10; k++) { await click('#qSkip', 80); await click('#qNext', 150); }
    await shot(w, '15-lab-report');
    await go('#/subtraction/flashcards'); await shot(w, '16-flash-setup');
    await click('[data-fsize="4"]', 300); await shot(w, '17-flash-card');
    await click('#sfFlip', 200); await shot(w, '18-flash-answer');
    await click('#sfSee', 300); await click('#sfDemo [data-act="next"]', 60); await click('#sfDemo [data-act="next"]', 60); await click('#sfDemo [data-act="next"]', 60); await shot(w, '19-flash-see-regrouping');
    await click('#sfDemoClose', 100); await click('[data-conf="knew"]', 150); await click('#sfEnd', 300); await shot(w, '20-flash-summary');
    await go('#/subtraction/settings'); await shot(w, '21-parent-settings');
    await go('#/subtraction/progress'); await shot(w, '22-progress');
    console.log(`${w}: done`);
  }
  failures.push(...b.errors);
} catch (e) { failures.push(String(e)); } finally { b.close(); server.close(); }
console.log(failures.length ? `ERRORS ${J(failures)}` : 'no page errors');
process.exit(failures.length ? 1 : 0);
