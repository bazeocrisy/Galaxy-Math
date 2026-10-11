// Browser checks for Galaxy Math (Multiplication 2.0): landing, menus, Teach, Practice, Math Thinking Lab, Flashcards,
// Test, Parent Settings and Progress, walked through the way a child (and a parent) would use them.
// Run: npm run test:browser   (SHOT_DIR=... for screenshots; default tests/screenshots; CHROME_PATH=... for another browser)
// Live: LIVE_URL=https://bazeocrisy.github.io/Galaxy-Math/ npm run test:browser   (tests the published site instead of a local server)
import path from 'node:path';
import { startServer, startBrowser, BASE, ROOT } from './lib/harness.mjs';

const SHOT_DIR = process.env.SHOT_DIR || path.join(ROOT, 'tests', 'screenshots');
const LIVE = process.env.LIVE_URL;
const server = LIVE ? { origin: '', missing: [], close() {} } : await startServer();
const b = await startBrowser();
const URL = LIVE ? LIVE.replace(/\/?$/, '/') : server.origin + BASE;
console.log(`Testing ${URL}`);
let pass = 0, fail = 0;
function check(name, ok, detail = '') {
  if (ok) pass++; else { fail++; console.log(`FAIL ${name} ${detail}`); }
}
const J = JSON.stringify;
const VIEWPORTS = [[320, 640], [375, 812], [390, 844], [768, 1024], [1280, 800], [1366, 768]];
const q = (expr) => b.js(`return ${expr};`);
const click = async (sel, wait = 120) => { await b.js(`document.querySelector(${J(sel)}).click();`); await b.wait(wait); };
const exists = (sel) => q(`!!document.querySelector(${J(sel)})`);
const text = (sel) => q(`(document.querySelector(${J(sel)}) || {}).textContent || ''`);
const visible = (id) => q(`document.getElementById(${J(id)}).classList.contains('on')`);
const noOverflowX = () => q('document.documentElement.scrollWidth <= document.documentElement.clientWidth');
const fitsY = () => q('document.documentElement.scrollHeight <= innerHeight + 2');
/** The answer button (Check/Submit) is fully on screen without scrolling. */
const submitOnScreen = () => q(`(() => { const r = document.getElementById('qCheck').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; })()`);
/** No text inside the current screen is cut off horizontally. */
const clippedText = () => q(`[...document.querySelectorAll('.screen.on *')].filter(e => e.children.length === 0 && e.textContent.trim() && getComputedStyle(e).overflow !== 'visible' && e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.trim().slice(0, 30))`);
const timers = () => q('window.__galaxy.timers.ids.size');
const state = () => q('window.__galaxy.state()');
const shot = (name) => b.shot(path.join(SHOT_DIR, `${name}.png`), false);
async function type(n) { for (const d of String(n)) await b.key(d); }
async function enter() { await b.key('Enter'); await b.wait(120); }
// Go to a hash; if it is already the current hash, re-run the router (like clicking a link to the same page).
async function goto(h) { await b.js(`if (location.hash === ${J(h)}) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = ${J(h)};`); await b.wait(250); }
async function freshStart() { await b.load(URL); await b.js('localStorage.clear();'); await b.load(URL); }
/** Answer the current question (bank or lesson shape) right or wrong. */
async function answerQ(item, right = true) {
  if (item.format === 'choice' || item.type === 'choice') {
    const opt = right ? item.answer : item.options.find((o) => o !== item.answer);
    await click(`[data-opt=${J(opt)}]`, 40); await click('#qCheck');
  } else { await type(right ? item.answer : item.answer + 1); await enter(); }
}
async function setSetting(sel) { await click(sel, 40); }

