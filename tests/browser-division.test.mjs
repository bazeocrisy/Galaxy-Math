// Browser checks for Galaxy Math Division: Teach, Practice, Math Thinking Lab, Flashcards, Test, Parent Settings and
// Progress, walked through the way a child (and a parent) would — and checks that Multiplication data is never touched.
// Run: node tests/browser-division.test.mjs   (LIVE_URL=... to test the published site; SHOT_DIR=... for screenshots)
import path from 'node:path';
import { startServer, startBrowser, BASE, ROOT } from './lib/harness.mjs';

const SHOT_DIR = process.env.SHOT_DIR || path.join(ROOT, 'tests', 'screenshots');
const LIVE = process.env.LIVE_URL;
const server = LIVE ? { origin: '', missing: [], close() {} } : await startServer();
const b = await startBrowser();
const URL = LIVE ? LIVE.replace(/\/?$/, '/') : server.origin + BASE;
console.log(`Testing Division at ${URL}`);
let pass = 0, fail = 0;
function check(name, ok, detail = '') { if (ok) pass++; else { fail++; console.log(`FAIL ${name} ${detail}`); } }
const J = JSON.stringify;
const VIEWPORTS = [[320, 640], [375, 812], [390, 844], [768, 1024], [1280, 800], [1366, 768]];
const q = (expr) => b.js(`return ${expr};`);
const click = async (sel, wait = 120) => { await b.js(`document.querySelector(${J(sel)}).click();`); await b.wait(wait); };
const exists = (sel) => q(`!!document.querySelector(${J(sel)})`);
const text = (sel) => q(`(document.querySelector(${J(sel)}) || {}).textContent || ''`);
const visible = (id) => q(`document.getElementById(${J(id)}).classList.contains('on')`);
const noOverflowX = () => q('document.documentElement.scrollWidth <= document.documentElement.clientWidth');
const fitsY = () => q('document.documentElement.scrollHeight <= innerHeight + 2');
const submitOnScreen = () => q(`(() => { const r = document.getElementById('qCheck').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; })()`);
const timers = () => q('window.__galaxy.timers.ids.size');
const state = () => q('window.__galaxy.state()');
const div = (expr) => q(`window.__galaxy.rootStore.forSubject('div').${expr}`);
const mult = (expr) => q(`window.__galaxy.rootStore.${expr}`);
const shot = (name) => b.shot(path.join(SHOT_DIR, `division-${name}.png`), false);
async function type(n) { for (const d of String(n)) await b.key(d); }
async function enter() { await b.key('Enter'); await b.wait(120); }
async function goto(h) { await b.js(`if (location.hash === ${J(h)}) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = ${J(h)};`); await b.wait(250); }
async function freshStart() { await b.load(URL); await b.js('localStorage.clear();'); await b.load(URL); }
async function answerQ(item, right = true) {
  if (item.format === 'choice' || item.type === 'choice') {
    const opt = right ? item.answer : item.options.find((o) => o !== item.answer);
    await click(`[data-opt=${J(opt)}]`, 40); await click('#qCheck');
  } else { await type(right ? item.answer : item.answer + 1); await enter(); }
}
const noDivByZero = (qs) => qs.every((x) => x.divisor >= 1 && !/÷ 0\b/.test(x.prompt) && x.dividend === x.divisor * x.quotient);

