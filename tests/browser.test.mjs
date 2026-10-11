// Browser checks for Galaxy Math: landing, menus, and the complete Multiplication experience
// (Teach, Practice, Flashcards, Test, Progress), walked through the way a child would use it.
// Run: npm run test:browser   (SHOT_DIR=... for screenshots; default tests/screenshots)
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
const q = (expr) => b.js(`return ${expr};`);
const click = async (sel, wait = 120) => { await b.js(`document.querySelector(${J(sel)}).click();`); await b.wait(wait); };
const exists = (sel) => q(`!!document.querySelector(${J(sel)})`);
const text = (sel) => q(`(document.querySelector(${J(sel)}) || {}).textContent || ''`);
const visible = (id) => q(`document.getElementById(${J(id)}).classList.contains('on')`);
const noOverflowX = () => q('document.documentElement.scrollWidth <= document.documentElement.clientWidth');
const fitsY = () => q('document.documentElement.scrollHeight <= innerHeight + 2');
const timers = () => q('window.__galaxy.timers.ids.size');
const state = () => q('window.__galaxy.state()');
const shot = (name) => b.shot(path.join(SHOT_DIR, `${name}.png`), false);
async function type(n) { for (const d of String(n)) await b.key(d); }
async function enter() { await b.key('Enter'); await b.wait(120); }
// Go to a hash; if it is already the current hash, re-run the router (like clicking a link to the same page).
async function goto(h) { await b.js(`if (location.hash === ${J(h)}) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = ${J(h)};`); await b.wait(250); }
async function freshStart() { await b.load(URL); await b.js('localStorage.clear();'); await b.load(URL); }

