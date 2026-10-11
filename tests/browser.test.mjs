// Browser checks for the Galaxy Math landing page, activity menus and the preserved flashcard/test engine.
// Run: npm run test:browser   (SHOT_DIR=... to choose where screenshots go; default tests/screenshots)
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
const q = (expr) => b.js(`return ${expr};`);
const visible = (id) => q(`document.getElementById('${id}').classList.contains('on')`);
const noOverflow = () => q(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`);

try {
  // ---- layouts at phone, tablet and desktop widths ----
  for (const [w, h] of [[320, 640], [375, 812], [390, 844], [768, 1024], [1280, 800]]) {
    await b.viewport(w, h);
    await b.load(URL);
    check(`${w}: landing visible`, await visible('landing'));
    check(`${w}: no horizontal overflow`, await noOverflow());
    check(`${w}: background fills the screen`, await q(`document.body.getBoundingClientRect().height >= innerHeight`));
    check(`${w}: four subject cards`, (await q(`document.querySelectorAll('#subjects .subject').length`)) === 4);
    const clipped = await q(`[...document.querySelectorAll('.subject .sName,.subject .badge')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent)`);
    check(`${w}: card text fits`, clipped.length === 0, JSON.stringify(clipped));
    const small = await q(`[...document.querySelectorAll('#subjects .subject')].filter(e => { const r = e.getBoundingClientRect(); return r.width < 120 || r.height < 150; }).length`);
    check(`${w}: large touch targets`, small === 0);
    const logo = await q(`(() => { const i = document.querySelector('.heroLogo'); return i.complete && i.naturalWidth > 0; })()`);
    check(`${w}: logo loads`, logo);
    if ([390, 1280].includes(w)) await b.shot(path.join(SHOT_DIR, `landing-${w}.png`));
  }

  await b.viewport(390, 844);
  await b.load(URL);
  const cards = await q(`[...document.querySelectorAll('#subjects .subject')].map(e => [e.querySelector('.sName').textContent, e.querySelector('.badge').textContent, e.getAttribute('aria-disabled')])`);
  check('card labels', JSON.stringify(cards) === JSON.stringify([
    ['Addition', 'Coming Soon', 'true'], ['Subtraction', 'Coming Soon', 'true'],
    ['Multiplication', 'Flashcards & Test', null], ['Division', 'Lessons on the way', null]]), JSON.stringify(cards));
  check('title', (await q('document.title')) === 'Galaxy Math');

  // ---- disabled subjects stay put ----
  await b.js(`document.querySelector('[data-subject=addition]').click();`);
  await b.wait(150);
  check('addition: stays on landing', await visible('landing'));
  check('addition: coming-soon message', /coming soon/i.test(await q(`document.getElementById('landingNote').textContent`)));
  check('addition: hash unchanged', ['', '#/'].includes(await q('location.hash')));
  await b.hash('#/subtraction');
  check('#/subtraction redirects to landing', (await visible('landing')) && (await q('location.hash')) === '#/');

  // ---- multiplication menu ----
  await b.js(`document.querySelector('[data-subject=multiplication]').click();`);
  await b.wait(250);
  check('multiplication: menu visible', await visible('menu'));
  check('multiplication: hash', (await q('location.hash')) === '#/multiplication');
  check('multiplication: focus moved to heading', (await q('document.activeElement.id')) === 'menuTitle');
  const modes = await q(`[...document.querySelectorAll('#modes .mode')].map(e => [e.dataset.activity, e.getAttribute('aria-disabled')])`);
  check('multiplication: modes', JSON.stringify(modes) === JSON.stringify([['teach', 'true'], ['practice', 'true'], ['flashcards', null], ['test', null]]), JSON.stringify(modes));
  check('menu: no overflow', await noOverflow());
  await b.shot(path.join(SHOT_DIR, 'menu-multiplication-390.png'));
  await b.js(`document.querySelector('[data-activity=teach]').click();`);
  await b.wait(150);
  check('teach: stays on menu', (await visible('menu')) && (await q('location.hash')) === '#/multiplication');
  check('teach: coming-soon message', /Teach is coming soon/.test(await q(`document.getElementById('menuNote').textContent`)));
  await b.hash('#/multiplication/practice');
  check('#/multiplication/practice redirects to menu', (await q('location.hash')) === '#/multiplication' && (await visible('menu')));

  // ---- division menu: nothing presented as working ----
  await b.hash('#/division');
  check('division: menu visible', await visible('menu'));
  check('division: all four disabled', (await q(`[...document.querySelectorAll('#modes .mode')].filter(e => e.getAttribute('aria-disabled') === 'true').length`)) === 4);
  check('division: disabled labels readable', (await q(`[...document.querySelectorAll('#modes .mode')].map(e => getComputedStyle(e).color)`)).every((c) => c === 'rgb(243, 240, 255)'));
  check('division: honest subtitle', /being built/.test(await q(`document.getElementById('menuSub').textContent`)));
  await b.shot(path.join(SHOT_DIR, 'menu-division-390.png'));
  await b.hash('#/division/flashcards');
  check('#/division/flashcards redirects to menu', (await q('location.hash')) === '#/division' && (await visible('menu')));

  // ---- flashcards setup and session ----
  await b.hash('#/multiplication/flashcards');
  check('flashcards setup visible', await visible('setup'));
  check('flashcards setup shows minutes, hides test timer', (await q(`getComputedStyle(minSet).display !== 'none' && getComputedStyle(timerSet).display === 'none' && getComputedStyle(goTest).display === 'none'`)));
  check('setup: no overflow', await noOverflow());
  await b.shot(path.join(SHOT_DIR, 'setup-flashcards-390.png'));
  await b.js(`document.getElementById('goStudy').click();`);
  await b.wait(200);
  check('flashcards: study visible', await visible('study'));
  check('flashcards: vertical × card', (await q(`document.querySelector('#sFront .vert .op b').textContent`)) === '×');
  // Leaving through Menu must stop the clock and the auto-flip timers.
  await b.js(`document.getElementById('studyHome').click();`);
  await b.wait(200);
  check('flashcards Menu → activity menu', (await visible('menu')) && (await q('location.hash')) === '#/multiplication');
  const before = await q(`[secsLeft, cards].join()`);
  await b.wait(2300);
  check('no timers after leaving flashcards', (await q(`[secsLeft, cards].join()`)) === before, before);

  // Browser Back during a session also stops it.
  await b.hash('#/multiplication/flashcards');
  await b.js(`document.getElementById('goStudy').click();`);
  await b.wait(200);
  await b.js(`history.back();`);
  await b.wait(300);
  check('Back button leaves flashcards', (await visible('menu')));
  const before2 = await q(`[secsLeft, cards].join()`);
  await b.wait(2300);
  check('no timers after Back', (await q(`[secsLeft, cards].join()`)) === before2);

  // Time running out shows the report; the quick check is optional.
  await b.hash('#/multiplication/flashcards');
  await b.js(`document.getElementById('goStudy').click();`);
  await b.wait(200);
  await b.js(`secsLeft = 1;`);
  await b.wait(1400);
  check('flashcards end → report, not a forced test', (await visible('done')) && !(await visible('test')));
  check('quick check offered', (await q(`getComputedStyle(doCheck).display`)) !== 'none');
  await b.js(`document.getElementById('doCheck').click();`);
  await b.wait(150);
  check('optional quick check starts', (await visible('test')) && /^Quick check · Card 1 of 10$/.test(await q(`testCount.textContent`)));
  await b.js(`document.getElementById('testQuit').click();`);
  await b.wait(200);
  check('quit quick check → menu', await visible('menu'));

  // ---- test mode ----
  await b.hash('#/multiplication/test');
  check('test setup shows timer, hides minutes', (await q(`getComputedStyle(timerSet).display !== 'none' && getComputedStyle(minSet).display === 'none' && getComputedStyle(goStudy).display === 'none'`)));
  await b.js(`document.querySelector('#timerSet [data-t="5"]').click(); document.getElementById('goTest').click();`);
  await b.wait(300);
  check('test: full countdown shown at start', (await q(`tick.textContent`)) === '5', await q(`tick.textContent`));
  await b.wait(1000);
  check('test: one tick after ~1s', (await q(`tick.textContent`)) === '4', await q(`tick.textContent`));
  const [a, c] = await q(`tDeck[tIdx]`);
  for (const d of String(a * c)) await b.key(d);
  await b.key('Enter');
  await b.wait(150);
  check('test: correct answer graded ok', await q(`tBack.classList.contains('ok') && right === 1`));
  await b.js(`document.getElementById('testQuit').click();`);
  await b.wait(200);
  const tleft = await q('left');
  await b.wait(1300);
  check('no test timer after Quit', (await q('left')) === tleft);

  // ---- localStorage that throws must not break the page ----
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `Storage.prototype.getItem = () => { throw new Error('blocked'); }; Storage.prototype.setItem = () => { throw new Error('blocked'); };` });
  await b.load(URL + '#/multiplication/flashcards');
  check('blocked storage: setup renders', await visible('setup'));
  await b.js(`document.getElementById('goStudy').click();`);
  await b.wait(200);
  check('blocked storage: flashcards start', await visible('study'));

  check('no page errors', b.errors.length === 0, JSON.stringify(b.errors));
  check('no missing local files', server.missing.length === 0, JSON.stringify(server.missing));
  if (LIVE) {
    const bad = await q(`performance.getEntriesByType('resource').filter(e => e.name.startsWith(location.origin) && e.responseStatus >= 400).map(e => e.name)`);
    check('live: no failed requests', bad.length === 0, JSON.stringify(bad));
  }
} catch (e) {
  fail++; console.log('ERROR', e);
} finally {
  b.close(); server.close();
}
console.log(`${pass}/${pass + fail} browser checks passed`);
process.exit(fail ? 1 : 0);