try {
  // =============== LAYOUT: landing at the six required viewports ===============
  for (const [w, h] of VIEWPORTS) {
    await b.viewport(w, h);
    await freshStart();
    check(`${w}: landing visible`, await visible('landing'));
    check(`${w}: no horizontal overflow`, await noOverflowX());
    check(`${w}: four subject cards`, (await q(`document.querySelectorAll('#subjects .subject').length`)) === 4);
    const clipped = await q(`[...document.querySelectorAll('.subject .sName,.subject .badge')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent)`);
    check(`${w}: card text fits`, clipped.length === 0, J(clipped));
    const look = await q(`[...document.querySelectorAll('#subjects .subject')].map(e => { const s = getComputedStyle(e); const lum = s.backgroundColor.match(/\\d+/g).slice(0,3).map(Number).reduce((a,c)=>a+c,0)/3; return [lum > 200, s.color]; })`);
    check(`${w}: light cards with navy text`, look.every(([light, color]) => light && color === 'rgb(27, 31, 75)'), J(look));
    check(`${w}: logo loads`, await q(`(() => { const i = document.querySelector('.heroLogo'); return i.complete && i.naturalWidth > 0; })()`));
    if ([390, 1280].includes(w)) await shot(`landing-${w}`);
  }

  // =============== LANDING + MENUS ===============
  await b.viewport(1280, 800);
  await freshStart();
  const cards = await q(`[...document.querySelectorAll('#subjects .subject')].map(e => [e.querySelector('.sName').textContent, e.getAttribute('aria-disabled')])`);
  check('card states', J(cards) === J([['Addition', 'true'], ['Subtraction', 'true'], ['Multiplication', null], ['Division', null]]), J(cards));
  check('addition/subtraction say Coming Soon', (await q(`[...document.querySelectorAll('.subject.soon .badge')].map(e => e.textContent).join()`)) === 'Coming Soon,Coming Soon');
  await click('[data-subject=addition]');
  check('addition stays on landing', (await visible('landing')) && /coming soon/i.test(await text('#landingNote')));
  await goto('#/subtraction/practice');
  check('#/subtraction/practice → landing', (await visible('landing')) && (await q('location.hash')) === '#/');
  await goto('#/division');
  check('division menu: all five activities locked', (await q(`[...document.querySelectorAll('#modes .mode')].filter(e => e.getAttribute('aria-disabled') === 'true').length`)) === 5);
  for (const a of ['teach', 'practice', 'lab', 'flashcards', 'test', 'progress', 'settings']) {
    await goto(`#/division/${a}`);
    check(`#/division/${a} cannot launch`, (await q('location.hash')) === '#/division' && (await visible('menu')));
  }
  await goto('#/');
  await b.js(`document.querySelector('[data-subject=multiplication]').focus();`);
  await b.key('Enter'); await b.wait(250);
  check('keyboard: Enter on the card opens Multiplication', (await visible('menu')) && (await q('location.hash')) === '#/multiplication');
  const modes = await q(`[...document.querySelectorAll('#modes .mode')].map(e => [e.dataset.activity, e.querySelector('.mName').textContent, e.querySelector('.mBlurb').textContent])`);
  check('menu: five activities with their purposes', J(modes) === J([['teach', 'Teach', 'Show me how'], ['practice', 'Practice', 'Let me try'], ['lab', 'Math Thinking Lab', 'Make me think'], ['flashcards', 'Flashcards', 'Help me remember'], ['test', 'Test', 'Show what I know']]), J(modes));
  check('menu: grown-up links', (await exists('#menuExtra [data-nav="#/multiplication/settings"]')) && (await exists('#menuExtra [data-nav="#/multiplication/progress"]')));
  check('menu fits on desktop', await fitsY());
  await shot('menu-multiplication-1280');

  // =============== TEACH ===============
  await click('#modes [data-activity=teach]', 200);
  check('teach list: 13 lessons', (await q(`document.querySelectorAll('[data-lesson]').length`)) === 13);
  await click('[data-lesson=arrays]');
  await click('#lessonNext');
  await goto('#/multiplication/teach');
  check('opening a lesson does not complete it', /Not started/.test(await text('[data-lesson=arrays]')));
  await click('[data-lesson=equal-groups]');
  check('step 1 Goal + key words', /Step 1 of 7 · Goal/.test(await text('#stepLabel')) && /equal groups/.test(await text('.words')));
  await click('#lessonNext');
  check('step 2 Explanation (text)', /Step 2 of 7 · Explanation/.test(await text('#stepLabel')) && /Equal groups/.test(await text('.explain')));
  await click('#lessonNext');
  check('step 3 See it (picture + caption)', /See it/.test(await text('#stepLabel')) && (await q(`document.querySelectorAll('#lesson .viz-groups .grp').length`)) === 7 && /every group has the same number/.test(await text('.caption')));
  await shot('lesson-see-it-1280');
  await click('#lessonNext');
  check('worked example: Next waits for all steps', await q('lessonNext.disabled'));
  for (let i = 0; i < 3; i++) await click('#exMore', 60);
  check('worked example: all steps shown', !(await q('lessonNext.disabled')));
  await click('#lessonNext');
  check('guided question with hint button', /Try it together/.test(await text('#stepLabel')) && (await exists('#qHint')));
  await type(11); await enter();
  check('guided: wrong answer → try again with a clue', /Not quite — try again/.test(await text('#qFeedback')) && /Count by 4s/.test(await text('#qHintBox')));
  await shot('lesson-guided-feedback-1280');
  await type(12); await enter();
  check('guided: correct', /You got it!/.test(await text('#qFeedback')));
  await enter();
  check('independent check: no hints', /Question 1 of 3/.test(await text('#lesson')) && !(await exists('#qHint')));
  await type(10); await enter(); await enter();
  await click('[data-opt="No"]', 50); await click('#qCheck'); await enter();
  await type(21); await enter();
  check('check: wrong answer shows the answer and why', /The answer is 20/.test(await text('#qFeedback')));
  await enter();
  check('lesson complete with 2 of 3', /Lesson complete!/.test(await text('#lesson')) && /2 of 3/.test(await text('.big-score')));
  check('lesson saved', await q(`window.__galaxy.store.summary().lessons['equal-groups'].completed === true`));
  // a failed check does not complete a lesson
  await goto('#/multiplication/teach');
  await click('[data-lesson=rows-columns]');
  await click('#lessonNext'); await click('#lessonNext'); await click('#lessonNext');
  for (let i = 0; i < 3; i++) await click('#exMore', 40);
  await click('#lessonNext');
  await type(4); await enter(); await enter();
  for (let i = 0; i < 3; i++) { await type(1); await enter(); await enter(); }
  check('failed check: not complete, retry offered', /Almost there!/.test(await text('#lesson')) && (await exists('#retryCheck')) && (await q(`window.__galaxy.store.summary().lessons['rows-columns'].completed === false`)));

  // =============== PRACTICE (one Start, varied problems, progressive help) ===============
  await goto('#/multiplication/practice');
  check('practice: one obvious Start, no setup controls', (await exists('#psStart')) && !(await exists('#practiceSetup .fam-picker')) && !(await exists('#practiceSetup .seg')));
  await click('#psStart', 200);
  let ps = (await state()).practice;
  check('practice: 10 problems by default from core tables', ps.qs.length === 10 && ps.qs.every((x) => x.fam <= 10 && x.other <= 10));
  check('practice: varied kinds of problems', new Set(ps.qs.map((x) => x.typeId)).size >= 6, J(ps.qs.map((x) => x.typeId)));
  check('practice: no identical problems', new Set(ps.qs.map((x) => x.key)).size === 10);
  check('practice fits on desktop', await fitsY());
  let didNumber = false, didChoice = false, didHint = false;
  for (let i = 0; i < ps.qs.length; i++) {
    const x = ps.qs[i];
    check(`practice q${i + 1}: progress shown`, (await text('#pCount')) === `Question ${i + 1} of 10`);
    if (x.format === 'number' && !didNumber) {
      didNumber = true;
      await type(x.answer + 1); await enter();
      check('1st miss → a clue', /Hint:/.test(await text('#qHintBox')) && /try again/.test(await text('#qFeedback')));
      await type(x.answer + 2); await enter();
      check('2nd miss → more help (strategy)', /More help:/.test(await text('#qHintBox')));
      await shot('practice-more-help-1280');
      await type(x.answer + 3); await enter();
      check('3rd miss → worked explanation with the answer', new RegExp(`The answer is ${x.answer}`).test(await text('#qFeedback')));
      await enter();
    } else if (x.format === 'choice' && !didChoice) {
      didChoice = true;
      await answerQ(x, false);
      check('choice miss → a clue', /Hint:/.test(await text('#qHintBox')));
      await answerQ(x, false);
      check('2nd choice miss → answer and explanation', /The answer is/.test(await text('#qFeedback')) && (await exists('.choices .right')));
      await enter();
    } else if (!didHint) {
      didHint = true;
      await click('#qHint');
      check('hint on request', /Hint:/.test(await text('#qHintBox')));
      await click('#qHint');
      check('second tap → more help', /More help:/.test(await text('#qHintBox')));
      await answerQ(x, true);
      check('correct after hints: explanation shown', /Correct!/.test(await text('#qFeedback')) && (await text('#qFeedback')).length > 20);
      await enter();
    } else { await answerQ(x, true); await enter(); }
  }
  const nMiss = (didNumber ? 1 : 0) + (didChoice ? 1 : 0);
  check('practice complete with review', (await visible('practiceDone')) && new RegExp(`${10 - nMiss} of 10`).test(await text('#practiceDone')));
  check('practice review lists the misses', (await q(`document.querySelectorAll('#pdMissed li').length`)) === nMiss);
  await shot('practice-done-1280');
  await goto('#/multiplication/practice');
  check('practice my misses offered', await exists('#psMisses'));
  await click('#psMisses', 200);
  ps = (await state()).practice;
  const missKeys = await q('window.__galaxy.store.missedQuestions().map(m => m.fam + "x" + m.other)');
  check('practice my misses: only missed facts', ps.fromMisses && ps.qs.every((x) => missKeys.includes(x.factKey)), J(missKeys));
  await click('[data-nav="#/multiplication"]', 200);
  check('exit practice → menu, no timers', (await visible('menu')) && (await timers()) === 0);

  // =============== MATH THINKING LAB ===============
  await goto('#/multiplication/lab');
  const sizes = await q(`[...document.querySelectorAll('[data-size]')].map(e => e.dataset.size + ':' + e.querySelector('.ls-name').textContent)`);
  check('lab: 10 / 25 / 50 choices', J(sizes) === J(['10:Quick Challenge', '25:Thinking Workout', '50:Big Challenge']), J(sizes));
  check('lab: subtitle', /Different problems. Different ways to think./.test(await text('#labSetup')));
  const expectUnlocked = await q('window.GalaxyBank.unlockedTypes(window.__galaxy.store.completedLessons(), window.__galaxy.store.practiceAttempts()).length');
  check('lab: shows how many kinds are unlocked', (await text('#labTypeCount')) === `${expectUnlocked} of 12`, `${await text('#labTypeCount')} vs ${expectUnlocked}`);
  check('lab: learning path offered for locked kinds', expectUnlocked === 12 || (await exists('#labLearn')));
  await shot('lab-setup-1280');
  await click('[data-size="10"]', 200);
  let ls = (await state()).lab;
  const unlocked = await q('window.GalaxyBank.unlockedTypes(window.__galaxy.store.completedLessons(), window.__galaxy.store.practiceAttempts())');
  check('lab: 10 problems, only from unlocked kinds', ls.qs.length === 10 && ls.qs.every((x) => unlocked.includes(x.typeId)));
  check('lab: no hint button, no strategy label before answering', !(await exists('#lab #qHint')) && !(await exists('#lab .badge.type')) && !/This was a/.test(await text('#lab')));
  for (let i = 1; i < ls.qs.length; i++) if (unlocked.length > 1) check(`lab: no back-to-back kind at ${i}`, ls.qs[i].typeId !== ls.qs[i - 1].typeId);
  for (let i = 0; i < 10; i++) {
    const x = ls.qs[i];
    if (i === 1) { await answerQ(x, false); check('lab: wrong answer → educational feedback', /The answer is/.test(await text('#qFeedback')) && /This was a/.test(await text('#qFeedback'))); }
    else if (i === 2) { await click('#qSkip'); check('lab: skip shows the answer', /Skipped/.test(await text('#qFeedback'))); }
    else { await answerQ(x, true); if (i === 0) { check('lab: right answer still explains', /Correct!/.test(await text('#qFeedback')) && (await text('#qFeedback')).length > 25); await shot('lab-feedback-1280'); } }
    await enter();
  }
  check('lab report shown', await visible('labDone'));
  check('lab report: 80%, 8 / 1 / 1', (await text('#ldPct')) === '80%' && J([await text('#ldC'), await text('#ldI'), await text('#ldU')]) === J(['8', '1', '1']));
  check('lab report: results by kind of problem', (await q(`document.querySelectorAll('#ldTypes tbody tr').length`)) === new Set(ls.qs.map((x) => x.typeId)).size);
  check('lab report: missed problems with explanations', (await q(`document.querySelectorAll('#ldMissed li').length`)) === 2);
  check('lab report: recommended lessons', (await q(`document.querySelectorAll('#ldRecs [data-rec]').length`)) >= 1);
  check('lab report: one session is not mastery', /only after several sessions/.test(await text('#labDone')));
  await shot('lab-report-1280');
  const recLesson = await q(`document.querySelector('#ldRecs [data-rec]').dataset.rec`);
  await click('#ldRecs [data-rec]', 250);
  check('recommended lesson opens', (await visible('lesson')) && (await q('window.__galaxy.state().lesson.lesson.id')) === recLesson);
  await goto('#/multiplication/lab');
  await click('[data-size="25"]', 200);
  ls = (await state()).lab;
  check('lab 25: 25 problems', ls.qs.length === 25);
  await goto('#/multiplication/settings');
  await setSetting('#stLabTypes [data-v="true"]');
  await goto('#/multiplication/lab');
  check('parent setting: all 12 kinds', (await text('#labTypeCount')) === '12 of 12');
  await click('[data-size="50"]', 250);
  ls = (await state()).lab;
  check('lab 50: 50 problems, all 12 kinds, no identical problems', ls.qs.length === 50 && new Set(ls.qs.map((x) => x.typeId)).size === 12 && new Set(ls.qs.map((x) => x.key)).size === 50);
  for (let i = 1; i < 50; i++) if (ls.qs[i].typeId === ls.qs[i - 1].typeId) { check('lab 50: no back-to-back kind', false, String(i)); break; }
  await click('[data-nav="#/multiplication"]', 200);
  check('exit lab → menu, no timers, not saved', (await visible('menu')) && (await timers()) === 0 && (await q('window.__galaxy.store.summary().labSessions')) === 1);

  // =============== FLASHCARDS (child picks a table; timing set by parents) ===============
  await goto('#/multiplication/flashcards');
  check('flashcards: child sees tables + Start only', (await exists('#fsPick [data-table="7"]')) && !(await exists('#fcSetup .seg')));
  check('flashcards: default reveal is 5 s', /5 seconds/.test(await text('#fcSetup')));
  await goto('#/multiplication/settings');
  await setSetting('#stReveal [data-v="2"]'); await setSetting('#stHold [data-v="1"]'); await setSetting('#stOrder [data-v="order"]'); await setSetting('#stMin [data-v="3"]');
  await goto('#/multiplication/flashcards');
  await click('#fsPick [data-table="7"]');
  await click('#fsStart', 50);
  const t0 = Date.now();
  check('flashcards: vertical 7 × 1 first (in order)', (await q(`fcFront.querySelector('.vert').textContent`)) === '7×1');
  check('flashcards: fits on desktop', await fitsY());
  await shot('flashcards-front-1280');
  await b.wait(Math.max(0, 1500 - (Date.now() - t0)));
  check('flashcards: not flipped before 2 s', !(await q(`fcCard.classList.contains('flip')`)));
  await b.wait(Math.max(0, 2450 - (Date.now() - t0)));
  check('flashcards: flipped after 2 s', await q(`fcCard.classList.contains('flip')`));
  await shot('flashcards-back-1280');
  await b.wait(Math.max(0, 3500 - (Date.now() - t0)));
  check('flashcards: next card after the 1 s hold', (await q(`fcFront.querySelector('.vert').textContent`)) === '7×2' && /2 cards/.test(await text('#fcSeen')));
  await click('#fcFlip', 50);
  check('manual early reveal', await q(`fcCard.classList.contains('flip')`));
  await click('#fcPause', 50);
  const clockA = await text('#fcClock');
  await b.wait(2300);
  check('pause: card and clock stop', (await q(`fcFront.querySelector('.vert').textContent`)) === '7×2' && (await text('#fcClock')) === clockA);
  await click('#fcPause', 50);
  await click('#fcEnd', 200);
  check('finish → summary, never a test', (await visible('fcDone')) && !(await visible('test')));
  check('no timers after flashcards', (await timers()) === 0);
  await goto('#/multiplication/settings');
  await setSetting('#stReveal [data-v="0"]');
  await goto('#/multiplication/flashcards');
  await click('#fsStart', 50);
  await b.wait(2300);
  check('tap mode: no automatic flip, Next offered', !(await q(`fcCard.classList.contains('flip')`)) && (await exists('#fcNext')));
  await b.key(' '); await b.wait(80);
  check('Space flips', await q(`fcCard.classList.contains('flip')`));
  await b.key('ArrowRight'); await b.wait(80);
  check('Arrow → next card', (await q(`fcFront.querySelector('.vert').textContent`)) === '7×2');
  await b.js('history.back();'); await b.wait(300);
  check('browser Back leaves flashcards, timers stopped', (await timers()) === 0 && !(await visible('fc')));
  check('flashcard time saved on exit too', (await q('window.__galaxy.store.summary().flash.sessions')) === 2);
  check('flashcard settings did not change the test timer', (await q('window.__galaxy.state().settings.test.timer')) === 5);

  // =============== TEST (one Start; options in Parent Settings) ===============
  await goto('#/multiplication/test');
  check('test: one Start, summary of options', (await exists('#tsStart')) && !(await exists('#testSetup .seg')) && /10 questions/.test(await text('#testSetup')) && /5 seconds/.test(await text('#testSetup')));
  await goto('#/multiplication/settings');
  check('settings: 10 core tables × 10 questions is a practice test', /will not count toward mastery/.test(await text('#stMastery')));
  await setSetting('#stTestTables [data-fam="6"]'); await setSetting('#stTimer [data-v="2"]');
  check('settings: one table × 10 counts toward mastery', /Counts toward mastery/.test(await text('#stMastery')));
  await goto('#/multiplication/test');
  check('test summary updates', /the 6 table/.test(await text('#testSetup')) && /2 seconds/.test(await text('#testSetup')));
  await click('#tsStart', 30);
  let ts = (await state()).test;
  check('test: 10 questions from the 6s', ts.qs.length === 10 && ts.qs.every((x) => x.fam === 6));
  check('test: compact panel fits on desktop', await fitsY());
  check('test: no hints', !(await exists('#test #qHint')) && !/hint/i.test(await text('#test')));
  check('test: 2 s countdown', /2 s/.test(await text('#tTimer')));
  await shot('test-1280');
  await b.wait(1150);
  check('test: 1 s left after ~1 s', /1 s/.test(await text('#tTimer')), await text('#tTimer'));
  await type(ts.qs[0].answer); await enter();
  check('test: nothing graded during the test', /Question 2 of 10/.test(await text('#tCount')) && !/correct|wrong|not quite/i.test(await text('#test')));
  await type(ts.qs[1].answer + 1); await enter();
  const q3 = Date.now();
  while (/Question 3 of 10/.test(await text('#tCount')) && Date.now() - q3 < 4000) await b.wait(100);
  const q3ms = Date.now() - q3;
  check('test: blank question auto-advances at 2 s', q3ms >= 1700 && q3ms <= 2700, `${q3ms} ms`);
  for (let i = 3; i < 10; i++) { await type(ts.qs[i].answer); await enter(); }
  check('results: 80% with 8 / 1 / 1', (await text('#rPct')) === '80%' && J([await text('#rC'), await text('#rI'), await text('#rU')]) === J(['8', '1', '1']));
  check('results: missed facts and accuracy by table', (await q(`document.querySelectorAll('#rMissed li').length`)) === 2 && /6s\s*8 \/ 10\s*80%/.test(await text('#rFam tbody')));
  await shot('test-results-1280');
  await click('#rRetry', 50);
  ts = (await state()).test;
  check('retry missed facts: 2 questions', ts.kind === 'retry' && ts.qs.length === 2);
  await goto('#/multiplication');
  // hidden tab freezes the question timer
  await goto('#/multiplication/test'); await click('#tsStart', 30);
  await b.js(`Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange'));`);
  await b.wait(2600);
  check('hidden tab: timer frozen', /Question 1 of/.test(await text('#tCount')));
  await b.js(`Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange'));`);
  await b.wait(2500);
  check('visible again: timer continues', /Question 2 of/.test(await text('#tCount')));
  await goto('#/multiplication');
  // untimed + skip + 36 + Enter on a pad key + two-tap quit
  await goto('#/multiplication/settings');
  await setSetting('#stTimer [data-v="0"]'); await setSetting('#stTestCount [data-v="36"]'); await setSetting('#stTestTables [data-quick="core"]');
  await goto('#/multiplication/test'); await click('#tsStart', 50);
  ts = (await state()).test;
  check('36 questions, no repeats', ts.qs.length === 36 && new Set(ts.qs.map((x) => x.factKey)).size === 36);
  await click('#tSkip', 50);
  check('skip moves on', /Question 2 of 36/.test(await text('#tCount')));
  await b.js(`document.querySelector('#tPad [data-k="${String(ts.qs[1].answer)[0]}"]').focus();`);
  await type(ts.qs[1].answer); await enter();
  check('Enter on a focused pad key submits', /Question 3 of 36/.test(await text('#tCount')) && (await q('window.__galaxy.state().test.responses[1].given')) === String(ts.qs[1].answer));
  await click('#tQuit', 50);
  check('quit asks to confirm', /Tap again/.test(await text('#tQuit')));
  await click('#tQuit', 200);
  check('quit → menu, not saved', (await visible('menu')) && (await q('window.__galaxy.store.summary().tests.length')) === 1);
  // two separate perfect 10-question tests on the 6s → mastery
  await goto('#/multiplication/settings');
  await setSetting('#stTestCount [data-v="10"]'); await setSetting('#stTestTables [data-fam="6"]');
  for (let k = 0; k < 2; k++) {
    await goto('#/multiplication/test'); await click('#tsStart', 50);
    ts = (await state()).test;
    for (const x of ts.qs) { await type(x.answer); await enter(); }
  }
  check('two perfect tests → 6s mastered', await q('window.__galaxy.store.summary().families[5].mastered'));

  // =============== PROGRESS + PERSISTENCE (reopen the site) ===============
  await b.reload();
  await goto('#/multiplication/progress');
  check('progress after reload', await visible('progress'));
  check('progress: lessons kept', /^\d+\/13$/.test(await text('#pgLessons')) && (await text('#pgLessons')) !== '0/13');
  check('progress: tests kept', (await text('#pgTests')) === '3', await text('#pgTests'));
  check('progress: lab challenges kept', (await text('#pgLab')) === '1');
  check('progress: mastery kept', /6s.*⭐ Mastered/.test(await q(`document.querySelector('#pgTable').innerText.replace(/\\n/g, ' ')`)));
  const typeRows = await q(`[...document.querySelectorAll('#pgTypes tbody tr')].map(r => r.innerText)`);
  check('progress: all 12 kinds of problems listed', typeRows.length === 12);
  check('progress: constructive statuses only', typeRows.every((r) => !/weak|poor|bad|fail/i.test(r)));
  check('progress: missed problems listed', await exists('#pgMissed span'));
  check('progress: separates understanding / practice / reasoning / tests', /understanding/.test(await text('#progress')) && /reasoning/.test(await text('#progress')) && /independent tests/.test(await text('#progress')));
  await shot('progress-1280');
  await goto('#/multiplication/settings');
  check('parent settings persist after reload', (await q(`document.querySelector('#stTimer [aria-pressed=true]').dataset.v`)) === '0' && (await q(`document.querySelector('#stReveal [aria-pressed=true]').dataset.v`)) === '0');
  check('settings say they are not locked', /not locked/.test(await text('#settings')));
  await shot('settings-1280');

  // =============== RETURN HOME ===============
  await goto('#/multiplication/flashcards'); await click('#fsStart', 100);
  await click('.brand', 250);
  check('logo → home from flashcards; timers stopped', (await visible('landing')) && (await timers()) === 0);

  // =============== every lesson can be completed ===============
  const lessons = await q('window.GalaxyMultLessons.LESSONS.map(l => ({ id: l.id, guided: l.guided, check: l.check, steps: l.example.steps.length }))');
  for (const l of lessons) {
    await goto('#/multiplication/teach');
    await click(`[data-lesson=${l.id}]`);
    await click('#lessonNext'); await click('#lessonNext'); await click('#lessonNext');
    for (let i = 1; i < l.steps; i++) await click('#exMore', 40);
    await click('#lessonNext');
    const giveaways = await q(`[...document.querySelectorAll('#lessonQ .viz-jumps text')].map(e => e.textContent).filter(s => s === ${J(String(l.guided.answer))})`);
    check(`lesson ${l.id}: question picture does not show the answer`, giveaways.length === 0, J(giveaways));
    await answerQ(l.guided, true);
    const guidedOk = /Correct!/.test(await text('#qFeedback'));
    await enter();
    let ok = true;
    for (const c of l.check) { await answerQ(c, true); ok = ok && /Correct!/.test(await text('#qFeedback')); await enter(); }
    check(`lesson ${l.id}: completed through the UI`, guidedOk && ok && /Lesson complete!/.test(await text('#lesson')));
  }
  check('all 13 lessons complete', (await q('window.__galaxy.store.summary().lessonsDone')) === 13);
  await goto('#/multiplication/lab');
  check('after Teach (and parent override off) the Lab has every kind', await q(`window.GalaxyBank.unlockedTypes(window.__galaxy.store.completedLessons(), {}).length === 12`));

  // =============== EVERY VIEWPORT × EVERY SCREEN, incl. every problem type and long text ===============
  const longStory = await q(`window.GalaxyBank.generate('word', 7, 4, { rng: () => 0.99 }).prompt`);
  check('long word problem exists for layout testing', longStory.length > 150, String(longStory.length));
  for (const [w, h] of VIEWPORTS) {
    await b.viewport(w, h);
    await b.load(URL + '#/multiplication');
    for (const h2 of ['#/multiplication', '#/multiplication/teach', '#/multiplication/practice', '#/multiplication/lab', '#/multiplication/flashcards', '#/multiplication/test', '#/multiplication/progress', '#/multiplication/settings']) {
      await goto(h2);
      check(`${w}: ${h2.split('/').pop()} no horizontal overflow`, await noOverflowX());
    }
    // a 25-problem Lab with all kinds: every problem type laid out on this screen
    await goto('#/multiplication/lab'); await click('[data-size="25"]', 200);
    const labQs = (await state()).lab.qs;
    const seen = new Set();
    for (let i = 0; i < labQs.length; i++) {
      const t = labQs[i].typeId;
      if (!seen.has(t)) {
        seen.add(t);
        check(`${w}: ${t} no overflow`, await noOverflowX());
        const cut = await clippedText();
        check(`${w}: ${t} no clipped text`, cut.length === 0, J(cut));
        if (w >= 375) check(`${w}: ${t} Submit visible without scrolling`, await submitOnScreen());
        const small = await q(`[...document.querySelectorAll('#lab .numpad button, #lab .choices button, #qCheck, #qSkip')].filter(e => { const r = e.getBoundingClientRect(); return r.height < 44 || r.width < 44; }).length`);
        check(`${w}: ${t} touch targets ≥ 44 px`, small === 0);
        if (w === 390 && ['array', 'error', 'compare', 'match', 'word'].includes(t)) await shot(`lab-${t}-390`);
      }
      await click('#qSkip', 30); await click('#qNext', 60);
    }
    check(`${w}: lab covered all 12 kinds`, seen.size === 12, [...seen].join());
    // long text in a number problem and a choice problem
    await goto('#/multiplication/practice'); await click('#psStart', 150);
    // A real word problem has no picture, so show the long story the way the app would.
    await b.js(`qPrompt.textContent = ${J(longStory)}; qPrompt.classList.remove('big'); document.querySelector('.qa-visual').innerHTML = '';`);
    check(`${w}: long word problem: no overflow`, await noOverflowX());
    if (w >= 375) check(`${w}: long word problem: Submit visible`, await submitOnScreen());
    if (w === 320) await shot('practice-long-320');
    await goto('#/multiplication/flashcards'); await click('#fsStart', 150);
    check(`${w}: flashcards no overflow; card fits`, (await noOverflowX()) && (await q(`fcCard.getBoundingClientRect().width <= innerWidth - 24`)));
    if (w === 390) await shot('flashcards-390');
    await goto('#/multiplication/test'); await click('#tsStart', 150);
    check(`${w}: test no overflow`, await noOverflowX());
    check(`${w}: test pad keys ≥ 44 px`, await q(`[...document.querySelectorAll('#tPad button')].every(x => x.getBoundingClientRect().height >= 44)`));
    if (w === 390) await shot('test-390');
    await goto('#/multiplication/teach'); await click('[data-lesson=times-as-many]'); await click('#lessonNext'); await click('#lessonNext');
    check(`${w}: lesson picture no overflow`, await noOverflowX());
    if (w === 390) await shot('lesson-390');
    if ([1280, 1366].includes(w)) {
      for (const [h2, start] of [['#/multiplication/practice', '#psStart'], ['#/multiplication/flashcards', '#fsStart'], ['#/multiplication/test', '#tsStart']]) {
        await goto(h2); await click(start, 150);
        check(`${w}×${h}: ${h2.split('/').pop()} fits without scrolling`, await fitsY());
      }
    }
    await goto('#/multiplication');
  }

  // =============== storage blocked ===============
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `Storage.prototype.getItem = () => { throw new Error('blocked'); }; Storage.prototype.setItem = () => { throw new Error('blocked'); };` });
  await b.viewport(1280, 800);
  await b.load('about:blank');   // a real reload, so the storage override applies
  await b.load(URL + '#/multiplication/practice');
  check('blocked storage: practice renders', await visible('practiceSetup'));
  await click('#psStart', 150);
  ps = (await state()).practice;
  await answerQ(ps.qs[0], true);
  check('blocked storage: practice works', /Correct!/.test(await text('#qFeedback')));
  await goto('#/multiplication/progress');
  check('blocked storage: progress explains it cannot save', (await q('window.__galaxy.store.persistent')) === false && /not letting Galaxy Math save/.test(await text('#progress')));

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
console.log(`${pass}/${pass + fail} browser checks passed`);
process.exit(fail ? 1 : 0);
