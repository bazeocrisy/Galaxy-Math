// Navigation layout checks: the home page and both subject menus at the six review viewports (plus the 700 and
// 1000 px breakpoints). Checks the 3 + 2 activity grid on tablets and desktops, two columns with a full-width Lab on
// phones, text that fits, one SVG icon system (no emoji), grown-up links quieter than the activities, balanced
// vertical space, the same design for Multiplication and Division, and that every card still goes where it should.
// Run: node tests/browser-nav.test.mjs   (LIVE_URL=... to test the published site)
import { startServer, startBrowser, BASE } from './lib/harness.mjs';

const LIVE = process.env.LIVE_URL;
const server = LIVE ? { origin: '', missing: [], close() {} } : await startServer();
const b = await startBrowser();
const URL = LIVE ? LIVE.replace(/\/?$/, '/') : server.origin + BASE;
console.log(`Testing navigation at ${URL}`);
let pass = 0, fail = 0;
function check(name, ok, detail = '') { if (ok) pass++; else { fail++; console.log(`FAIL ${name} ${detail}`); } }
const J = JSON.stringify;
const q = (expr) => b.js(`return ${expr};`);
const visible = (id) => q(`document.getElementById(${J(id)}).classList.contains('on')`);
async function goto(h) { await b.js(`if (location.hash === ${J(h)}) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = ${J(h)};`); await b.wait(250); }
const VIEWPORTS = [[320, 640], [375, 812], [390, 844], [700, 900], [768, 1024], [1000, 760], [1280, 800], [1366, 768]];
const rects = (sel) => q(`[...document.querySelectorAll(${J(sel)})].map(e => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), b: Math.round(r.bottom), r: Math.round(r.right) }; })`);
const clipped = (sel) => q(`[...document.querySelectorAll(${J(sel)})].filter(e => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 2).map(e => e.textContent)`);
const noOverflowX = () => q('document.documentElement.scrollWidth <= document.documentElement.clientWidth');
const EMOJI = /\p{Extended_Pictographic}/u;
const near = (a, b2, tol = 2) => Math.abs(a - b2) <= tol;