try {
  // =============== layout: every Division screen at the six viewports ===============
  for (const [w, h] of VIEWPORTS) {
    await b.viewport(w, h);
    await freshStart();
    for (const h2 of ['#/division', '#/division/teach', '#/division/practice', '#/division/lab', '#/division/flashcards', '#/division/test', '#/division/settings', '#/division/progress']) {
      await goto(h2);
      check(`${w}: ${h2} no horizontal overflow`, await noOverflowX());
    }
  }

  // =============== landing + menu ===============
  await b.viewport(1280, 800);
  await freshStart();
  await b.js(`window.__galaxy.rootStore.recordLesson('arrays', 3, true);`);   // a multiplication record that must survive
  check('landing: Division is open with all five activities', /Learn · Practice · Think · Flash · Test/.test(await text('[data-subject=division]')) && !(await q(`document.querySelector('[data-subject=division]').getAttribute('aria-disabled')`)));
  await b.js(`document.querySelector('[data-subject=division]').focus();`); await b.key('Enter'); await b.wait(250);
  check('keyboard: Enter opens Division', (await visible('menu')) && (await q('location.hash')) === '#/division' && (await text('#menuTitle')) === 'Division');
  const modes = await q(`[...document.querySelectorAll('#modes .mode')].map(e => [e.dataset.activity, e.getAttribute('aria-disabled')])`);
  check('division menu: five activities ready', J(modes) === J([['teach', null], ['practice', null], ['lab', null], ['flashcards', null], ['test', null]]), J(modes));
  check('division menu: grown-up links', (await exists('#menuExtra [data-nav="#/division/settings"]')) && (await exists('#menuExtra [data-nav="#/division/progress"]')));
  await shot('menu-1280');

  // =============== TEACH ===============
  await click('#modes [data-activity=teach]', 200);
  check('teach: 15 lessons in 3 units, Up next = What division means', (await q(`document.querySelectorAll('.lesson-row').length`)) === 15 && (await q(`document.querySelectorAll('.unit').length`)) === 3 && /What division means/.test(await text('.up-next')));
  check('teach: remainders marked as an extension', /Leftovers \(extension\)/.test(await text('[data-lesson=remainders]')));
  await click('[data-lesson=equal-sharing]');
  await click('#lessonNext'); await click('#lessonNext');
  check('sharing lesson: See it shows a sharing picture (pile + plates)', (await exists('#lesson .viz-share')) && /6 each/.test(await text('.caption')));
  await click('#lessonNext');
  for (let i = 0; i < 3; i++) await click('#exMore', 50);
  await click('#lessonNext');
  check('guided: sharing picture with empty plates', (await q(`document.querySelectorAll('#lesson .qa-visual .plate').length`)) === 6);
  await type(5); await enter();
  check('guided miss → clue', /Not quite/.test(await text('#qFeedback')) && /Deal one sticker/.test(await text('#qHintBox')));
  await type(4); await enter();
  check('guided: correct', /You got it!/.test(await text('#qFeedback')));
  await enter();
  await type(7); await enter(); await enter();
  await type(6); await enter(); await enter();
  await type(5); await enter();
  check('check: miss shows the answer and a dealt-out picture', /The answer is 4/.test(await text('#qFeedback')) && (await exists('#qFeedback .viz-share')));
  await enter();
  check('lesson complete with 2 of 3', /Lesson complete!/.test(await text('#lesson')) && /2 of 3/.test(await text('.big-score')));
  check('division lesson saved in division progress only', (await div(`summary().lessons['equal-sharing'].completed`)) === true && !(await mult(`summary().lessons['equal-sharing']`)));
  await goto('#/division/teach');
  await click('[data-lesson=share-or-group]');
  await click('#lessonNext'); await click('#lessonNext'); await click('#lessonNext');
  for (let i = 0; i < 3; i++) await click('#exMore', 40);
  await click('#lessonNext');
  await click('[data-opt="Sharing"]', 40); await click('#qCheck'); await enter();
  for (const wrong of ['Sharing', 'Grouping']) { await click(`[data-opt="${wrong}"]`, 40); await click('#qCheck'); await enter(); }
  await type(5); await enter(); await enter();
  check('failed check: not complete', /Almost there!/.test(await text('#lesson')) && (await div(`summary().lessons['share-or-group'].completed`)) === false);

  // =============== PRACTICE ===============
  await goto('#/division/practice');
  check('practice: one Start, division wording', (await exists('#psStart')) && /dividing by 1–10/.test(await text('#practiceSetup')));
  await click('#psStart', 200);
  let ps = (await state()).practice;
  check('practice: 10 exact division problems, core range, no ÷0', ps.qs.length === 10 && noDivByZero(ps.qs) && ps.qs.every((x) => x.divisor <= 10 && x.quotient <= 10));
  check('practice: varied kinds', new Set(ps.qs.map((x) => x.typeId)).size >= 6, J(ps.qs.map((x) => x.typeId)));
  check('practice: challenge kind waits for its lesson', ps.qs.every((x) => x.typeId !== 'derror'));
  let didNumber = false, didChoice = false;
  for (let i = 0; i < ps.qs.length; i++) {
    const x = ps.qs[i];
    if (x.format === 'number' && !didNumber) {
      didNumber = true;
      await type(x.answer + 1); await enter();
      check('1st miss → clue', /Hint:/.test(await text('#qHintBox')));
      await type(x.answer + 2); await enter();
      check('2nd miss → more help', /More help:/.test(await text('#qHintBox')));
      await type(x.answer + 3); await enter();
      check('3rd miss → worked explanation', new RegExp(`The answer is ${x.answer}`).test(await text('#qFeedback')));
      await enter();
    } else if (x.format === 'choice' && !didChoice) {
      didChoice = true;
      await answerQ(x, false);
      check('choice miss → answer + explanation (one try)', /The answer is/.test(await text('#qFeedback')));
      await enter();
    } else { await answerQ(x, true); await enter(); }
  }
  const nMiss = (didNumber ? 1 : 0) + (didChoice ? 1 : 0);
  check('practice review', (await visible('practiceDone')) && new RegExp(`${10 - nMiss} of 10`).test(await text('#practiceDone')));
  check('practice misses stored for division only', (await div('missedQuestions().length')) === nMiss && (await mult('missedQuestions().length')) === 0);
  await goto('#/division/practice');
  await click('#psMisses', 200);
  ps = (await state()).practice;
  const missKeys = await div('missedQuestions().map(m => m.fam + "x" + m.other)');
  check('practice my misses: only missed division facts', ps.fromMisses && ps.qs.every((x) => missKeys.includes(x.factKey)));
  await goto('#/division');

  // =============== MATH THINKING LAB ===============
  await goto('#/division/lab');
  check('lab: subtitle and 10/25/50', /Different problems. Different ways to think./.test(await text('#labSetup')) && (await q(`document.querySelectorAll('[data-size]').length`)) === 3);
  const unlockedN = await q(`window.GalaxyDivBank.unlockedTypes(window.__galaxy.rootStore.forSubject('div').completedLessons(), window.__galaxy.rootStore.forSubject('div').practiceCorrect()).length`);
  check('lab: shows how many division kinds are unlocked', (await text('#labTypeCount')) === `${unlockedN} of 12`);
  await click('[data-size="10"]', 200);
  let ls = (await state()).lab;
  check('lab: 10 exact division problems', ls.qs.length === 10 && noDivByZero(ls.qs));
  check('lab: kind not named before answering', !(await exists('#lab .badge.type')) && !(await exists('#lab #qHint')) && !/Kind of problem/.test(await text('#lab')));
  for (let i = 1; i < 10; i++) if (ls.qs[i].typeId === ls.qs[i - 1].typeId) { check('lab: no back-to-back kind', false, String(i)); break; }
  for (let i = 0; i < 10; i++) {
    const x = ls.qs[i];
    if (i === 1) { await answerQ(x, false); check('lab: wrong → explanation + kind named', /The answer is/.test(await text('#qFeedback')) && /Kind of problem: /.test(await text('#qFeedback'))); }
    else if (i === 2) await click('#qSkip');
    else { await answerQ(x, true); if (i === 0) check('lab: right → still explains', /Correct!/.test(await text('#qFeedback')) && (await text('#qFeedback')).length > 25); }
    await enter();
  }
  check('lab report: 80%, 8/1/1', (await text('#ldPct')) === '80%' && J([await text('#ldC'), await text('#ldI'), await text('#ldU')]) === J(['8', '1', '1']));
  check('lab report: results by kind, missed problems, recommended lessons', (await exists('#ldTypes tbody tr')) && (await q(`document.querySelectorAll('#ldMissed li').length`)) === 2 && (await exists('#ldRecs [data-rec]')));
  await shot('lab-report-1280');
  check('lab saved for division only', (await div('summary().labSessions')) === 1 && (await mult('summary().labSessions')) === 0);
  await goto('#/division/settings');
  await click('#stLabTypes [data-v="true"]', 60);
  check('division settings do not change multiplication settings', (await q('JSON.parse(localStorage.getItem("galaxy-math.settings")).multiplication.lab.allTypes')) === false);
  for (const size of [25, 50]) {
    await goto('#/division/lab'); await click(`[data-size="${size}"]`, 250);
    ls = (await state()).lab;
    check(`lab ${size}: right length, no duplicates, no ÷0`, ls.qs.length === size && new Set(ls.qs.map((x) => x.key)).size === size && noDivByZero(ls.qs));
    if (size === 50) check('lab 50: all 12 division kinds', new Set(ls.qs.map((x) => x.typeId)).size === 12);
  }
  await click('#labExit', 80); await click('#labQuit', 200);
  check('lab exit → menu, timers stopped', (await visible('menu')) && (await timers()) === 0);

  // =============== FLASHCARDS ===============
  await goto('#/division/flashcards');
  const tiles = await q(`[...document.querySelectorAll('#fsPick [data-table]')].map(e => e.textContent)`);
  check('flashcards: child picks a divisor family (÷1–÷10 + Mixed)', J(tiles) === J(['÷1', '÷2', '÷3', '÷4', '÷5', '÷6', '÷7', '÷8', '÷9', '÷10', '🔀 Mixed']), J(tiles));
  check('flashcards: default 5-second reveal', /5 seconds/.test(await text('#fcSetup')));
  await goto('#/division/settings');
  await click('#stReveal [data-v="2"]', 40); await click('#stHold [data-v="1"]', 40); await click('#stOrder [data-v="order"]', 40);
  await goto('#/division/flashcards');
  await click('#fsPick [data-table="7"]', 50);
  const t0 = Date.now();
  check('flashcards: ÷7 family, first card 7 ÷ 7', /7\s*÷\s*7/.test(await text('#fcFront')) && /÷7 flashcards/.test(await text('#fcTitle')));
  await shot('flashcards-1280');
  await b.wait(Math.max(0, 1500 - (Date.now() - t0)));
  check('flashcards: not flipped before 2 s', !(await q(`fcCard.classList.contains('flip')`)));
  await b.wait(Math.max(0, 2450 - (Date.now() - t0)));
  check('flashcards: answer shows the quotient', (await q(`fcCard.classList.contains('flip')`)) && /7 ÷ 7 = 1/.test(await text('#fcBack')));
  await b.wait(Math.max(0, 3500 - (Date.now() - t0)));
  check('flashcards: next card 14 ÷ 7', /14\s*÷\s*7/.test(await text('#fcFront')));
  await click('#fcFlip', 50);
  check('tap to reveal early', await q(`fcCard.classList.contains('flip')`));
  await click('#fcPause', 50); const clk = await text('#fcClock'); await b.wait(2200);
  check('pause stops the clock', (await text('#fcClock')) === clk);
  await click('#fcPause', 50); await click('#fcEnd', 200);
  check('finish → summary, never a test', (await visible('fcDone')) && /dividing by 7/.test(await text('#fcDone')) && !(await visible('test')));
  check('flash session saved for division only', (await div('summary().flash.sessions')) === 1 && (await mult('summary().flash.sessions')) === 0);
  check('division flash settings did not change multiplication flash settings', (await q('JSON.parse(localStorage.getItem("galaxy-math.settings")).multiplication.fc.reveal')) === 5);

  // =============== TEST ===============
  await goto('#/division/test');
  check('test: one Start; automatic families that count toward mastery', (await exists('#tsStart')) && /dividing by 1 and 2/.test(await text('#testSetup')) && /help you master/.test(await text('#tsCounts')));
  await goto('#/division/settings');
  await click('#stTestMode [data-v="custom"]', 40); await click('#stTestTables [data-fam="6"]', 40); await click('#stTimer [data-v="2"]', 40);
  await goto('#/division/test'); await click('#tsStart', 30);
  let ts = (await state()).test;
  check('test: 10 facts ÷6, exact, no ÷0', ts.qs.length === 10 && ts.qs.every((x) => x.divisor === 6) && noDivByZero(ts.qs));
  check('test: division prompt, no hints, fits desktop', /^\d+ ÷ 6 = \?$/.test(await text('#tQ')) && !(await exists('#test #qHint')) && (await fitsY()));
  await type(ts.qs[0].answer); await enter();
  await type(ts.qs[1].answer + 1); await enter();
  const q3 = Date.now();
  while (/Question 3 of 10/.test(await text('#tCount')) && Date.now() - q3 < 4000) await b.wait(100);
  check('test: blank auto-advances at 2 s', Date.now() - q3 >= 1700 && Date.now() - q3 <= 2800);
  for (let i = 3; i < 10; i++) { await type(ts.qs[i].answer); await enter(); }
  check('results: 80%, 8/1/1', (await text('#rPct')) === '80%' && J([await text('#rC'), await text('#rI'), await text('#rU')]) === J(['8', '1', '1']));
  check('results: missed division facts and ÷6 family row', /÷ 6 =/.test(await text('#rMissed')) && /÷6\s*8 \/ 10\s*80%/.test(await text('#rFam tbody')));
  await shot('test-results-1280');
  await goto('#/division/settings');
  await click('#stTimer [data-v="0"]', 40);
  for (let k = 0; k < 2; k++) {
    await goto('#/division/test'); await click('#tsStart', 50);
    ts = (await state()).test;
    for (const x of ts.qs) { await type(x.answer); await enter(); }
  }
  check('two perfect tests → ÷6 mastered (division only)', (await div('summary().families[5].mastered')) && !(await mult('summary().families[5].mastered')));

  // =============== PROGRESS + PERSISTENCE ===============
  await b.reload();
  await goto('#/division/progress');
  check('progress: division title and lessons x/15', /Division progress/.test(await text('#progressTitle')) && /^\d+\/15$/.test(await text('#pgLessons')));
  check('progress: tests and Lab kept after reload', (await text('#pgTests')) === '3' && (await text('#pgLab')) === '1');
  const famRows = await q(`[...document.querySelectorAll('#pgTable tbody tr')].map(r => r.cells[0].textContent.trim())`);
  check('progress: division families ÷1–÷12', famRows.length === 12 && famRows[0].startsWith('÷1') && famRows[5].startsWith('÷6'));
  check('progress: ÷6 mastered', /⭐ Mastered/.test(await q(`document.querySelectorAll('#pgTable tbody tr')[5].textContent`)));
  check('progress: 12 division kinds, constructive statuses', (await q(`document.querySelectorAll('#pgTypes tbody tr').length`)) === 12 && !/weak|poor|bad|fail/i.test(await text('#pgTypes')));
  await shot('progress-1280');
  await click('#pgReset', 40); await click('#pgReset', 200);
  check('reset division keeps multiplication progress', (await div('summary().testsTaken')) === 0 && (await mult(`summary().lessons.arrays.completed`)) === true);
  await goto('#/multiplication/progress');
  check('multiplication progress page is unchanged by division work', /Multiplication progress/.test(await text('#progressTitle')) && (await text('#pgTests')) === '0');

  // =============== every division lesson can be completed ===============
  const lessons = await q('window.GalaxyDivLessons.LESSONS.map(l => ({ id: l.id, guided: l.guided, check: l.check, steps: l.example.steps.length }))');
  for (const l of lessons) {
    await goto('#/division/teach');
    await click(`[data-lesson=${l.id}]`);
    await click('#lessonNext'); await click('#lessonNext'); await click('#lessonNext');
    for (let i = 1; i < l.steps; i++) await click('#exMore', 40);
    await click('#lessonNext');
    await answerQ(l.guided, true);
    const guidedOk = /Correct!/.test(await text('#qFeedback'));
    await enter();
    let ok = true;
    for (const c of l.check) { await answerQ(c, true); ok = ok && /Correct!/.test(await text('#qFeedback')); await enter(); }
    check(`lesson ${l.id}: completed through the UI`, guidedOk && ok && /Lesson complete!/.test(await text('#lesson')));
  }
  check('all 15 division lessons complete', (await div('summary({ lessonsTotal: 15 }).lessonsDone')) === 15);

  // =============== navigation ===============
  await goto('#/division/flashcards'); await click('#fsPick [data-table="3"]', 100);
  await click('.brand', 250);
  check('logo → home from division flashcards; timers stopped', (await visible('landing')) && (await timers()) === 0);
  await goto('#/division/practice'); await click('#psStart', 150);
  await b.js('history.back();'); await b.wait(300);
  check('browser Back leaves division practice', !(await visible('practice')) && (await timers()) === 0);

  // =============== worst-case layouts on phones/tablet ===============
  const WORST = `(() => { const G = window.GalaxyDivBank, r = (v) => () => v; return [
    G.generate('share', 10, 10, { rng: r(0.1), maxFactor: 10 }), G.generate('group', 10, 10, { rng: r(0.1), maxFactor: 10 }),
    G.generate('darray', 10, 10, { rng: r(0.1), maxFactor: 10 }), G.generate('dword', 8, 9, { rng: r(0.95), maxFactor: 10 }),
    G.generate('dmatch', 10, 10, { rng: r(0.3), maxFactor: 10 }), G.generate('derror', 9, 9, { rng: r(0.3), maxFactor: 10 })]; })()`;
  const NAMES = ['share 100 by 10', 'group 100 in tens', '10×10 array', 'longest story', '10 groups of 10', 'who is right'];
  for (const [w, h] of [[320, 640], [375, 812], [390, 844], [768, 1024]]) {
    await b.viewport(w, h); await b.load(URL + '#/division');
    for (const mode of ['startLabWith', 'startPracticeWith']) for (let k = 0; k < NAMES.length; k++) {
      await b.js(`window.__galaxy.${mode}(${WORST}.slice(${k}, ${k + 1}))`); await b.wait(120);
      check(`${w}: worst case "${NAMES[k]}" (${mode === 'startLabWith' ? 'Lab' : 'Practice'}): Submit on screen, no overflow`, (await submitOnScreen()) && (await noOverflowX()));
    }
  }

  check('no page errors', b.errors.length === 0, J(b.errors));
  check('no missing local files', server.missing.length === 0, J(server.missing));
  if (LIVE) {
    const bad = await q(`performance.getEntriesByType('resource').filter(e => e.name.startsWith(location.origin) && e.responseStatus >= 400).map(e => e.name)`);
    check('live: no failed requests', bad.length === 0, J(bad));
  }
} catch (e) {
  fail++; console.log('ERROR', e);
} finally {
  b.close(); server.close();
}
console.log(`${pass}/${pass + fail} division browser checks passed`);
process.exit(fail ? 1 : 0);
