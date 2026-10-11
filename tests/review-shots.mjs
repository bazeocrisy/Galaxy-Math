// Screenshots for owner/auditor layout review: every requested screen at the six review widths.
// Run: node tests/review-shots.mjs <outDir> [widths, e.g. 390,1280]
// Each file is "<width>-<screen>.jpg" (full page). The same questions are shown every run so before/after compare fairly.
import fs from 'node:fs';
import path from 'node:path';
import { startServer, startBrowser, BASE } from './lib/harness.mjs';

const OUT = process.argv[2] || 'review-shots';
const SIZES = { 320: 640, 375: 812, 390: 844, 768: 1024, 1280: 800, 1366: 768 };
const widths = (process.argv[3] || '320,375,390,768,1280,1366').split(',').map(Number);
fs.mkdirSync(OUT, { recursive: true });
const server = await startServer();
const b = await startBrowser();
const URL = server.origin + BASE;
const J = JSON.stringify;
const go = async (h) => { await b.js(`if (location.hash === ${J(h)}) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = ${J(h)};`); await b.wait(300); };
const click = async (sel, wait = 150) => { await b.js(`document.querySelector(${J(sel)}).click();`); await b.wait(wait); };
const shot = async (w, name) => { await b.wait(120); await b.shot(path.join(OUT, `${w}-${name}.jpg`), true); };
// Fixed questions for the hard layout cases (long repeated addition, big array, long story, missing factor, long match).
const LAB = `(() => { const G = window.GalaxyBank, r = (v) => () => v; return [
  G.generate('repeated', 6, 10, { rng: r(0.1), maxFactor: 10 }),
  G.generate('array', 9, 8, { rng: r(0.1), maxFactor: 10 }),
  G.generate('word', 7, 4, { rng: r(0.99), maxFactor: 10 }),
  G.generate('missing', 7, 6, { rng: r(0.1), maxFactor: 10 }),
  G.generate('match', 9, 7, { rng: r(0.7), maxFactor: 10 }),
  G.generate('error', 6, 7, { rng: r(0.5), maxFactor: 10 })]; })()`;
let failures = [];
try {
  for (const w of widths) {
    await b.viewport(w, SIZES[w]);
    await b.load(URL); await b.js('localStorage.clear();'); await b.load(URL);
    // a little progress so Teach shows a mix of done / not started
    await b.js(`window.__galaxy.store.recordLesson('equal-groups', 3, true); window.__galaxy.store.recordLesson('repeated-addition', 2, true);`);
    await shot(w, '01-home');
    await go('#/multiplication'); await shot(w, '02-menu');
    await go('#/multiplication/teach'); await shot(w, '03-teach');
    await b.js(`document.querySelector('[data-lesson=arrays]').click();`); await b.wait(150);
    await click('#lessonNext'); await click('#lessonNext'); await shot(w, '04-lesson-see-it');
    await click('#lessonNext'); for (let i = 0; i < 3; i++) await b.js(`document.getElementById('exMore') && exMore.click()`); await b.wait(100);
    await shot(w, '05-lesson-worked-example');
    await click('#lessonNext'); await click('#qHint'); await shot(w, '06-lesson-guided');
    await b.js(`window.__galaxy.startPracticeWith([window.GalaxyBank.generate('groups', 6, 4, { rng: () => 0.1, maxFactor: 10 })])`); await b.wait(200);
    await shot(w, '07-practice');
    await b.js(`for (const d of '25') document.querySelector('#qPad [data-k="' + d + '"]').click(); qCheck.click();`); await b.wait(200);
    await shot(w, '08-practice-after-miss');
    await b.js(`window.__galaxy.startLabWith(${LAB})`); await b.wait(200);
    const names = ['09-lab-long-addition', '10-lab-array', '11-lab-long-word', '12-lab-missing-factor', '13-lab-long-match', '14-lab-check-the-work'];
    for (let i = 0; i < names.length; i++) {
      await shot(w, names[i]);
      if (i === 0) { await click('#qSkip'); await shot(w, '15-lab-feedback'); await click('#qNext'); continue; }
      if (i < names.length - 1) { await click('#qSkip'); await click('#qNext'); }
    }
    await go('#/multiplication/flashcards'); await shot(w, '16-flashcards-setup');
    await go('#/multiplication/flashcards');
    const startFc = await b.js(`return !!document.getElementById('fsStart')`);
    if (startFc) await b.js(`fsStart.click()`); else await b.js(`document.querySelector('[data-table="7"]').click()`);
    await b.wait(250); await shot(w, '17-flashcards-session');
    await go('#/multiplication/test'); await shot(w, '18-test-start');
    await click('#tsStart', 250); await shot(w, '19-test-question');
    await go('#/multiplication/settings'); await shot(w, '20-parent-settings');
    await go('#/multiplication/progress'); await shot(w, '21-progress');
    console.log(`${w}: done`);
  }
  if (b.errors.length) failures.push(...b.errors);
} catch (e) { failures.push(String(e)); } finally { b.close(); server.close(); }
console.log(failures.length ? `ERRORS ${J(failures)}` : 'no page errors');
process.exit(failures.length ? 1 : 0);
