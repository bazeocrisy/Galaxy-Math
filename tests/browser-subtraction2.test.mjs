// Browser checks for Subtraction 2.0: the Math Thinking Lab (reasoning bank in the shared Galaxy question screen,
// SubtractKit workspaces for regrouping answers), Flashcards (reveal, pause, "See the regrouping", confidence),
// Subtraction Parent Settings, Progress, separate records, cleanup and layout at the six review sizes.
// Run: node tests/browser-subtraction2.test.mjs   (LIVE_URL=... to test the published site)
import { startServer, startBrowser, BASE } from './lib/harness.mjs';

const LIVE = process.env.LIVE_URL;
const server = LIVE ? { origin: '', missing: [], close() {} } : await startServer();
const b = await startBrowser();
const URL = LIVE ? LIVE.replace(/\/?$/, '/') : server.origin + BASE;
console.log(`Testing Subtraction 2.0 at ${URL}`);
let pass = 0, fail = 0;
function check(name, ok, detail = '') { if (ok) pass++; else { fail++; console.log(`FAIL ${name} ${detail}`); } }
const J = JSON.stringify;
const VIEWPORTS = [[320, 640], [375, 812], [390, 844], [768, 1024], [1280, 800], [1366, 768]];
const q = (expr) => b.js(`return ${expr};`);
const click = async (sel, wait = 120) => { await b.js(`document.querySelector(${J(sel)}).click();`); await b.wait(wait); };
const exists = (sel) => q(`!!document.querySelector(${J(sel)})`);
const text = (sel) => q(`(document.querySelector(${J(sel)}) || {}).textContent || ''`);
const visible = (sel) => q(`(() => { const e = document.querySelector(${J(sel)}); if (!e) return false; const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && e.getClientRects().length > 0 && !e.closest('[hidden]'); })()`);
const noOverflowX = () => q('document.documentElement.scrollWidth <= document.documentElement.clientWidth');
const gridInside = () => q(`[...document.querySelectorAll('#sub .sk-grid')].every(g => { const r = g.getBoundingClientRect(), p = g.closest('.panel').getBoundingClientRect(); return r.left >= p.left - 1 && r.right <= p.right + 1; })`);
const sub = (expr) => q(`window.GalaxySubtraction.store.${expr}`);
async function goto(h) { await b.js(`if (location.hash === ${J(h)}) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = ${J(h)};`); await b.wait(300); }
async function freshStart() { await b.load(URL); await b.js('localStorage.clear();'); await b.load(URL); }
/** The Lab question on screen (rebuilt from the saved session, as the app does). */
const labQ = () => q(`(() => { const a = GalaxySubtraction.store.activeLab(); if (!a) return null; const qs = GalaxySubBank.makeSession({ seed: a.seed, count: a.count, level: a.level, types: a.types }); const i = qs.findIndex((_, k) => !a.answers[k]); return i < 0 ? null : Object.assign(qs[i], { i, n: qs.length }); })()`);
async function typeWs(value) {
  const ds = String(value).split('').reverse();
  for (let i = 0; i < ds.length; i++) { await b.js(`document.querySelector('#qWs [data-k="a${i}"]').focus();`); await b.key(ds[i]); }
}
/** Answer the Lab question on screen right (or wrong), the way a child would. */
async function answerLab(item, right = true) {
  if (item.format === 'choice') { const opt = right ? item.answer : item.options.find((o) => o !== item.answer); await click(`[data-opt=${J(opt)}]`, 40); }
  else if (item.format === 'workspace') await typeWs(right ? item.answer : item.answer + 1);
  else { await b.js(`document.activeElement && document.activeElement.blur()`); for (const ch of String(right ? item.answer : item.answer + 1)) await b.key(ch); }
  await click('#qCheck', 150);
}
async function startLabOf(types, count = 3) {   // a short session of chosen kinds (the same path as "Practice my misses")
  await b.js(`GalaxySubtraction.store.startLab({ seed: 1234, count: ${count}, level: 3, kind: 'misses', types: ${J(types)} })`);
  await goto('#/subtraction/lab'); await click('#labContinue', 300);
}