try {
  for (const [w, h] of VIEWPORTS) {
    await b.viewport(w, h);
    await b.load(URL); await b.js('localStorage.clear();'); await b.load(URL);

    // ---------- home ----------
    check(`${w}: home has no horizontal overflow`, await noOverflowX());
    const home = await q(`document.getElementById('subjects').innerText + document.querySelector('.hero').innerText`);
    check(`${w}: home uses SVG icons, no emoji`, !EMOJI.test(home) && (await q(`document.querySelectorAll('#subjects .sym svg.ic').length`)) === 4, home);
    check(`${w}: subject text fits`, (await clipped('.subject .sName, .subject .sTag, .subject .badge, .subject .go')).length === 0, J(await clipped('.subject .sName, .subject .sTag, .subject .badge, .subject .go')));
    const subj = await rects('#subjects .subject');
    check(`${w}: subject cards are compact (≤ 130 px tall)`, subj.every((r) => r.h <= 130), J(subj.map((r) => r.h)));
    const sname = await q(`parseFloat(getComputedStyle(document.querySelector('.s-multiplication .sName')).fontSize)`);
    check(`${w}: subject names are large (≥ 18 px)`, sname >= 18, String(sname));
    if (w >= 880) check(`${w}: subjects in two columns`, near(subj[0].t, subj[1].t) && near(subj[2].t, subj[3].t) && subj[2].t > subj[0].b);
    else check(`${w}: subjects in one column on phones and small tablets`, subj.every((r, i) => i === 0 || r.t >= subj[i - 1].b));
    const page = await q(`(() => { const s = document.getElementById('landing'), first = document.querySelector('.hero').getBoundingClientRect(), last = document.getElementById('subjects').getBoundingClientRect(); return { top: first.top, bottom: innerHeight - last.bottom, fits: document.documentElement.scrollHeight <= innerHeight + 2 }; })()`);
    if (page.fits) check(`${w}: home is balanced vertically (space above ≈ space below)`, Math.abs(page.top - page.bottom) <= Math.max(80, h * 0.12), J(page));

    // ---------- both menus ----------
    const layouts = {};
    for (const sid of ['multiplication', 'division']) {
      await goto(`#/${sid}`);
      check(`${w} ${sid}: menu visible, no horizontal overflow`, (await visible('menu')) && (await noOverflowX()));
      const txt = await q(`document.getElementById('modes').innerText + document.getElementById('menuExtra').innerText + document.querySelector('.menuHead').innerText`);
      check(`${w} ${sid}: one SVG icon system, no emoji`, !EMOJI.test(txt) && (await q(`document.querySelectorAll('#modes .mIcon svg.ic').length`)) === 5 && (await q(`document.querySelectorAll('#menuExtra svg.ic').length`)) === 3 && (await q(`!!document.querySelector('#menuSym svg.ic')`)), txt);
      const clip = await clipped('.mode .mName, .mode .mBlurb, .mode .mMeta, #menuExtra .link-btn');
      check(`${w} ${sid}: card text fits`, clip.length === 0, J(clip));
      const m = await rects('#modes .mode');   // teach, practice, lab, flashcards, test
      layouts[sid] = m;
      if (w >= 700) {
        check(`${w} ${sid}: 3 + 2 arrangement`, near(m[0].t, m[1].t) && near(m[1].t, m[2].t) && near(m[3].t, m[4].t) && m[3].t > m[0].b, J(m));
        check(`${w} ${sid}: all five cards the same size`, m.every((r) => near(r.w, m[0].w) && near(r.h, m[0].h)), J(m));
        const rowL = m[0].l, rowR = m[2].r, botL = m[3].l, botR = m[4].r;
        check(`${w} ${sid}: second row centred under the first`, near(botL - rowL, rowR - botR, 3), J({ rowL, rowR, botL, botR }));
        check(`${w} ${sid}: cards are not tall and narrow`, m.every((r) => r.w >= r.h), J(m));
      } else {
        check(`${w} ${sid}: two columns on phones`, near(m[0].t, m[1].t) && near(m[3].t, m[4].t) && m[0].l < m[1].l && near(m[0].w, m[1].w));
        check(`${w} ${sid}: Math Thinking Lab spans the full width`, m[2].t >= m[0].b && near(m[2].l, m[0].l) && near(m[2].r, m[1].r) && m[3].t >= m[2].b, J(m));
      }
      // hierarchy: activity names larger than the grown-up links, which have no card border or shadow
      const hier = await q(`(() => { const n = getComputedStyle(document.querySelector('.mode .mName')), l = getComputedStyle(document.querySelector('#menuExtra .link-btn')); return { name: parseFloat(n.fontSize), link: parseFloat(l.fontSize), border: l.borderTopWidth, bg: l.backgroundColor }; })()`);
      check(`${w} ${sid}: titles ≥ 17 px`, hier.name >= 17, J(hier));
      check(`${w} ${sid}: Progress and Parent Settings are secondary`, hier.link < hier.name && hier.border === '0px' && hier.bg === 'rgba(0, 0, 0, 0)', J(hier));
      const extra = await rects('#menuExtra'), last = m[m.length - 1];
      check(`${w} ${sid}: grown-up links sit below the activities`, extra[0].t >= Math.max(...m.map((r) => r.b)), J({ extra, last }));
      const tap = await rects('#menuExtra .link-btn');
      check(`${w} ${sid}: links are at least 44 px tall`, tap.every((r) => r.h >= 44), J(tap));
      const v = await q(`(() => { const head = document.querySelector('.menuHead').getBoundingClientRect(), end = document.getElementById('menuExtra').getBoundingClientRect(), bar = document.querySelector('.topbar').getBoundingClientRect(); return { top: head.top - bar.bottom, bottom: innerHeight - end.bottom, fits: document.documentElement.scrollHeight <= innerHeight + 2 }; })()`);
      if (v.fits && w >= 700) check(`${w} ${sid}: menu balanced vertically`, Math.abs(v.top - v.bottom) <= Math.max(90, h * 0.14), J(v));
    }
    check(`${w}: Division menu has the same layout as Multiplication`, J(layouts.multiplication.map((r) => [r.l, r.w])) === J(layouts.division.map((r) => [r.l, r.w])));
  }

  // ---------- every card still navigates ----------
  await b.viewport(1280, 800);
  for (const sid of ['multiplication', 'division']) {
    for (const a of ['teach', 'practice', 'lab', 'flashcards', 'test']) {
      await goto(`#/${sid}`);
      await b.js(`document.querySelector('#modes [data-activity=${a}]').click();`); await b.wait(200);
      check(`${sid} card ${a} → #/${sid}/${a}`, (await q('location.hash')) === `#/${sid}/${a}`);
    }
    for (const [label, hash] of [['Progress', `#/${sid}/progress`], ['Parent Settings', `#/${sid}/settings`], ['All subjects', '#/']]) {
      await goto(`#/${sid}`);
      await b.js(`[...document.querySelectorAll('#menuExtra .link-btn')].find(e => e.textContent.trim() === ${J(label)}).click();`); await b.wait(200);
      check(`${sid} link ${label} → ${hash}`, (await q('location.hash')) === hash);
    }
  }
  await goto('#/');
  await b.js(`document.querySelector('[data-subject=division]').click();`); await b.wait(200);
  check('home card Division → #/division', (await q('location.hash')) === '#/division');
  const aria = await q(`document.querySelector('[data-subject=multiplication]').getAttribute('aria-label')`);
  check('home card names the five activities for screen readers', /Teach, Practice, Math Thinking Lab, Flashcards and Test/.test(aria), aria);

  check('no page errors', b.errors.length === 0, J(b.errors));
} catch (e) {
  fail++; console.log('ERROR', e);
} finally {
  b.close(); server.close();
}
console.log(`${pass}/${pass + fail} navigation checks passed`);
process.exit(fail ? 1 : 0);
