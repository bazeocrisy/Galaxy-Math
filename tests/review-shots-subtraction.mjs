// Subtraction screenshots for owner/QA review at the six review widths: menu, Teach (the original worked examples,
// including regrouping across zeros), Your Turn, Practice (setup, hint, Show me, results), the Test and Progress.
// Run: node tests/review-shots-subtraction.mjs <outDir> [widths, e.g. 390,1280]
import fs from 'node:fs';
import path from 'node:path';
import { startServer, startBrowser, BASE } from './lib/harness.mjs';

const OUT = process.argv[2] || 'review-shots-subtraction';
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
const lesson = async (id, step, ex) => { await b.js(`window.GalaxySubtraction._test.startLesson(${J(id)}, ${step})`); await b.wait(200); if (ex) await click('#sub [data-ex="next"]'); };
const demoNext = async (n, scope = '#sub') => { for (let k = 0; k < n; k++) { await b.js(`const x = document.querySelector(${J(scope + ' [data-act="next"]')}); if (x && !x.disabled) x.click();`); await b.wait(40); } };
async function typeAns(scope, value) { const ds = String(value).split('').reverse(); for (let i = 0; i < ds.length; i++) { await b.js(`document.querySelector(${J(scope + ' [data-k="a' + i + '"]')}).focus();`); await b.key(ds[i]); } }
const failures = [];
try {
  for (const w of widths) {
    await b.viewport(w, SIZES[w]);
    await b.load(URL); await b.js('localStorage.clear();'); await b.load(URL);
    await go('#/'); await shot(w, '01-home');
    await go('#/subtraction'); await shot(w, '02-menu');
    await go('#/subtraction/teach'); await shot(w, '03-teach');
    await lesson('one', 0); await shot(w, '04-lesson-goal');
    await lesson('value', 1); await demoNext(0); await click('#sub [data-part="next"]'); await click('#sub [data-part="next"]'); await shot(w, '05-blocks-exchange');
    await lesson('one', 1); await demoNext(4); await shot(w, '06-demo-52-27-mid');
    await lesson('one', 1, true); await demoNext(40); await shot(w, '07-demo-463-128-end');
    await lesson('multi', 1); await demoNext(40); await shot(w, '08-demo-532-168-end');
    await lesson('four', 1, true); await demoNext(40); await shot(w, '09-demo-4532-1768-end');
    await lesson('zeros2', 1); await demoNext(4); await shot(w, '10-zeros-3002-1578-mid');
    await demoNext(40); await shot(w, '11-zeros-3002-1578-end');
    await lesson('zeros2', 2); await shot(w, '12-yourturn-guided');
    await lesson('mistakes', 2); await shot(w, '13-yourturn-mistake');
    await go('#/subtraction/practice'); await click('[data-key=size] [data-v="2"]', 40); await click('[data-key=difficulty] [data-v="medium"]', 60); await shot(w, '14-practice-setup-unavailable');
    await click('[data-key=size] [data-v="4"]', 40); await click('[data-key=difficulty] [data-v="hard"]', 40); await click('#spStart', 300); await shot(w, '15-practice-question');
    await click('#sub [data-act="hint"]', 200); await shot(w, '16-practice-hint');
    await click('#sub [data-act="solution"]', 250); await demoNext(3, '#sub [data-sk-mini]'); await shot(w, '17-practice-showme-playing');
    await demoNext(40, '#sub [data-sk-mini]'); await shot(w, '18-practice-showme-done');
    for (let k = 0; k < 10; k++) {   // finish the session: the rest answered on own (results screen)
      if (!(await b.js(`return !!document.getElementById('spNext')`))) break;
      if (await b.js(`return !document.getElementById('spNext').hidden`)) { await click('#spNext', 250); continue; }
      const it = await b.js(`return (() => { const a = GalaxySubtraction.store.activePractice(); return SubtractKit.math.generateSession({ size: a.size, difficulty: a.difficulty, length: a.length, seed: a.seed }).items[a.i]; })()`);
      await typeAns('#spWs', it.top - it.bottom); await click('#sub [data-act="check"]', 120); await click('#spNext', 250);
    }
    await shot(w, '19-practice-results');
    await go('#/subtraction/test'); await shot(w, '20-test-start');
    await click('#stStart', 300); await shot(w, '21-test-question');
    const items = await b.js(`return Mathbook.subtractRegrouping.testItems(GalaxySubtraction.store.testDraft().seed)`);
    const kIdx = (kind) => items.findIndex((x) => x.kind === kind);
    for (const [kind, name] of [['steps', '22-test-regroup-steps'], ['decide', '23-test-decide'], ['mistake', '24-test-mistake']]) { await click(`#sub [data-q="${kIdx(kind)}"]`, 300); await shot(w, name); }
    await click('#sub [data-q="14"]', 300); await click('#stFinish', 200); await click('#stFinishAnyway', 400); await shot(w, '25-test-results');
    await b.js(`const d = document.querySelector('#stReview details'); d.open = true; d.dispatchEvent(new Event('toggle'));`); await b.wait(200);
    await b.js(`document.querySelector('#stReview details').scrollIntoView()`); await shot(w, '26-test-review-worked');
    await go('#/subtraction/progress'); await shot(w, '27-progress');
    console.log(`${w}: done`);
  }
  failures.push(...b.errors);
} catch (e) { failures.push(String(e)); } finally { b.close(); server.close(); }
console.log(failures.length ? `ERRORS ${J(failures)}` : 'no page errors');
process.exit(failures.length ? 1 : 0);