try {
  // =============== layout at the six sizes ===============
  for (const [w, h] of VIEWPORTS) {
    await b.viewport(w, h);
    await freshStart();
    for (const route of ['#/subtraction', '#/subtraction/lab', '#/subtraction/flashcards', '#/subtraction/settings', '#/subtraction/progress']) {
      await goto(route); check(`${w}: ${route} no horizontal overflow`, await noOverflowX());
    }
    for (const kinds of [['vsub'], ['zeros'], ['model'], ['error'], ['exchange'], ['strategy']]) {
      await startLabOf(kinds, 2);
      check(`${w}: Lab ${kinds[0]} fits; Submit reachable`, (await noOverflowX()) && (await gridInside()) && (await q(`document.getElementById('qCheck').getBoundingClientRect().right <= innerWidth`)));
    }
    await goto('#/subtraction/flashcards'); await click('[data-fsize="4"]', 250);
    check(`${w}: 4-digit flashcard fits`, (await noOverflowX()) && (await q(`document.getElementById('sfCard').getBoundingClientRect().right <= innerWidth`)));
    await click('#sfFlip', 100); await click('#sfSee', 250);
    check(`${w}: "See the regrouping" fits`, (await noOverflowX()) && (await gridInside()));
  }

  // =============== menu ===============
  await b.viewport(1280, 800);
  await freshStart();
  await b.js(`window.__galaxy.rootStore.recordLesson('arrays', 3, true); localStorage.setItem('galaxy-math.settings', JSON.stringify({ v: 2, multiplication: { fc: { reveal: 5 } } }));`);
  const multBefore = await q(`localStorage.getItem('galaxy-math.progress')`), setBefore = await q(`localStorage.getItem('galaxy-math.settings')`);
  await goto('#/subtraction');
  const modes = await q(`[...document.querySelectorAll('#modes .mode')].map(e => [e.dataset.activity, e.getAttribute('aria-disabled')])`);
  check('menu: all five activities ready, in the shared order', J(modes) === J([['teach', null], ['practice', null], ['lab', null], ['flashcards', null], ['test', null]]), J(modes));
  check('menu: Progress and Parent Settings links', (await exists('#menuExtra [data-nav="#/subtraction/progress"]')) && (await exists('#menuExtra [data-nav="#/subtraction/settings"]')));

  // =============== LAB: a 10-question challenge ===============
  await goto('#/subtraction/lab');
  check('lab setup: 10 / 25 / 50 and the level in words', (await q(`[...document.querySelectorAll('#sub [data-size]')].map(e => e.dataset.size).join()`)) === '10,25,50' && /2- and 3-digit problems with one exchange/.test(await text('#labLevel')));
  await click('[data-size="10"]', 300);
  let item = await labQ();
  const plan = ['right', 'right', 'wrong', 'skip', 'right', 'right', 'skip', 'right', 'right', 'right'];
  const kinds = new Set(), sizes = [];
  for (let k = 0; k < 10; k++) {
    item = await labQ();
    kinds.add(item.typeId); sizes.push(String(item.top).length);
    if (k === 0) {
      check('lab: one problem at a time, no hint, Skip and Submit', (await exists('#qSkip')) && !(await exists('#qHint')) && /Submit/.test(await text('#qCheck')) && /Problem 1 of 10/.test(await text('#lCount')));
      check('lab: the kind of problem is not named before answering', !/Kind of problem/.test(await text('#sub')));
    }
    if (plan[k] === 'skip') await click('#qSkip', 150); else await answerLab(item, plan[k] === 'right');
    const fbText = await text('#qFeedback');
    if (plan[k] === 'right') check(`lab ${k + 1} (${item.typeId}): right → explanation and kind`, /Correct!/.test(fbText) && /Kind of problem/.test(fbText), fbText);
    else check(`lab ${k + 1} (${item.typeId}): ${plan[k]} → answer, explanation and kind`, /The answer is/.test(fbText) && /Kind of problem/.test(fbText), fbText);
    if (item.top) check(`lab ${k + 1}: "See it worked" after answering`, await exists('#sub .sr-seeit [data-seeit]'));
    if (item.format === 'workspace') check(`lab ${k + 1}: the workspace is locked after Submit`, (await exists('#qWs .sk-mode-view')) && !(await exists('#qWs input')));
    if (k === 4) {   // save and restore mid-session
      await b.reload(); await goto('#/subtraction/lab');
      check('lab saved: Continue shows 5 of 10 answered', /5 of 10 answered/.test(await text('#sub .panel.cream')));
      await click('#labContinue', 300);
      check('lab restored at problem 6, no answer recorded twice', /Problem 6 of 10/.test(await text('#lCount')) && Object.keys(await sub('activeLab().answers')).length === 5);
      continue;
    }
    await click('#qNext', 250);
  }
  check('lab: ten different kinds in a 10-question challenge', kinds.size === 10, J([...kinds]));
  check('lab: level 1 never shows 4-digit numbers', sizes.every((n) => n <= 3), J(sizes));
  check('lab report: 70%, 7 / 1 / 2', (await text('#ldPct')) === '70%' && J([await text('#ldC'), await text('#ldI'), await text('#ldU')]) === J(['7', '1', '2']));
  check('lab report: by kind, missed problems, recommended lessons', (await q(`document.querySelectorAll('#ldTypes tbody tr').length`)) === 10 && (await q(`document.querySelectorAll('#ldMissed li').length`)) === 3 && (await exists('#ldRecs [data-rec]')));
  await b.js(`const d = document.querySelector('#ldMissed details'); d.open = true; d.dispatchEvent(new Event('toggle'));`); await b.wait(100);
  check('lab report: a missed problem can be worked again', await exists('#ldMissed [data-seeit]'));
  check('lab saved once, apart from Practice, Test and Teach', (await sub('labSessions().length')) === 1 && (await sub('sessions().length')) === 0 && (await sub('tests().length')) === 0 && (await sub('lessonsSummary().done')) === 0 && (await sub('activeLab()')) === null);
  const missedTypes = await sub('labSessions()[0].missedTypes');
  await click('#ldMisses', 300);
  const mq = await sub('activeLab()');
  check('Practice my misses: only the missed kinds, new problems', mq.kind === 'misses' && J([...mq.types].sort()) === J([...missedTypes].sort()) && mq.count === 3);
  await b.js(`GalaxySubtraction.store.quitLab()`);

  // =============== LAB: 25 and 50, readiness levels ===============
  for (const [count, level] of [[25, 'auto'], [50, 3]]) {
    await b.js(`GalaxySubtraction.store.setSettings({ lab: { level: ${J(level)} } })`);
    await goto('#/subtraction/lab'); await click(`[data-size="${count}"]`, 250);
    const qs = await q(`(() => { const a = GalaxySubtraction.store.activeLab(); return GalaxySubBank.makeSession({ seed: a.seed, count: a.count, level: a.level }).map(x => [x.typeId, String(x.top).length, x.top + '-' + x.bottom]); })()`);
    check(`lab ${count}: right length, no repeats, many kinds`, qs.length === count && new Set(qs.map((x) => x[2])).size === count && new Set(qs.map((x) => x[0])).size === (level === 3 ? 12 : 11), J(qs.map((x) => x[0])));
    if (level === 3) check('lab level 3 (set by a parent): includes 4-digit and across-zeros problems', qs.some((x) => x[1] === 4) && qs.some((x) => x[0] === 'zeros'));
    for (let k = 0; k < 3; k++) { await click('#qSkip', 80); await click('#qNext', 150); }
    await click('#labExit', 60); await click('#labFinishNow', 300);
    check(`lab ${count}: Exit → finish early with the answered problems`, /Lab report/.test(await text('#subLabDoneTitle')) && (await text('#ldU')) === '3');
  }
  await b.js(`GalaxySubtraction.store.setSettings({ lab: { level: 'auto' } })`);

  // =============== FLASHCARDS ===============
  await goto('#/subtraction/flashcards');
  check('flashcards: 2-, 3-, 4-digit and Mixed', (await q(`[...document.querySelectorAll('#sfPick [data-fsize]')].map(e => e.dataset.fsize).join()`)) === '2,3,4,mixed');
  await b.js(`GalaxySubtraction.store.setSettings({ flash: { reveal: 'auto', cards: 10, mix: 'standard' } })`);
  await click('[data-fsize="2"]', 200);
  let t0 = Date.now();
  const card = await q(`document.getElementById('sfCard').getAttribute('aria-label')`);
  check('flashcard: a clear 2-digit equation, auto reveal 8 s for 2-digit', /^Flash card: \d{2} minus \d{1,2}\./.test(card) && /8 seconds/.test(await text('#sfStatus')), card);
  await b.wait(Math.max(0, 6500 - (Date.now() - t0)));
  check('flashcard: not flipped before 8 s', !(await q(`document.getElementById('sfCard').classList.contains('flip')`)));
  await b.wait(Math.max(0, 8700 - (Date.now() - t0)));
  check('flashcard: answer shows after 8 s', await q(`document.getElementById('sfCard').classList.contains('flip')`));
  await b.wait(3000);
  check('flashcard: never moves on by itself after the answer', /Card 1 of 10/.test(await text('#sfCount')) && (await visible('#sfAfter')));
  await click('[data-conf="knew"]', 150);
  check('"I knew it" → next card', /Card 2 of 10/.test(await text('#sfCount')) && !(await q(`document.getElementById('sfCard').classList.contains('flip')`)));
  await click('#sfCard', 100);
  check('tap the card to see the answer early', await q(`document.getElementById('sfCard').classList.contains('flip')`));
  await click('[data-conf="notYet"]', 150);
  // pause stops the countdown
  t0 = Date.now(); await b.wait(1000); await click('#sfPause', 60);
  await b.wait(9000);
  check('pause stops the countdown', !(await q(`document.getElementById('sfCard').classList.contains('flip')`)) && /Paused/.test(await text('#sfStatus')) && (await q(`document.getElementById('sfFlip').disabled`)));
  await click('#sfPause', 60); t0 = Date.now();
  await b.wait(5500);
  check('resume: not yet (about 7 s were left)', !(await q(`document.getElementById('sfCard').classList.contains('flip')`)));
  await b.wait(2200);
  check('resume: the answer shows when the remaining time is up', await q(`document.getElementById('sfCard').classList.contains('flip')`));
  // See the regrouping
  await click('#sfSee', 250);
  check('"See it worked": SubtractKit demo of this card, step by step', (await exists('#sfDemo .sk-mode-demo')) && (await visible('#sfDemo')) && /Part 1 of/.test(await text('#sfDemo .sk-democtl')));
  await click('#sfDemo [data-act="next"]', 60);
  check('the demo steps forward', /Part 2 of/.test(await text('#sfDemo .sk-democtl')));
  await click('#sfDemoClose', 100);
  check('back to the cards', !(await visible('#sfDemo')) && (await visible('#sfAfter')));
  await click('#sfNext', 150);
  await b.js(`document.getElementById('sfFlip').focus()`); await b.key(' '); await b.wait(100);
  check('keyboard: Space shows the answer', await q(`document.getElementById('sfCard').classList.contains('flip')`));
  await click('#sfEnd', 250);
  check('finish: summary of cards and the child\'s own "I knew it / Not yet"', /Great flying/.test(await text('#subFlashDoneTitle')) && (await text('#sfdSeen')) === '4' && (await text('#sfdKnew')) === '1' && (await text('#sfdNot')) === '1' && /take the Test/.test(await text('#sub')));
  const ft = await sub('flashTotals()');
  check('flashcards record exposure only (not mastery)', ft.sessions === 1 && ft.cards === 4 && ft.knew === 1 && ft.notYet === 1 && ft.shown === 1 && (await sub('tests().length')) === 0 && (await sub('practiceTotals().independent')) === 0);
  // a mixed deck, and Challenge cards always regroup
  await b.js(`GalaxySubtraction.store.setSettings({ flash: { mix: 'challenge', reveal: 0, cards: 10 } })`);
  await goto('#/subtraction/flashcards'); await click('[data-fsize="mixed"]', 200);
  check('Tap-only setting: no countdown', /tap the card/.test(await text('#sfStatus')));
  const labels = [];
  for (let k = 0; k < 10; k++) { labels.push(await q(`document.getElementById('sfCard').getAttribute('aria-label')`)); await click('#sfCard', 40); await click('#sfNext', 60); }
  const pairs = labels.map((l) => /([\d,]+) minus ([\d,]+)/.exec(l)).filter(Boolean).map((m) => [Number(m[1].replace(/,/g, '')), Number(m[2].replace(/,/g, ''))]);
  check('mixed deck: 2-, 3- and 4-digit cards, all regrouping (Challenge), none repeated', pairs.length === 10 && new Set(pairs.map((p) => String(p[0]).length)).size === 3 && new Set(pairs.map(String)).size === 10 &&
    (await q(`${J(pairs)}.every(([t, bt]) => SubtractKit.math.classify(t, bt).exchanges > 0 && t > bt)`)), J(pairs));

  // =============== Parent Settings, Progress, separation ===============
  await goto('#/subtraction/settings');
  await click('#sub [data-set="flash.reveal"] [data-v="15"]', 60); await click('#sub [data-set="lab.level"] [data-v="2"]', 60);
  await b.reload(); await goto('#/subtraction/settings');
  check('settings saved: reveal 15 s, Lab level Medium', (await q(`document.querySelector('#sub [data-set="flash.reveal"] [aria-pressed="true"]').dataset.v`)) === '15' && (await q(`document.querySelector('#sub [data-set="lab.level"] [aria-pressed="true"]').dataset.v`)) === '2');
  check('other subjects\' settings and progress untouched', (await q(`localStorage.getItem('galaxy-math.settings')`)) === setBefore && (await q(`localStorage.getItem('galaxy-math.progress')`)) === multBefore);
  await goto('#/subtraction/progress');
  check('progress: Lab and Flashcards shown separately', (await exists('#sgLab tbody tr')) && (await exists('#sgLabKinds tbody tr')) && /cards seen/.test(await text('#sgFlash')) && /not counted as mastery/.test(await text('#sub')));
  await b.js(`const s = JSON.parse(localStorage.getItem('galaxy-math.subtraction')); s.lab.sessions.push({ bad: 1 }); s.lab.byType.zz = 5; s.flash.sessions.push('x'); s.lab.active = { seed: 'x' }; localStorage.setItem('galaxy-math.subtraction', JSON.stringify(s));`);
  await b.reload(); await goto('#/subtraction/progress');
  check('damaged Lab/Flashcard records: dropped one by one, good ones kept, no errors', (await q(`document.querySelectorAll('#sgLab tbody tr').length`)) >= 3 && b.errors.length === 0);
  await goto('#/subtraction/lab');
  check('the Lab still opens after damaged data', (await exists('[data-size="10"]')) && b.errors.length === 0);

  // =============== cleanup ===============
  await goto('#/subtraction/flashcards'); await click('[data-fsize="3"]', 200);
  check('a flashcard countdown is running', (await q('window.GalaxySubtraction.timerCount')) === 1);
  await click('.brand', 300);
  check('logo → home: flashcard timers and workspaces gone, session saved', (await q('window.GalaxySubtraction.timerCount')) === 0 && (await q('window.GalaxySubtraction.liveCount')) === 0 && (await sub('flashTotals().sessions')) === 3);
  await b.key(' '); await b.wait(100);
  check('no flashcard keyboard handler left behind', b.errors.length === 0 && (await q(`document.getElementById('landing').classList.contains('on')`)));
  await startLabOf(['vsub'], 2);
  await b.js('history.back();'); await b.wait(300);
  check('Back from a Lab workspace cleans up', (await q('window.GalaxySubtraction.liveCount')) === 0);
  await goto('#/division');
  check('division menu still works', /Division/.test(await text('#menuTitle')));

  check('no page errors', b.errors.length === 0, J(b.errors));
  check('no missing local files', server.missing.length === 0, J(server.missing));
  if (LIVE) { const bad = await q(`performance.getEntriesByType('resource').filter(e => e.name.startsWith(location.origin) && e.responseStatus >= 400).map(e => e.name)`); check('live: no failed requests', bad.length === 0, J(bad)); }
} catch (e) {
  fail++; console.log('ERROR', e);
} finally {
  b.close(); server.close();
}
console.log(`${pass}/${pass + fail} subtraction 2.0 browser checks passed`);
process.exit(fail ? 1 : 0);
