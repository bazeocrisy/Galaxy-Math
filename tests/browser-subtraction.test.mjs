// Browser checks for Galaxy Math Subtraction (Mathbook's SubtractKit inside Galaxy): Teach with the original worked
// examples and Your Turn questions, Practice with hints / Show me / independent results kept apart, the Test in
// SubtractKit test mode, saving and restoring, storage kept apart from Multiplication/Division, cleanup on navigation,
// and layout at the six review sizes. Typing uses real key events into the workspace's own boxes.
// Run: node tests/browser-subtraction.test.mjs   (LIVE_URL=... to test the published site)
import { startServer, startBrowser, BASE } from './lib/harness.mjs';

const LIVE = process.env.LIVE_URL;
const server = LIVE ? { origin: '', missing: [], close() {} } : await startServer();
const b = await startBrowser();
const URL = LIVE ? LIVE.replace(/\/?$/, '/') : server.origin + BASE;
console.log(`Testing Subtraction at ${URL}`);
let pass = 0, fail = 0;
function check(name, ok, detail = '') { if (ok) pass++; else { fail++; console.log(`FAIL ${name} ${detail}`); } }
const J = JSON.stringify;
const VIEWPORTS = [[320, 640], [375, 812], [390, 844], [768, 1024], [1280, 800], [1366, 768]];
const q = (expr) => b.js(`return ${expr};`);
const click = async (sel, wait = 120) => { await b.js(`document.querySelector(${J(sel)}).click();`); await b.wait(wait); };
const exists = (sel) => q(`!!document.querySelector(${J(sel)})`);
const text = (sel) => q(`(document.querySelector(${J(sel)}) || {}).textContent || ''`);
const visible = (sel) => q(`(() => { const e = document.querySelector(${J(sel)}); if (!e) return false; const s = getComputedStyle(e); return s.display !== 'none' && s.visibility !== 'hidden' && e.getClientRects().length > 0; })()`);
const noOverflowX = () => q('document.documentElement.scrollWidth <= document.documentElement.clientWidth');
const gridInside = () => q(`[...document.querySelectorAll('#sub .sk-grid')].every(g => { const r = g.getBoundingClientRect(), p = g.closest('.panel').getBoundingClientRect(); return r.left >= p.left - 1 && r.right <= p.right + 1; })`);
const subStore = (expr) => q(`window.GalaxySubtraction.store.${expr}`);
async function goto(h) { await b.js(`if (location.hash === ${J(h)}) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = ${J(h)};`); await b.wait(300); }
async function freshStart() { await b.load(URL); await b.js('localStorage.clear();'); await b.load(URL); }
/** Type a whole answer into the answer boxes of the workspace inside scope, from the ones up (no leading zeros). */
async function typeAns(scope, value) {
  const ds = String(value).split('').reverse();
  for (let i = 0; i < ds.length; i++) { await b.js(`document.querySelector(${J(scope + ' [data-k="a' + i + '"]')}).focus();`); await b.key(ds[i]); }
  await b.wait(60);
}
/** Write regroup marks (the standard exchanges) into a workspace's regroup boxes, committing each with Enter. */
async function typeMarks(scope, top, bottom) {
  const marks = await q(`(() => { const M = SubtractKit.math, p = M.plan(${top}, ${bottom}), o = M.digitsOf(${top}, M.lengthOf(${top})); return p.final.map((v, i) => v !== o[i] ? [i, v] : null).filter(Boolean); })()`);
  for (const [i, v] of marks) {
    await b.js(`document.querySelector(${J(scope + ' [data-k="r')} + ${i} + '"]').focus();`);
    for (const ch of String(v)) await b.key(ch);
    await b.key('Enter'); await b.wait(40);
  }
}
const demoAnswer = (scope) => q(`[...document.querySelectorAll(${J(scope + ' .sk-anscell .sk-ans-read')})].map(e => e.textContent).join('')`);
async function playDemoToEnd(scope) {
  for (let k = 0; k < 80; k++) {
    const more = await q(`(() => { const n = document.querySelector(${J(scope + ' [data-act="next"]')}); if (!n || n.disabled) return false; n.click(); return true; })()`);
    if (!more) break; await b.wait(30);
  }
}
const practiceItem = () => q(`(() => { const a = GalaxySubtraction.store.activePractice(); return Object.assign(SubtractKit.math.generateSession({ size: a.size, difficulty: a.difficulty, length: a.length, seed: a.seed }).items[a.i], { i: a.i }); })()`);
const HELP_SEL = '#sub [data-act="hint"], #sub [data-act="solution"], #sub [data-act="check"], #sub [data-help], #sub [data-check], #sub [data-act="g-hint"], #sub [data-act="g-show"]';

