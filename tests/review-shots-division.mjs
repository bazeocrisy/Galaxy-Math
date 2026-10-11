// Division screenshots for owner/QA review: every Division screen at the six review widths, with the hardest cases
// (sharing 100 among 10, grouping 100 in tens, 10×10 array, longest story, repeated subtraction, picture matching).
// Run: node tests/review-shots-division.mjs <outDir> [widths, e.g. 390,1280]
import fs from 'node:fs';
import path from 'node:path';
import { startServer, startBrowser, BASE } from './lib/harness.mjs';

const OUT = process.argv[2] || 'review-shots-division';
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
const LAB = `(() => { const G = window.GalaxyDivBank, r = (v) => () => v; return [
  G.generate('share', 10, 10, { rng: r(0.1), maxFactor: 10 }),
  G.generate('group', 10, 10, { rng: r(0.1), maxFactor: 10 }),
  G.generate('darray', 10, 10, { rng: r(0.1), maxFactor: 10 }),
  G.generate('dword', 8, 9, { rng: r(0.95), maxFactor: 10 }),
  G.generate('subtract', 6, 9, { rng: r(0.1), maxFactor: 10 }),
  G.generate('dmatch', 6, 4, { rng: r(0.3), maxFactor: 10 }),
  G.generate('derror', 6, 6, { rng: r(0.3), maxFactor: 10 }),
  G.generate('missdivisor', 7, 6, { rng: r(0.3), maxFactor: 10 })]; })()`;
const failures = [];
try {
  for (const w of widths) {
    await b.viewport(w, SIZES[w]);
    await b.load(URL); await b.js('localStorage.clear();'); await b.load(URL + '#/division');
    await b.js(`window.__galaxy.store.recordLesson('what-division-means', 3, true);`);
    await go('#/'); await shot(w, '01-home');
    await go('#/division'); await shot(w, '02-menu');
    await go('#/division/teach'); await shot(w, '03-teach');
    await b.js(`document.querySelector('[data-lesson=equal-sharing]').click();`); await b.wait(150);
    await click('#lessonNext'); await click('#lessonNext'); await shot(w, '04-lesson-sharing-see-it');
    await go('#/division/teach'); await b.js(`document.querySelector('[data-lesson=div-equations]').click();`); await b.wait(150);
    await click('#lessonNext'); await click('#lessonNext'); await shot(w, '05-lesson-bracket-see-it');
    await go('#/division/teach'); await b.js(`document.querySelector('[data-lesson=equal-grouping]').click();`); await b.wait(150);
    await click('#lessonNext'); await click('#lessonNext'); await click('#lessonNext');
    for (let i = 0; i < 3; i++) await b.js(`document.getElementById('exMore') && exMore.click()`); await b.wait(80);
    await click('#lessonNext'); await click('#qHint'); await shot(w, '06-lesson-grouping-guided');
    await b.js(`window.__galaxy.startPracticeWith([window.GalaxyDivBank.generate('share', 6, 4, { rng: () => 0.1, maxFactor: 10 })])`); await b.wait(200);
    await shot(w, '07-practice-sharing');
    await b.js(`for (const d of '5') document.querySelector('#qPad [data-k="' + d + '"]').click(); qCheck.click();`); await b.wait(150);
    await b.js(`for (const d of '7') document.querySelector('#qPad [data-k="' + d + '"]').click(); qCheck.click();`); await b.wait(150);
    await shot(w, '08-practice-more-help');
    await b.js(`window.__galaxy.startLabWith(${LAB})`); await b.wait(200);
    const names = ['09-lab-share-100', '10-lab-group-100', '11-lab-array-10x10', '12-lab-long-story', '13-lab-repeated-subtraction', '14-lab-picture-match', '15-lab-who-is-right', '16-lab-missing-divisor'];
    for (let i = 0; i < names.length; i++) {
      await shot(w, names[i]);
      await click('#qSkip');
      if (i === 0) await shot(w, '17-lab-feedback-share');
      if (i < names.length - 1) await click('#qNext');
    }
    await go('#/division/flashcards'); await shot(w, '18-flashcards-setup');
    await b.js(`document.querySelector('#fsPick [data-table="7"]').click()`); await b.wait(250); await shot(w, '19-flashcards-session');
    await go('#/division/test'); await shot(w, '20-test-start');
    await click('#tsStart', 250); await shot(w, '21-test-question');
    await go('#/division/settings'); await shot(w, '22-parent-settings');
    await go('#/division/progress'); await shot(w, '23-progress');
    console.log(`${w}: done`);
  }
  failures.push(...b.errors);
} catch (e) { failures.push(String(e)); } finally { b.close(); server.close(); }
console.log(failures.length ? `ERRORS ${J(failures)}` : 'no page errors');
process.exit(failures.length ? 1 : 0);