try {
  // =============== LAYOUT: landing at phone, tablet and desktop widths ===============
  for (const [w, h] of [[320, 640], [390, 844], [768, 1024], [1280, 800], [1366, 768]]) {
    await b.viewport(w, h);
    await freshStart();
    check(`${w}: landing visible`, await visible('landing'));
    check(`${w}: no horizontal overflow`, await noOverflowX());
    check(`${w}: four subject cards`, (await q(`document.querySelectorAll('#subjects .subject').length`)) === 4);
    const clipped = await q(`[...document.querySelectorAll('.subject .sName,.subject .badge')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent)`);
    check(`${w}: card text fits`, clipped.length === 0, J(clipped));
    // light surfaces with dark navy text
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
  check('division menu: all four locked', (await q(`[...document.querySelectorAll('#modes .mode')].filter(e => e.getAttribute('aria-disabled') === 'true').length`)) === 4);
  check('division: no progress page link', !(await exists('#menuExtra [data-nav$="/progress"]')));
  for (const a of ['teach', 'practice', 'flashcards', 'test', 'progress']) {
    await goto(`#/division/${a}`);
    check(`#/division/${a} cannot launch`, (await q('location.hash')) === '#/division' && (await visible('menu')));
  }
  await click('#modes [data-activity=teach]');
  check('division teach click does nothing', (await visible('menu')) && /coming soon/.test(await text('#menuNote')));

  // keyboard: reach and open Multiplication from the landing page
  await goto('#/');
  await b.js(`document.querySelector('[data-subject=multiplication]').focus();`);
  check('subject card is keyboard-focusable', (await q('document.activeElement.dataset.subject')) === 'multiplication');
  await b.key('Enter'); await b.wait(250);
  check('Enter opens Multiplication', (await visible('menu')) && (await q('location.hash')) === '#/multiplication');
  const modes = await q(`[...document.querySelectorAll('#modes .mode')].map(e => [e.dataset.activity, e.getAttribute('aria-disabled')])`);
  check('multiplication: all four activities ready', J(modes) === J([['teach', null], ['practice', null], ['flashcards', null], ['test', null]]), J(modes));
  check('menu fits on desktop', await fitsY());
  await shot('menu-multiplication-1280');

  // =============== TEACH: complete a real lesson ===============
  await click('#modes [data-activity=teach]', 200);
  check('teach list: 10 lessons', (await q(`document.querySelectorAll('[data-lesson]').length`)) === 10);
  check('teach: 0 done at start', /0 of 10 done/.test(await text('#teach .badge.done')));
  // Opening a lesson and leaving does not complete it.
  await click('[data-lesson=arrays]');
  await click('#lessonNext');
  await click('[data-nav="#/multiplication/teach"]', 200);
  check('opening a lesson does not complete it', /Not started/.test(await text('[data-lesson=arrays]')));
  await click('[data-lesson=equal-groups]');
  check('lesson step 1: objective + key words', /Step 1 of 6 · Objective/.test(await text('#stepLabel')) && /equal groups/.test(await text('.words')));
  await click('#lessonNext');
  check('lesson step 2: picture of equal groups', /Picture it/.test(await text('#stepLabel')) && (await q(`document.querySelectorAll('#lesson .viz-groups .grp').length`)) === 7);
  await shot('lesson-picture-1280');
  await click('#lessonNext');
  check('worked example: Next waits for all steps', await q('lessonNext.disabled'));
  for (let i = 0; i < 3; i++) await click('#exMore', 60);
  check('worked example: all 4 steps shown', (await q(`[...document.querySelectorAll('.ex-steps li')].filter(l => !l.hidden).length`)) === 4 && !(await q('lessonNext.disabled')));
  await click('#lessonNext');
  check('guided problem shown with hint button', /Try it together/.test(await text('#stepLabel')) && (await exists('#qHint')));
  await type(11); await enter();
  check('guided: wrong answer → specific try-again feedback', /Not quite — try again/.test(await text('#qFeedback')) && /Count by 4s/.test(await text('#qFeedback')));
  check('guided: answer box cleared', (await text('#qAnswer')) === '');
  await shot('lesson-guided-feedback-1280');
  await type(12); await enter();
  check('guided: correct answer accepted', /You got it!/.test(await text('#qFeedback')));
  await enter();
  check('independent check: question 1 of 3, no hint', /Question 1 of 3/.test(await text('#lesson')) && !(await exists('#qHint')));
  await type(10); await enter();
  check('check q1 correct', /Correct!/.test(await text('#qFeedback')));
  await enter();
  await click('[data-opt="No"]', 50); await click('#qCheck');
  check('check q2 (choice) correct', /Correct!/.test(await text('#qFeedback')));
  await enter();
  await type(21); await enter();
  check('check q3 wrong → shows answer and explanation', /The answer is 20/.test(await text('#qFeedback')) && /count 5, 10, 15, 20/.test(await text('#qFeedback')));
  await enter();
  check('lesson complete with 2 of 3', /Lesson complete!/.test(await text('#lesson')) && /2 of 3/.test(await text('.big-score')));
  await shot('lesson-complete-1280');
  check('lesson saved as completed', await q(`window.__galaxy.store.summary().lessons['equal-groups'].completed === true`));
  // A failed check does not complete a lesson.
  await goto('#/multiplication/teach');
  await click('[data-lesson=rows-columns]');
  await click('#lessonNext'); await click('#lessonNext');
  for (let i = 0; i < 3; i++) await click('#exMore', 40);
  await click('#lessonNext');
  await type(4); await enter(); await enter();
  for (const wrong of [1, 1, 1]) { await type(wrong); await enter(); await enter(); }
  check('failed check: not complete, offers retry', /Almost there!/.test(await text('#lesson')) && (await exists('#retryCheck')));
  check('failed lesson not marked complete', await q(`window.__galaxy.store.summary().lessons['rows-columns'].completed === false`));
  await click('#retryCheck');
  check('retry goes back to the check', /Question 1 of 3/.test(await text('#lesson')));

  // =============== PRACTICE ===============
  await goto('#/multiplication/practice');
  await click('#psFam [data-fam="3"]');   // all selected → tapping 3 picks only the 3s
  await click('#psCount [data-v="10"]');
  check('practice setup: 3s only', J(await q('window.__galaxy.state().settings.practice.families')) === '[3]');
  await click('#psStart', 200);
  let ps = (await state()).practice;
  check('practice: 10 questions, all 3s', ps.qs.length === 10 && ps.qs.every((x) => x.fam === 3));
  check('practice: several question types', new Set(ps.qs.map((x) => x.type)).size >= 4, J(ps.qs.map((x) => x.type)));
  check('practice: no repeated question', new Set(ps.qs.map((x) => x.key)).size === 10);
  check('practice: progress indicator', /Question 1 of 10/.test(await text('#pCount')));
  check('practice fits on desktop', await fitsY());
  // Q1: wrong twice → explanation with the answer
  await type(ps.qs[0].answer + 1); await enter();
  check('practice: first miss → hint and try again', /Not quite — try again/.test(await text('#qFeedback')));
  await type(ps.qs[0].answer + 2); await enter();
  check('practice: second miss → explanation with answer', new RegExp(`The answer is ${ps.qs[0].answer}`).test(await text('#qFeedback')));
  check('practice: explanation has a picture', await q(`!!document.querySelector('#qFeedback svg.viz, #pQ svg.viz')`));
  await shot('practice-feedback-1280');
  await enter();
  // Q2: ask for a hint, then answer correctly
  await click('#qHint');
  check('practice: hint shown on request', /Hint:/.test(await text('#qHintBox')));
  await type(ps.qs[1].answer); await enter();
  check('practice: correct answer', /Correct!/.test(await text('#qFeedback')));
  await enter();
  for (let i = 2; i < 10; i++) { await type(ps.qs[i].answer); await enter(); await enter(); }
  check('practice: completion + review screen', (await visible('practiceDone')) && /9 of 10/.test(await text('#practiceDone')));
  check('practice: review lists the miss', (await q(`document.querySelectorAll('#practiceDone .missed-list li').length`)) === 1);
  await shot('practice-done-1280');
  const missKey = ps.qs[0].factKey;
  check('practice: miss saved', await q(`window.__galaxy.store.missedFacts().some(f => f.fam + 'x' + f.other === ${J(missKey)})`));
  await goto('#/multiplication/practice');
  check('practice my misses offered', await exists('#psMisses'));
  await click('#psMisses', 200);
  ps = (await state()).practice;
  check('practice my misses: only missed facts', ps.qs.every((x) => x.factKey === missKey) && ps.fromMisses);
  await click('[data-nav="#/multiplication"]', 200);
  check('exit practice → menu, no timers', (await visible('menu')) && (await timers()) === 0);

  // =============== FLASHCARDS ===============
  await goto('#/multiplication/flashcards');
  await click('#fsFam [data-fam="7"]');
  await click('#fsReveal [data-v="2"]'); await click('#fsHold [data-v="1"]'); await click('#fsMin [data-v="3"]'); await click('#fsOrder [data-v="order"]');
  check('flashcard setup fits on desktop', await fitsY());
  await click('#fsStart', 50);
  const t0 = Date.now();
  check('flashcards: vertical 7 × 1 first (in order)', (await q(`fcFront.querySelector('.vert').textContent`)) === '7×1');
  check('flashcards: fits on desktop', await fitsY());
  await shot('flashcards-front-1280');
  await b.wait(Math.max(0, 1500 - (Date.now() - t0)));
  check('flashcards: not flipped before 2 s', !(await q(`fcCard.classList.contains('flip')`)));
  await b.wait(Math.max(0, 2450 - (Date.now() - t0)));
  check('flashcards: flipped after 2 s', await q(`fcCard.classList.contains('flip')`));
  check('flashcards: back shows the answer', /^56|^7/.test(await text('#fcBack')) && /7 × 1 = 7/.test(await text('#fcBack')));
  await shot('flashcards-back-1280');
  await b.wait(Math.max(0, 3500 - (Date.now() - t0)));
  check('flashcards: next card after the 1 s answer hold', (await q(`fcFront.querySelector('.vert').textContent`)) === '7×2' && /2 cards/.test(await text('#fcSeen')));
  // pause: nothing moves
  await click('#fcPause', 50);
  const clockA = await text('#fcClock');
  await b.wait(2600);
  check('pause: card does not change', (await q(`fcFront.querySelector('.vert').textContent`)) === '7×2');
  check('pause: clock stops', (await text('#fcClock')) === clockA);
  await click('#fcPause', 50);
  check('resume', (await text('#fcPause')) === '⏸ Pause');
  await click('#fcNext', 50); await click('#fcPrev', 50);
  check('previous/next', (await q(`fcFront.querySelector('.vert').textContent`)) === '7×2');
  await click('#fcShuffle', 50);
  check('shuffle keeps the 7s deck', (await q('window.__galaxy.state().fc.deck.length')) === 12 && (await q('window.__galaxy.state().fc.deck.every(f => f.fam === 7)')));
  await click('#fcEnd', 200);
  check('finish → summary, never a test', (await visible('fcDone')) && !(await visible('test')));
  check('flashcard session saved (time only, not mastery)', (await q('window.__galaxy.store.summary().flash.sessions')) === 1);
  check('no timers after flashcards end', (await timers()) === 0);
  // manual flip mode
  await goto('#/multiplication/flashcards');
  await click('#fsReveal [data-v="0"]');
  check('answer-hold control disabled in tap mode', await q(`document.querySelector('#fsHold [data-v="1"]').disabled`));
  await click('#fsStart', 50);
  await b.wait(2300);
  check('tap mode: no automatic flip', !(await q(`fcCard.classList.contains('flip')`)));
  await b.key(' '); await b.wait(80);
  check('Space flips the card', await q(`fcCard.classList.contains('flip')`));
  await b.key('ArrowRight'); await b.wait(80);
  check('Arrow key → next card', (await q(`fcFront.querySelector('.vert').textContent`)) === '7×2');
  await b.js('history.back();'); await b.wait(300);
  check('browser Back leaves flashcards, timers stopped', (await visible('menu')) && (await timers()) === 0);
  check('leaving flashcards early still saves the session time', (await q('window.__galaxy.store.summary().flash.sessions')) === 2);
  check('flashcard timer did not change Test timer', (await q('window.__galaxy.state().settings.test.timer')) === 5);

  // =============== TEST ===============
  await goto('#/multiplication/test');
  check('test setup: timer 5 s still selected', (await q(`document.querySelector('#tsTimer [aria-pressed=true]').dataset.v`)) === '5');
  check('setup: 12 tables × 10 questions is labelled a practice test', /will not count toward mastery/.test(await text('#tsMastery')) && /up to 2 tables/.test(await text('#tsMastery')));
  await click('#tsFam [data-fam="6"]'); await click('#tsCount [data-v="10"]'); await click('#tsTimer [data-v="2"]');
  check('setup: one table × 10 questions counts toward mastery', /Counts toward mastery/.test(await text('#tsMastery')));
  await click('#tsStart', 30);
  let ts = (await state()).test;
  check('test: 10 questions from the 6s', ts.qs.length === 10 && ts.qs.every((x) => x.fam === 6));
  check('test: compact panel fits on desktop', await fitsY());
  check('test: no hints anywhere', !(await exists('#test #qHint')) && !/hint/i.test(await text('#test')));
  check('test: 2 s countdown shown', /2 s/.test(await text('#tTimer')));
  await shot('test-1280');
  await b.wait(1150);
  check('test: countdown at 1 s after ~1 s', /1 s/.test(await text('#tTimer')), await text('#tTimer'));
  await type(ts.qs[0].answer); await enter();
  check('test: no right/wrong shown before grading', /Question 2 of 10/.test(await text('#tCount')) && !/correct|wrong|not quite/i.test(await text('#test')));
  await type(ts.qs[1].answer + 1); await enter();
  // Q3: leave blank → time runs out → unanswered
  const q3 = Date.now();
  while (/Question 3 of 10/.test(await text('#tCount')) && Date.now() - q3 < 4000) await b.wait(100);
  const q3ms = Date.now() - q3;
  check('test: blank question auto-advances when 2 s run out', q3ms >= 1700 && q3ms <= 2700, `${q3ms} ms`);
  for (let i = 3; i < 10; i++) { await type(ts.qs[i].answer); await enter(); }
  check('test results shown', await visible('testDone'));
  check('results: 80%', (await text('#rPct')) === '80%');
  check('results: 8 correct / 1 incorrect / 1 unanswered', J([await text('#rC'), await text('#rI'), await text('#rU')]) === J(['8', '1', '1']));
  check('results: missed facts listed', (await q(`document.querySelectorAll('#rMissed li').length`)) === 2 && /no answer/.test(await text('#rMissed')) && /you answered/.test(await text('#rMissed')));
  check('results: accuracy by table', /6s\s*8 \/ 10\s*80%/.test(await text('#rFam tbody')));
  check('results: speed shown separately', /per correct answer/.test(await text('#testDone')));
  await shot('test-results-1280');
  await click('#rRetry', 50);
  ts = (await state()).test;
  check('retry missed facts: just the 2 misses', ts.kind === 'retry' && ts.qs.length === 2);
  await goto('#/multiplication');
  check('quit retry → menu, no timers', (await visible('menu')) && (await timers()) === 0);
  // a hidden tab freezes the question timer instead of letting questions expire unseen
  await goto('#/multiplication/test'); await click('#tsStart', 30);
  await b.js(`Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange'));`);
  await b.wait(2600);
  check('hidden tab: test timer frozen', /Question 1 of/.test(await text('#tCount')));
  await b.js(`Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange'));`);
  await b.wait(2500);
  check('visible again: timer continues', /Question 2 of/.test(await text('#tCount')));
  await goto('#/multiplication');
  // untimed test + skip, and 36-question option
  await goto('#/multiplication/test');
  await click('#tsTimer [data-v="0"]'); await click('#tsCount [data-v="36"]'); await click('#tsFam [data-quick="all"]');
  await click('#tsStart', 50);
  ts = (await state()).test;
  check('36-question test, no repeats', ts.qs.length === 36 && new Set(ts.qs.map((x) => x.factKey)).size === 36);
  check('untimed: no countdown, Skip offered', !(await exists('#tTimer')) && (await exists('#tSkip')));
  await click('#tSkip', 50);
  check('skip moves on', /Question 2 of 36/.test(await text('#tCount')));
  ts = (await state()).test;
  await b.js(`document.querySelector('#tPad [data-k="${String(ts.qs[1].answer)[0]}"]').focus();`);
  for (const d of String(ts.qs[1].answer)) await b.key(d);
  await enter();
  check('Enter on a focused number-pad key submits (no extra digit)', /Question 3 of 36/.test(await text('#tCount')) && (await q('window.__galaxy.state().test.responses[1].given')) === String(ts.qs[1].answer));
  await click('#tQuit', 50);
  check('quit asks to confirm', /Tap again/.test(await text('#tQuit')) && (await visible('test')));
  await click('#tQuit', 200);
  check('quit → menu, not saved', (await visible('menu')) && (await q('window.__galaxy.store.summary().tests.length')) === 1);
  // Two separate untimed 10-question tests at 100% on the 6s → mastery
  for (let k = 0; k < 2; k++) {
    await goto('#/multiplication/test');
    await click('#tsFam [data-quick="all"]'); await click('#tsFam [data-fam="6"]'); await click('#tsCount [data-v="10"]');
    await click('#tsStart', 50);
    ts = (await state()).test;
    for (const x of ts.qs) { await type(x.answer); await enter(); }
  }
  check('two perfect tests → 6s mastered', await q('window.__galaxy.store.summary().families[5].mastered'));

  // =============== PROGRESS + PERSISTENCE ===============
  await b.reload();
  await goto('#/multiplication/progress');
  check('progress page after reload', await visible('progress'));
  check('progress: lesson kept', (await text('#pgLessons')) === '1/10');
  check('progress: tests kept', (await text('#pgTests')) === '3', await text('#pgTests'));
  check('progress: mastery kept', /6s.*⭐ Mastered/.test(await q(`document.querySelector('#pgTable').innerText.replace(/\\n/g, ' ')`)));
  check('progress: missed facts listed', /Facts to practice/.test(await text('#progress')) && !/None right now/.test(await text('#progress')));
  check('progress: milestones', /Mastered the 6s/.test(await text('#progress')) && /first Teach lesson/.test(await text('#progress')));
  check('progress: flashcards are not mastery', /Opening lessons or flashcards never counts as mastery/.test(await text('#progress')));
  await shot('progress-1280');
  await goto('#/multiplication/teach');
  check('teach list remembers completion after reload', /Completed/.test(await text('[data-lesson=equal-groups]')));

  // =============== RETURN HOME from anywhere ===============
  await goto('#/multiplication/flashcards');
  await click('#fsStart', 100);
  await click('.brand', 250);
  check('logo → home from flashcards; timers stopped', (await visible('landing')) && (await timers()) === 0);

  // =============== every lesson can be completed through the real UI ===============
  const lessons = await q('window.GalaxyMultLessons.LESSONS.map(l => ({ id: l.id, guided: l.guided, check: l.check, steps: l.example.steps.length }))');
  async function answer(item) {
    if (item.type === 'choice') { await click(`#lesson [data-opt=${J(item.answer)}]`, 40); await click('#qCheck'); }
    else { await type(item.answer); await enter(); }
  }
  for (const l of lessons) {
    await goto('#/multiplication/teach');
    await click(`[data-lesson=${l.id}]`);
    await click('#lessonNext'); await click('#lessonNext');
    for (let i = 1; i < l.steps; i++) await click('#exMore', 40);
    await click('#lessonNext');
    const giveaways = await q(`[...document.querySelectorAll('#lessonQ .viz-jumps text')].map(e => e.textContent).filter(s => s === ${J(String(l.guided.answer))})`);
    check(`lesson ${l.id}: question picture does not show the answer`, giveaways.length === 0, J(giveaways));
    await answer(l.guided);
    const guidedOk = /You got it!|Correct!/.test(await text('#qFeedback'));
    await enter();
    let checkOk = true;
    for (const c of l.check) { await answer(c); checkOk = checkOk && /Correct!/.test(await text('#qFeedback')); await enter(); }
    check(`lesson ${l.id}: guided + 3 checks answered correctly`, guidedOk && checkOk);
    check(`lesson ${l.id}: completed`, /Lesson complete!/.test(await text('#lesson')) && /3 of 3/.test(await text('.big-score')));
  }
  check('all 10 lessons complete', (await q('window.__galaxy.store.summary().lessonsDone')) === 10);
  check('milestone: all 10 lessons', await q(`window.__galaxy.store.summary().milestones.includes('Finished all 10 Teach lessons')`));

  // =============== MOBILE + TABLET: every multiplication screen ===============
  for (const [w, h] of [[390, 844], [768, 1024]]) {
    await b.viewport(w, h);
    await b.load(URL + '#/multiplication');
    const screens = [['menu', null], ['teach', '#/multiplication/teach'], ['practiceSetup', '#/multiplication/practice'], ['fcSetup', '#/multiplication/flashcards'], ['testSetup', '#/multiplication/test'], ['progress', '#/multiplication/progress']];
    for (const [id, h2] of screens) {
      if (h2) await goto(h2);
      check(`${w}: ${id} no horizontal overflow`, await noOverflowX());
    }
    await goto('#/multiplication/practice'); await click('#psStart', 150);
    check(`${w}: practice no overflow`, await noOverflowX());
    if (w === 390) await shot('practice-390');
    await goto('#/multiplication/flashcards'); await click('#fsStart', 150);
    check(`${w}: flashcards no overflow`, await noOverflowX());
    check(`${w}: flashcard card fits`, await q(`fcCard.getBoundingClientRect().width <= innerWidth - 24`));
    if (w === 390) await shot('flashcards-390');
    await goto('#/multiplication/test'); await click('#tsStart', 150);
    check(`${w}: test no overflow`, await noOverflowX());
    const padOk = await q(`[...document.querySelectorAll('#tPad button')].every(x => x.getBoundingClientRect().height >= 44)`);
    check(`${w}: number pad keys ≥ 44 px`, padOk);
    if (w === 390) await shot('test-390');
    await goto('#/multiplication/teach'); await click('[data-lesson=arrays]'); await click('#lessonNext');
    check(`${w}: lesson no overflow`, await noOverflowX());
    if (w === 390) await shot('lesson-390');
  }

  // =============== desktop 1366×768 fit ===============
  await b.viewport(1366, 768);
  for (const [h2, start] of [['#/multiplication/practice', '#psStart'], ['#/multiplication/flashcards', '#fsStart'], ['#/multiplication/test', '#tsStart']]) {
    await b.load(URL + h2); await click(start, 150);
    check(`1366×768: ${h2.split('/').pop()} fits without scrolling`, await fitsY());
  }

  // =============== storage blocked ===============
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `Storage.prototype.getItem = () => { throw new Error('blocked'); }; Storage.prototype.setItem = () => { throw new Error('blocked'); };` });
  await b.viewport(1280, 800);
  await b.load('about:blank');   // a real reload, so the storage override applies
  await b.load(URL + '#/multiplication/practice');
  check('blocked storage: practice setup renders', await visible('practiceSetup'));
  await click('#psStart', 150);
  ps = (await state()).practice;
  await type(ps.qs[0].answer); await enter();
  check('blocked storage: practice works', /Correct!/.test(await text('#qFeedback')));
  await goto('#/multiplication/progress');
  check('blocked storage: store reports not persistent', (await q('window.__galaxy.store.persistent')) === false);
  check('blocked storage: progress explains it cannot save', /not letting Galaxy Math save/.test(await text('#progress')));

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