try {
  // =============== layout: every Subtraction screen at the six viewports ===============
  for (const [w, h] of VIEWPORTS) {
    await b.viewport(w, h);
    await freshStart();
    for (const route of ['#/subtraction', '#/subtraction/teach', '#/subtraction/practice', '#/subtraction/test', '#/subtraction/progress']) {
      await goto(route);
      check(`${w}: ${route} no horizontal overflow`, await noOverflowX());
    }
    await b.js(`window.GalaxySubtraction._test.startLesson('zeros2', 1)`); await b.wait(200); await playDemoToEnd('#sub');
    check(`${w}: 3,002 − 1,578 worked example fits, digits not clipped`, (await noOverflowX()) && (await gridInside()) && (await demoAnswer('#sub')) === '1424');
    await b.js(`window.GalaxySubtraction._test.startLesson('value', 1)`); await b.wait(200);
    check(`${w}: base-ten blocks fit`, (await noOverflowX()) && (await q(`[...document.querySelectorAll('#sub .blocks-col')].every(c => c.getBoundingClientRect().right <= innerWidth)`)));
    await b.js(`window.GalaxySubtraction._test.startLesson('mistakes', 2)`); await b.wait(200);
    check(`${w}: find-the-mistake question fits`, (await noOverflowX()) && (await gridInside()));
    await goto('#/subtraction/practice'); await click('[data-key=size] [data-v="4"]', 30); await click('[data-key=difficulty] [data-v="hard"]', 30); await click('#spStart', 250);
    await click('#sub [data-act="solution"]', 250);
    check(`${w}: practice with Show me open fits`, (await noOverflowX()) && (await gridInside()));
    await goto('#/subtraction/test'); await click('#stStart', 250);
    check(`${w}: test question fits; navigation reachable`, (await noOverflowX()) && (await gridInside()) && (await q(`document.getElementById('stNext').getBoundingClientRect().right <= innerWidth`)));
  }

  // =============== landing + menu ===============
  await b.viewport(1280, 800);
  await freshStart();
  await b.js(`window.__galaxy.rootStore.recordLesson('arrays', 3, true); window.__galaxy.rootStore.forSubject('div').recordLesson('equal-sharing', 3, true);`);
  const multBefore = await q(`localStorage.getItem('galaxy-math.progress')`);
  check('landing: Subtraction is open (Teach · Practice · Test)', !(await q(`document.querySelector('[data-subject=subtraction]').getAttribute('aria-disabled')`)) && /Teach · Practice · Test/.test(await text('[data-subject=subtraction]')));
  check('landing: Addition still Coming Soon; still four subject cards', (await q(`document.querySelector('[data-subject=addition]').getAttribute('aria-disabled')`)) === 'true' && (await q(`document.querySelectorAll('#subjects .subject').length`)) === 4);
  await click('[data-subject=subtraction]', 300);
  const modes = await q(`[...document.querySelectorAll('#modes .mode')].map(e => [e.dataset.activity, e.getAttribute('aria-disabled')])`);
  check('menu: Teach, Practice, Test ready; Lab and Flashcards Coming soon', J(modes) === J([['teach', null], ['practice', null], ['lab', 'true'], ['flashcards', 'true'], ['test', null]]), J(modes));
  check('menu: lesson count and a Progress link (no Parent Settings)', /0 of 9 lessons done/.test(await text('#modes')) && (await exists('#menuExtra [data-nav="#/subtraction/progress"]')) && !(await exists('#menuExtra [data-nav="#/subtraction/settings"]')));
  await click('#modes [data-activity=lab]');
  check('menu: the Lab says coming soon', /coming soon/i.test(await text('#menuNote')) && (await q('location.hash')) === '#/subtraction');
  await goto('#/subtraction/flashcards');
  check('#/subtraction/flashcards → menu', (await q('location.hash')) === '#/subtraction');

  // =============== TEACH: the original worked examples ===============
  await goto('#/subtraction/teach');
  check('teach: 9 lessons in 3 units, Up next = Regrouping keeps the value', (await q(`document.querySelectorAll('#sub .lesson-row').length`)) === 9 && (await q(`document.querySelectorAll('#sub .unit').length`)) === 3 && /Regrouping keeps the value/.test(await text('#sub .up-next')));
  const EXAMPLES = [['one', 0, '52 − 27', '25'], ['one', 1, '463 − 128', '335'], ['multi', 0, '532 − 168', '364'], ['four', 1, '4,532 − 1,768', '2764'], ['zeros2', 0, '3,002 − 1,578', '1424']];
  for (const [id, ex, prob, ans] of EXAMPLES) {
    await b.js(`window.GalaxySubtraction._test.startLesson(${J(id)}, 1)`); await b.wait(150);
    if (ex) { await click('#sub [data-ex="next"]', 150); }
    check(`example ${prob}: shown as a step-by-step demo`, (await text('#sub .lesson-body')).includes(prob) && (await exists('#sub .sk-mode-demo')) && (await demoAnswer('#sub')) === '');
    await click('#sub .sk [data-act="next"]', 60); await click('#sub .sk [data-act="next"]', 60);
    const part2 = await text('#sub .sk-democtl');
    await click('#sub .sk [data-act="back"]', 60);
    check(`example ${prob}: Back goes to the step before`, /Part 2 of/.test(await text('#sub .sk-democtl')) && /Part 3 of/.test(part2));
    await playDemoToEnd('#sub');
    check(`example ${prob}: ends with the right answer ${ans}`, (await demoAnswer('#sub')) === ans);
    check(`example ${prob}: old digits crossed out, new values written above`, (await q(`document.querySelectorAll('#sub .sk-d.sk-x').length`)) >= 1 && (await q(`document.querySelectorAll('#sub .sk-cur-read').length`)) >= 2);
    if (id === 'zeros2') {
      const labels = await q(`[...document.querySelectorAll('#sub .sk-topcell')].map(e => e.getAttribute('aria-label'))`);
      check('3,002 − 1,578: each zero gets 10 and ends with 9 (one exchange at a time)', labels.some((l) => /^Hundreds: 0, crossed out, was 10, now 9$/.test(l)) && labels.some((l) => /^Tens: 0, crossed out, was 10, now 9$/.test(l)) && labels.some((l) => /^Thousands: 3, crossed out, now 2$/.test(l)) && labels.some((l) => /^Ones: 2, crossed out, now 12$/.test(l)), J(labels));
      check('3,002 − 1,578: the explanation matches the screen', /3,002 − 1,578 = 1,424/.test(await text('#sub .sk-coach')));
    }
  }

  // =============== TEACH: a whole lesson on your own (lesson 1, blocks) ===============
  await goto('#/subtraction/teach');
  await click('#sub [data-start="value"]', 150);
  check('lesson: Goal first, Next locked only on Your turn', /Goal/.test(await text('#sub .lesson-body')));
  await click('#sub [data-lact="next"]', 150);
  for (let k = 0; k < 3; k++) await click('#sub [data-part="next"]', 60);
  check('lesson 1: four parts of the blocks exchange', /Part 4 of 4/.test(await text('#sub .demo-count')) && /value is the same/.test(await text('#sub .sr-say')));
  await click('#sub [data-lact="next"]', 200);
  check('Your turn: Finish is locked until it is done', (await q(`document.querySelector('#sub [data-lact="next"]').disabled`)) && (await visible('#sub .sr-locked')));
  const ex1 = await q(`(() => { const L = Mathbook.subtractRegrouping.learn[0], w = GalaxySubtraction.store.lessonWork('value'); return L.yourTurn(SubtractKit.math.rng(w.seed)); })()`);
  await b.js(`document.getElementById('srQ1').focus()`); for (const ch of String(ex1.tens + 1)) await b.key(ch); await click('#sub [data-x="check"]');
  check('wrong answer: specific feedback and Try again', /1 fewer ten/.test(await text('#sub .sr-fb')) && (await exists('#sub [data-x="retry"]')));
  await click('#sub [data-x="retry"]');
  await b.js(`document.getElementById('srQ1').select()`); for (const ch of String(ex1.tens - 1)) await b.key(ch); await b.key('Enter'); await b.wait(150);
  await b.js(`document.getElementById('srQ1').focus()`); for (const ch of String(ex1.ones + 10)) await b.key(ch); await b.key('Enter'); await b.wait(150);
  check('Your turn done on your own: value stays the same', /The value is the same/.test(await text('#sub .sr-complete')) && !/with help/.test(await text('#sub .sr-complete')) && !(await q(`document.querySelector('#sub [data-lact="next"]').disabled`)));
  await click('#sub [data-lact="next"]', 150);
  check('lesson 1 complete on own; saved as independent', /Lesson complete! ⭐/.test(await text('#sub')) && (await subStore(`lesson('value').indep`)) === true);

  // decide (radios) on your own
  await b.js(`window.GalaxySubtraction._test.startLesson('decide', 2)`); await b.wait(200);
  const dItem = await q(`(() => { const L = Mathbook.subtractRegrouping.learn.find(l => l.id === 'decide'), w = GalaxySubtraction.store.lessonWork('decide'); return L.yourTurn(SubtractKit.math.rng(w.seed)); })()`);
  await b.js(`document.querySelector('#sub input[data-key=c1][value=${J(dItem.needs)}]').click(); document.querySelector('#sub input[data-key=c2][value=${J(dItem.first)}]').click();`);
  await click('#sub [data-check]');
  check('decide: right answer, saved as on own', /Right\./.test(await text('#sub .sr-fb')) && (await subStore(`lesson('decide').indep`)) === true);

  // guided Your turn finished with Show me only: recorded as help, never independent
  await b.js(`window.GalaxySubtraction._test.startLesson('zero1', 2)`); await b.wait(200);
  check('guided Your turn uses the original guided workspace', await exists('#sub .sk-mode-guided'));
  for (let k = 0; k < 80 && !(await exists('#sub .sk-done')); k++) { await b.js(`const s = document.querySelector('#sub [data-act="g-show"]'); s && s.click();`); await b.wait(40); }
  check('guided Show me: completed with help, Finish unlocked', /Completed with help/.test(await text('#sub .sk-done')) && !(await q(`document.querySelector('#sub [data-lact="next"]').disabled`)));
  check('lesson done with help is not independent', (await subStore(`lesson('zero1').helped`)) === true && (await subStore(`lesson('zero1').indep`)) === false);
  await b.reload(); await goto('#/subtraction/teach');
  check('teach list after reload: 3 done, one marked "with help"', /3 of 9 lessons done \(1 with help\)/.test(await text('#sub .up-next')) && /done with help/.test(await text('#sub [data-lesson="zero1"]')));
  await b.js(`window.GalaxySubtraction._test.startLesson('zero1', 2)`); await b.wait(200);
  check('restored Your turn shows the finished work again (no new record)', (await exists('#sub .sk-done')) && (await subStore(`lesson('zero1').indep`)) === false);

  // =============== PRACTICE ===============
  await goto('#/subtraction/practice');
  await click('[data-key=size] [data-v="2"]', 40); await click('[data-key=difficulty] [data-v="medium"]', 40);
  check('2-digit Medium: unavailable, explained, Start disabled', (await q(`document.getElementById('spStart').disabled`)) && /only need one exchange/.test(await text('#spWhy')));
  await click('[data-key=difficulty] [data-v="hard"]', 40);
  check('2-digit Hard: unavailable, explained', (await q(`document.getElementById('spStart').disabled`)) && /at least three digits/.test(await text('#spWhy')));
  await click('[data-key=size] [data-v="3"]', 40); await click('[data-key=difficulty] [data-v="easy"]', 40);
  check('3-digit Easy available; difficulty explained', !(await q(`document.getElementById('spStart').disabled`)) && /One exchange/.test(await text('#spDiffDesc')));
  await click('#spStart', 250);
  check('practice: workspace with Hint, Show me, Check, Undo and Clear work', (await exists('#sub .sk-mode-independent')) && (await exists('#sub [data-act="hint"]')) && (await exists('#sub [data-act="solution"]')) && (await exists('#sub [data-act="check"]')) && (await exists('#sub [data-act="undo"]')) && (await exists('#sub [data-act="clear"]')));
  check('practice: Next hidden until the problem is finished', !(await visible('#spNext')) && (await visible('#spSkip')));
  // 1: on your own
  let it = await practiceItem();
  check('practice problem is 3-digit Easy (one exchange)', String(it.top).length === 3 && (await q(`SubtractKit.math.classify(${it.top}, ${it.bottom}).difficulty`)) === 'easy');
  await typeAns('#spWs', it.top - it.bottom); await click('#sub [data-act="check"]', 150);
  check('1: solved on own', /on your own/.test(await text('#spOutcome')) && (await visible('#spNext')) && !(await visible('#spSkip')));
  await click('#spNext', 250);
  // 2: hint, then right
  it = await practiceItem();
  await click('#sub [data-act="hint"]', 150);
  check('2: hint 1 shown (never the answer)', /Hint 1 of 4/.test(await text('#sub .sk-coach')) && !(await text('#sub .sk-coach')).includes(String(it.top - it.bottom)));
  await typeAns('#spWs', it.top - it.bottom); await click('#sub [data-act="check"]', 150);
  check('2: right after a hint → "with hints", not on own', /with hints/.test(await text('#spOutcome')));
  await click('#spNext', 250);
  // 3: Show me (the worked answer plays; the child's boxes fill only at the end)
  it = await practiceItem();
  await click('#sub [data-act="solution"]', 200);
  check('3: Show me plays the worked answer; the answer is not filled yet', (await exists('#sub [data-sk-mini]')) && (await q(`[...document.querySelectorAll('#spWs > .sk-wrap [data-k^="a"]')].every(i => i.value === '')`)));
  await playDemoToEnd('#sub [data-sk-mini]');
  check('3: completed with Show me, boxes filled, can go on', /Completed with Show me/.test(await text('#spOutcome')) && (await visible('#spNext')) && (await q(`SubtractKit.math.readAnswer([...document.querySelectorAll('#spWs [data-k^="a"]')].map(i => i.value).reverse().reverse()).status`)) !== 'empty');
  await click('#spNext', 250);
  // 4: wrong, work kept, then skipped → not right
  it = await practiceItem();
  await typeAns('#spWs', it.top - it.bottom + 1); await click('#sub [data-act="check"]', 150);
  check('4: wrong answer → specific feedback, digits kept', /Not yet|Look again|✗/.test(await text('#sub .sk-coach') + await text('#spWs')) && (await q(`document.querySelector('#spWs [data-k="a0"]').value`)) !== '');
  await click('#spSkip', 250);
  // 5: skipped
  await click('#spSkip', 250);
  // 6: a hint, then leave and come back (saved), then right → still "with hints"
  it = await practiceItem();
  await click('#sub [data-act="hint"]', 150);
  await b.reload(); await goto('#/subtraction/practice');
  check('practice saved: Continue at problem 6', /Problem 6 of 10/.test(await text('#sub .panel.cream')));
  await click('#spContinue', 250);
  check('restored problem 6: the hint is still recorded', (await subStore('activePractice().cur.hints')) === 1 && (await practiceItem()).top === it.top);
  await typeAns('#spWs', it.top - it.bottom); await click('#sub [data-act="check"]', 150);
  check('6: right after reload → still "with hints"', /with hints/.test(await text('#spOutcome')));
  await click('#spNext', 250);
  for (let k = 7; k <= 10; k++) { it = await practiceItem(); await typeAns('#spWs', it.top - it.bottom); await click('#sub [data-act="check"]', 120); await click('#spNext', 250); }
  const counts = await q(`Object.fromEntries(['independent','hinted','shown','incorrect','skipped'].map(o => [o, +document.getElementById('spc-' + o).textContent]))`);
  check('practice results keep the five outcomes apart', J(counts) === J({ independent: 5, hinted: 2, shown: 1, incorrect: 1, skipped: 1 }), J(counts));
  check('practice session saved once', (await subStore('sessions().length')) === 1 && (await subStore('activePractice()')) === null);

  // =============== TEST ===============
  await goto('#/subtraction/test');
  await click('#stStart', 250);
  const seed = await subStore('testDraft().seed');
  const items = await q(`Mathbook.subtractRegrouping.testItems(${seed})`);
  let helpSeen = 0;
  for (let k = 0; k < items.length; k++) {
    const t = items[k];
    helpSeen += await q(`document.querySelectorAll(${J(HELP_SEL)}).length`);
    if (k === 0) { await typeAns('#stItem [data-ws="answer"]', t.top - t.bottom + 1); }   // wrong
    else if (k < 13) {
      if (t.kind === 'sub') await typeAns('#stItem [data-ws="answer"]', t.top - t.bottom);
      else if (t.kind === 'steps') await typeMarks('#stItem [data-ws="steps"]', t.top, t.bottom);
      else if (t.kind === 'decide') await b.js(`document.querySelector('#stItem input[data-key=c1][value=${J(t.needs)}]').click(); document.querySelector('#stItem input[data-key=c2][value=${J(t.first)}]').click();`);
      else if (t.kind === 'mistake') { await b.js(`document.querySelector('#stItem input[data-key=c1][value=${J(t.answer)}]').click();`); await typeAns('#stItem [data-ws="answer"]', t.top - t.bottom); }
    }
    if (k === 2) {   // save and restore mid-test
      await b.reload(); await goto('#/subtraction/test');
      check('test saved: Continue shows 3 answered', /3 of 15 answered/.test(await text('#stContinue')));
      await click('#stContinue', 250);
      check('test restored on question 3 with its answer', /Question 3 of 15/.test(await text('#sub .act-count')) && /3 answered/.test(await text('#stAnswered')));
    }
    if (k < items.length - 1) await click('#stNext', 200);
  }
  check('test: no Hint, Show me, Check or feedback on any of the 15 questions', helpSeen === 0, String(helpSeen));
  check('test: no worked answer before finishing', !(await exists('#sub .sk-mode-demo')) && !(await exists('#sub .sk-solution')));
  check('test: the workspace API cannot reveal help in test mode', await q(`(() => { const el = document.createElement('div'); document.body.appendChild(el); const w = SubtractKit.mount(el, { top: 3002, bottom: 1578, mode: 'test', hints: true, feedback: true, solution: true }); w.hint(); w.showSolution(); const r = !el.querySelector('[data-act="hint"],[data-act="solution"],[data-act="check"],.sk-hint,.sk-solution') && el.textContent.indexOf('1,424') < 0; w.destroy(); el.remove(); return r; })()`));
  await click('#stFinish', 150);
  check('finish with blanks: asks first', /2 questions have no answer yet/.test(await text('#stConfirm')));
  await click('#stFinishAnyway', 300);
  check('test results: 80%, 12 correct, 1 not right, 2 unanswered', (await text('#stPct')) === '80%' && J([await text('#stC'), await text('#stI'), await text('#stU')]) === J(['12', '1', '2']));
  check('test results: by kind, by difficulty, and recommendations', (await q(`document.querySelectorAll('#stCats tbody tr').length`)) >= 3 && (await q(`document.querySelectorAll('#stDiffs tbody tr').length`)) >= 2 && (await exists('#stRecs li')));
  await b.js(`const d = document.querySelector('#stReview details'); d.open = true; d.dispatchEvent(new Event('toggle'));`); await b.wait(150);
  check('after finishing: the worked answer is available', await exists('#stReview .sk-mode-demo'));
  check('test recorded once; draft cleared', (await subStore('tests().length')) === 1 && (await subStore('testDraft()')) === null);
  await b.reload(); await goto('#/subtraction/test');
  check('after reload: no draft, the result is not counted again', (await exists('#stStart')) && (await subStore('tests().length')) === 1);

  // =============== PROGRESS, storage isolation and reset ===============
  await goto('#/subtraction/progress');
  check('progress: lessons, the five practice outcomes and the test', /3\/9/.test(await text('#sgLessons')) && (await q(`+document.querySelector('#sgPractice [data-o="shown"]').textContent`)) === 1 && /80%/.test(await text('#sgTests')));
  check('multiplication and division progress untouched by subtraction work', (await q(`localStorage.getItem('galaxy-math.progress')`)) === multBefore);
  await click('#sgReset', 60); await click('#sgReset', 250);
  check('reset clears subtraction only', (await subStore('lessonsSummary().done')) === 0 && (await subStore('tests().length')) === 0 && (await q(`localStorage.getItem('galaxy-math.progress')`)) === multBefore);
  await b.js(`localStorage.setItem('galaxy-math.subtraction', '{"v":1,"lessons":{"one":{"done":true,"indep":true,"helped":false,"at":"2026-10-01T10:00:00.000Z"},"two":5},"practice":{"active":{"seed":"x"}},"tests":[7]}')`);
  await b.reload(); await goto('#/subtraction/progress');
  check('damaged saved data: good lesson kept, bad parts dropped, no errors', /1\/9/.test(await text('#sgLessons')) && b.errors.length === 0);

  // =============== navigation and cleanup ===============
  await goto('#/subtraction/practice'); await click('#spStart', 250);
  check('a workspace is mounted in practice', (await q('window.GalaxySubtraction.liveCount')) >= 1);
  await click('.brand', 300);
  check('logo → home: every workspace destroyed', (await q('window.GalaxySubtraction.liveCount')) === 0 && (await q(`document.getElementById('sub').innerHTML`)) === '');
  await goto('#/subtraction/practice'); await click('#spContinue', 250);
  check('back in practice: the workspace mounts again and works', (await exists('#sub .sk-mode-independent')) && (await q('window.GalaxySubtraction.liveCount')) === 1);
  await b.js('history.back();'); await b.wait(350);
  check('browser Back leaves practice (to home) and cleans up', (await q(`document.getElementById('landing').classList.contains('on')`)) && (await q('window.GalaxySubtraction.liveCount')) === 0);
  await goto('#/multiplication');
  check('multiplication menu still works after subtraction', (await q(`document.getElementById('menu').classList.contains('on')`)) && /Multiplication/.test(await text('#menuTitle')) && (await q('window.GalaxySubtraction.liveCount')) === 0);

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
console.log(`${pass}/${pass + fail} subtraction browser checks passed`);
process.exit(fail ? 1 : 0);
