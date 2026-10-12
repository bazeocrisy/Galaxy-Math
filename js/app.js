/* Galaxy Math app: router, shared UI components and the five activities (Teach, Practice, Math Thinking Lab,
   Flashcards, Test) plus Parent Settings and Progress, for each subject (Multiplication, Division).
   A subject profile supplies the fact engine (M), question bank (B), lessons (L) and wording; every screen reads the
   active profile, so both subjects share one design. Depends on registry.js, mult-*.js, div-*.js, visuals.js,
   bank-kit.js, progress.js. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const GM = window.GalaxyMathRegistry, V = window.GalaxyVisuals, P = window.GalaxyProgress;
  const rootStore = P.createStore(P.browserStorage());
  const andList = (s) => (s.length > 1 ? `${s.slice(0, -1).join(', ')} and ${s[s.length - 1]}` : s[0]);
  /** Everything that differs between subjects. Multiplication wording is unchanged from Multiplication 2.0. */
  const PROFILES = {
    multiplication: {
      key: 'mult', M: window.GalaxyMult, B: window.GalaxyBank, L: window.GalaxyMultLessons, sym: '×', name: 'Multiplication',
      fam: (n) => `${n}s`, famsHeading: 'Times tables', famsNoun: 'times tables', famNoun: 'times table', pickTitle: 'Which times table?', mixed: 'mixed tables',
      famsText: (t) => (t.length === 12 ? 'all tables' : t.length === 10 && t.every((n) => n <= 10) ? 'tables 1–10' : `the ${andList(t.map((n) => `${n}s`))}`),
      famOne: (n) => `the ${n}s`, factText: (fam, other) => `${fam} × ${other}`, coreText: 'core tables mastered', extLabel: 'Include 11s and 12s (extension)',
      goalText: 'The third-grade goal is every fact up to 10 × 10. The extension adds the 11s and 12s.',
      unit: 'table', units: 'tables',
      kindsHelp: 'Practice uses the nine core kinds. Challenge kinds (check the work, times as many, equal products) join after their lesson.',
      flashFront: (fam, other) => `<span class="fc-tag">${fam}s table</span><div class="vert"><div>${fam}</div><div class="op"><b>×</b>${other}</div></div>`,
      flashBack: (fam, other) => `<div><span class="fc-ans">${fam * other}</span><span class="fc-eq">${fam} × ${other} = ${fam * other}</span></div>`,
      flashAria: (fam, other) => `${fam} times ${other}`, flashAnswerAria: (fam, other) => `${fam} times ${other} equals ${fam * other}`
    },
    division: {
      key: 'div', M: window.GalaxyDiv, B: window.GalaxyDivBank, L: window.GalaxyDivLessons, sym: '÷', name: 'Division',
      fam: (n) => `÷${n}`, famsHeading: 'Division families', famsNoun: 'division families', famNoun: 'division family', pickTitle: 'Divide by which number?', mixed: 'mixed families',
      famsText: (t) => (t.length === 12 ? 'all division families' : t.length === 10 && t.every((n) => n <= 10) ? 'dividing by 1–10' : `dividing by ${andList(t.map(String))}`),
      famOne: (n) => `dividing by ${n}`, factText: (fam, other) => `${fam * other} ÷ ${fam}`, coreText: 'core division families mastered', extLabel: 'Include ÷11 and ÷12 (extension)',
      goalText: 'The third-grade goal is every division fact up to 100 ÷ 10 (quotients 1–10). The extension adds dividing by 11 and 12, and quotients of 11 and 12.',
      unit: 'family', units: 'families',
      kindsHelp: 'Practice uses the eleven core kinds. The challenge kind (Who is right?) joins after its lesson.',
      flashFront: (fam, other) => `<span class="fc-tag">÷${fam} family</span><div class="div-face">${fam * other} <b>÷</b> ${fam}</div>`,
      flashBack: (fam, other) => `<div><span class="fc-ans">${other}</span><span class="fc-eq">${fam * other} ÷ ${fam} = ${other}</span></div>`,
      flashAria: (fam, other) => `${fam * other} divided by ${fam}`, flashAnswerAria: (fam, other) => `${fam * other} divided by ${fam} equals ${other}`
    }
  };
  let SP = PROFILES.multiplication, M = SP.M, B = SP.B, L = SP.L, store = rootStore.forSubject(SP.key);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /** Escaped text with **bold**; equations such as "100 ÷ 10 = 10" never break across lines. */
  const rich = (s) => esc(String(s).replace(/(\d) ([+=×÷−]) (?=\d|\?)/g, '$1\u00A0$2\u00A0')).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const viz = (spec) => (spec ? `<div class="viz-wrap">${V.render(spec)}</div>` : '');
  /** A question's own picture: number lines drop their landing numbers so the total is not given away. */
  const hideTotals = (spec) => !spec ? spec : spec.kind === 'jumps' ? { ...spec, labels: false }
    : spec.kind === 'set' ? { ...spec, items: spec.items.map((it) => ({ ...it, visual: hideTotals(it.visual) })) } : spec;
  const fmt = (sec) => `${Math.floor(sec / 60)}:${String(Math.max(0, sec) % 60).padStart(2, '0')}`;
  let SUBJ = 'multiplication', MENU = '#/multiplication';
  const lessonTitle = (id) => { const l = L.getLesson(id); return l ? l.title : id; };

  /* ---------- timers: every timeout/interval goes through T so leaving a screen stops them all ---------- */
  const T = {
    ids: new Set(),
    after(fn, ms) { const id = setTimeout(() => { T.ids.delete(id); fn(); }, ms); T.ids.add(id); return id; },
    every(fn, ms) { const id = setInterval(fn, ms); T.ids.add(id); return id; },
    cancel(id) { if (id) { clearTimeout(id); clearInterval(id); T.ids.delete(id); } },
    clearAll() { for (const id of T.ids) { clearTimeout(id); clearInterval(id); } T.ids.clear(); }
  };
  window.__galaxy = { timers: T, get store() { return store; }, rootStore, subject: () => SUBJ };   // inspected by the browser tests

  /* ---------- keyboard: one handler per active screen ---------- */
  let onKey = null;
  document.addEventListener('keydown', (e) => {
    if (!onKey || e.ctrlKey || e.metaKey || e.altKey) return;
    onKey(e);
  });
  // Enter/Space on a focused button already clicks it; screens should not handle those keys again.
  // Number-pad keys are the exception: Enter there means "submit", not "press that digit again".
  const onButton = (e) => { const t = e.target && e.target.closest && e.target.closest('button, a'); return !!t && !t.closest('.numpad'); };

  /* ---------- Parent Settings (saved on this device; not locked) ---------- */
  const SKEY = 'galaxy-math.settings';
  const ALL = [...M.FAMILIES], CORE = ALL.filter((n) => n <= M.CORE_MAX);
  const pickOne = (v, allowed, d) => (allowed.includes(v) ? v : d);
  /** Saved as { v: 2, multiplication: {...}, division: {...} }. Older saves (one flat object) were multiplication's. */
  function loadAllSettings() {
    let raw = {};
    try { raw = JSON.parse(localStorage.getItem(SKEY)) || {}; } catch (e) { raw = {}; }
    if (!raw || typeof raw !== 'object') raw = {};
    const per = raw.v === 2 ? raw : { multiplication: raw, division: {} };
    return { multiplication: parseSettings(per.multiplication), division: parseSettings(per.division) };
  }
  function parseSettings(s) {
    if (!s || typeof s !== 'object') s = {};
    const fam = (v, d) => (Array.isArray(v) ? M.cleanFamilies(v) : d.slice());
    const fc = s.fc || {}, te = s.test || {}, pr = s.practice || {}, lab = s.lab || {};
    const out = {
      tables: fam(s.tables || pr.families, CORE),          // Practice + Lab (v1 kept these under practice.families)
      extension: s.extension === true,
      practice: { count: pickOne(pr.count, [10, 20, 30], 10) },
      lab: { allTypes: lab.allTypes === true },
      fc: { reveal: pickOne(fc.reveal, [0, 2, 3, 5, 10], 5), hold: pickOne(fc.hold, [1, 2, 3, 5], 2), minutes: pickOne(fc.minutes, [3, 5, 10], 5),
        order: pickOne(fc.order, ['shuffle', 'order'], 'shuffle'), table: pickOne(fc.table, [0, ...ALL], 0) },   // table 0 = mixed
      test: { mode: pickOne(te.mode, ['auto', 'custom'], 'auto'), families: fam(te.families, CORE), count: pickOne(te.count, [10, 20, 36], 10), timer: pickOne(te.timer, [0, 2, 3, 5, 10], 5) }
    };
    return out;
  }
  const allSettings = loadAllSettings();
  let settings = allSettings.multiplication;
  function saveSettings() { try { localStorage.setItem(SKEY, JSON.stringify({ v: 2, ...allSettings })); } catch (e) { /* in-memory only */ } }
  /** Switch every screen to a subject (called by the router). */
  function useSubject(sid) {
    const p = PROFILES[sid];
    if (!p || SP === p) return;
    SP = p; SUBJ = sid; MENU = `#/${sid}`; M = p.M; B = p.B; L = p.L; store = rootStore.forSubject(p.key); settings = allSettings[sid];
  }
  const usableTables = (list) => { const t = M.cleanFamilies(list).filter((n) => settings.extension || n <= M.CORE_MAX); return t.length ? t : CORE.slice(); };
  /** Multiplication: "the 6s", "the 1s and 2s", "tables 1–10", "all tables". Division: "dividing by 6", "dividing by 1–10". */
  const tablesText = (list) => SP.famsText(usableTables(list));

  /* ---------- screens and routing ---------- */
  const SCREENS = ['landing', 'menu', 'teach', 'lesson', 'practiceSetup', 'practice', 'practiceDone', 'labSetup', 'lab', 'labDone',
    'fcSetup', 'fc', 'fcDone', 'testSetup', 'test', 'testDone', 'progress', 'settings', 'sub'];
  let firstShow = true;
  function show(id, crumb = '') {
    SCREENS.forEach((s) => {
      $(s).classList.toggle('on', s === id);
      if (s !== id && s !== 'landing' && s !== 'menu') $(s).innerHTML = '';   // one live copy of each control id
    });
    $('app').classList.toggle('on-landing', id === 'landing');
    $('crumb').textContent = crumb;
    window.scrollTo(0, 0);
    const h = $(id).querySelector('h1, h2');
    if (h && !firstShow) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    firstShow = false;
  }
  function nav(h) { if (location.hash === h) route(); else location.hash = h; }
  function stopAll() {
    if (fcState) store.recordFlash(Math.round(Math.min(fcElapsed(), fcState.totalMs) / 1000), fcState.seen);
    T.clearAll(); onKey = null; fcState = null; testState = null; practiceState = null; lessonState = null; labState = null;
    if (window.GalaxySubtraction) window.GalaxySubtraction.stop();   // destroys every subtraction workspace
  }
  function route() {
    stopAll();
    const r = GM.resolveRoute(location.hash);
    if (r.hash !== location.hash && !(location.hash === '' && r.hash === '#/')) history.replaceState(null, '', r.hash);
    const s = r.subject && GM.getSubject(r.subject);
    // Subtraction screens come from the SubtractKit adapter (js/sub-galaxy.js); its menu uses the shared menu below.
    if (r.subject === 'subtraction' && r.view !== 'menu') {
      const label = window.GalaxySubtraction.render(r, $('sub'), { nav });
      document.title = `${s.name} ${label} · Galaxy Math`;
      show('sub', `${s.symbol} ${s.name} · ${label}`);
      return;
    }
    if (r.subject) useSubject(r.subject);
    if (r.view === 'landing') { $('landingNote').textContent = ''; document.title = 'Galaxy Math'; show('landing'); return; }
    if (r.view === 'menu') { renderMenu(r.subject); document.title = `${s.name} · Galaxy Math`; show('menu', `${s.symbol} ${s.name}`); return; }
    if (r.view === 'progress') { renderProgress(); document.title = `${s.name} progress · Galaxy Math`; return; }
    if (r.view === 'settings') { renderSettings(); document.title = `Parent Settings · Galaxy Math`; return; }
    document.title = `${s.name} ${GM.getActivity(r.activity).name} · Galaxy Math`;
    ({ teach: renderTeach, practice: renderPracticeSetup, lab: renderLabSetup, flashcards: renderFcSetup, test: renderTestSetup })[r.activity]();
  }
  window.addEventListener('hashchange', route);
  document.addEventListener('click', (e) => {
    const n = e.target.closest('[data-nav]');
    if (n) { e.preventDefault(); nav(n.dataset.nav); }
  });
  const crumbFor = (activity) => `${SP.sym} ${SP.name} · ${activity}`;
  /** Header row inside an activity workspace: Exit · title + count · extra, then a progress bar. */
  const actHead = ({ id, title, count = '', right = '', exit, now = 0, max = 1, label, barId = '', spanId = '' }) =>
    `<div class="act-head">${exit}<div class="act-title"><h2 id="${id}" tabindex="-1">${title}</h2>${count}</div><div class="act-right">${right}</div></div>
     <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${now}" aria-label="${label}"${barId ? ` id="${barId}"` : ''}><span${spanId ? ` id="${spanId}"` : ''} style="width:${(now / max) * 100}%"></span></div>`;
  /** Arithmetic text that only wraps after a "+" (never leaves "+ 6" or "= ?" alone at the start of a line). */
  const exprHtml = (s) => {
    if (/^[\d ×+=?−]+$/.test(s) && s.includes(' + ')) {   // a long sum: keep each "6 +" together so lines break evenly
      const parts = s.split(' + ');
      return parts.map((p, i) => `<span class="t">${esc(p.replace(/ ([=×]) /g, '\u00A0$1\u00A0'))}${i < parts.length - 1 ? '\u00A0+' : ''}</span>`).join(' ');
    }
    return rich(s.replace(/(\d) ([+=×÷−]) (?=\d|\?)/g, '$1\u00A0$2\u00A0'));   // keep "7 × 6 = 35" on one line
  };
  /** The problem as plain text for reports (prompt plus its expression line, if any). */
  const promptText = (q) => (q.expr ? `${q.prompt} ${q.expr}` : q.prompt);
  const screenHead = (id, title, back = MENU, backLabel = `⬅ ${SP.name}`) =>
    `<div class="screen-head"><h2 id="${id}" tabindex="-1">${title}</h2><button class="btn btn-ghost" data-nav="${back}">${backLabel}</button></div>`;

  /* ---------- shared components ---------- */
  /** Times-table chooser for Parent Settings. Tapping one table while "All" or "Core" is selected picks just that table. */
  function familyPicker(el, legend, initial, onChange, extOn = () => true) {
    let sel = new Set(M.cleanFamilies(initial));
    el.innerHTML = `<fieldset class="field"><legend>${legend}</legend>
      <div class="fam-picker">${ALL.map((n) => `<button type="button" data-fam="${n}" class="${n > M.CORE_MAX ? 'ext' : ''}" aria-label="${SP.fam(n)}${n > M.CORE_MAX ? ' (extension)' : ''}">${n}</button>`).join('')}</div>
      <div class="fam-quick"><button type="button" data-quick="core">Core 1–10</button><button type="button" data-quick="all">All 1–12</button></div></fieldset>`;
    const preset = () => sel.size === 12 || (sel.size === 10 && [...sel].every((n) => n <= 10));
    const sync = () => {
      const all = sel.size === 12, core = sel.size === 10 && [...sel].every((n) => n <= 10);
      el.querySelectorAll('[data-fam]').forEach((b) => { b.setAttribute('aria-pressed', String(!all && !core && sel.has(+b.dataset.fam))); if (+b.dataset.fam > M.CORE_MAX) b.disabled = !extOn(); });
      el.querySelector('[data-quick=all]').disabled = !extOn();
      el.querySelector('[data-quick=all]').setAttribute('aria-pressed', String(all));
      el.querySelector('[data-quick=core]').setAttribute('aria-pressed', String(core));
      onChange([...sel].sort((a, b) => a - b));
    };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if (b.dataset.fam) {
        const n = +b.dataset.fam;
        if (preset()) sel = new Set([n]);
        else { sel.has(n) ? sel.delete(n) : sel.add(n); if (!sel.size) sel = new Set(CORE); }
      } else if (b.dataset.quick === 'all') sel = new Set(ALL);
      else if (b.dataset.quick === 'core') sel = new Set(CORE);
      sync();
    });
    sync();
    el.refresh = sync;
  }
  /** Row of toggle buttons; exactly one is pressed. */
  function seg(el, legend, options, value, onChange) {
    el.innerHTML = `<fieldset class="field"><legend>${legend}</legend><div class="seg">${options.map((o) => `<button type="button" data-v="${o.v}">${o.label}</button>`).join('')}</div></fieldset>`;
    const set = (v) => { value = v; el.querySelectorAll('[data-v]').forEach((b) => b.setAttribute('aria-pressed', String(String(v) === b.dataset.v))); };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-v]'); if (!b || b.disabled) return;
      const v = options.find((o) => String(o.v) === b.dataset.v).v; set(v); onChange(v);
    });
    set(value);
    return { disable(off) { el.querySelectorAll('[data-v]').forEach((b) => { b.disabled = off; }); } };
  }
  /** Number pad writing into a display element. */
  function numPad(padEl, display, { max = 3, onChange = () => {} } = {}) {
    padEl.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button type="button" data-k="${n}">${n}</button>`).join('') +
      '<button type="button" data-k="clear" class="k-clear">Clear</button><button type="button" data-k="0">0</button><button type="button" data-k="back" class="k-back" aria-label="Delete">⌫</button>';
    let disabled = false;
    const pad = {
      get value() { return display.textContent; },
      clear() { display.textContent = ''; onChange(''); },
      press(k) {
        if (disabled) return;
        if (k === 'clear') display.textContent = '';
        else if (k === 'back') display.textContent = display.textContent.slice(0, -1);
        else if (/^\d$/.test(k) && display.textContent.length < max) display.textContent += k;
        onChange(display.textContent);
      },
      disable(off) { disabled = off; padEl.setAttribute('aria-disabled', String(off)); },
      /** Handles digits, Backspace, Delete/Escape (clear). Returns true when the key was used. */
      key(e) {
        if (/^\d$/.test(e.key)) { pad.press(e.key); return true; }
        if (e.key === 'Backspace') { pad.press('back'); return true; }
        if (e.key === 'Delete' || e.key === 'Escape') { pad.press('clear'); return true; }
        return false;
      }
    };
    padEl.addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) pad.press(b.dataset.k); });
    display.setAttribute('aria-live', 'polite');
    return pad;
  }

  /** Lesson questions ({ type, hint, explain, ... }) in the shape askQuestion() uses. */
  const fromLesson = (q) => ({ format: q.type === 'choice' ? 'choice' : 'number', prompt: q.prompt, answer: q.answer, options: q.options,
    big: q.big || /^[\d\s×+=?÷−]+$/.test(q.prompt),
    visual: q.visual || null, hints: q.hint ? [{ text: q.hint, visual: q.hintVisual || null }] : [], explain: { text: q.explain, visual: q.explainVisual || null } });

  /** One question: problem → picture → answer → feedback (that order on phones; picture beside the answer on desktop).
      q: { format: 'number'|'choice', prompt, sub?, big?, answer, options?, visual?, hints: [{ text, visual? }], explain: { text, visual? }, typeName? }
      opts: { tries, allowHint, allowSkip, revealType, onDone({ firstTry, hinted, given, skipped }), nextLabel, onNext }
      Optional hooks (used by Subtraction): q.answerText (how the answer is shown), q.visualHtml (a ready picture),
      opts.mountVisual(el, q) (mount a model into the picture area), q.format 'workspace' with opts.mountAnswer(el, q) →
      { value() } (the answer is written in that workspace), q.maxDigits (number pad length), opts.onFinished(el, result). */
  function askQuestion(el, q, opts) {
    const tries = opts.tries || 1, hints = q.hints || [];
    const hasVisual = !!(q.visual || q.visualHtml || (opts.mountVisual && q.sk));
    el.innerHTML = `<div class="qa${hasVisual ? '' : ' no-visual'}${q.format === 'choice' ? ' is-choice' : ''}${q.format === 'workspace' ? ' is-workspace' : ''}">
        <div class="qa-q"><p class="q-prompt${q.big ? ' big' : ''}${q.big && q.prompt.length > 22 ? ' long' : ''}" id="qPrompt">${exprHtml(q.prompt)}</p>${q.expr ? `<p class="q-prompt big q-expr${q.expr.length > 22 ? ' long' : ''}">${exprHtml(q.expr)}</p>` : ''}${q.sub && !(opts.hideHintSub && q.subIsHint) ? `<p class="q-sub">${esc(q.sub)}</p>` : ''}</div>
        <div class="qa-visual">${q.visualHtml ? `<div class="viz-wrap">${q.visualHtml}</div>` : viz(hideTotals(q.visual))}</div>
        <div class="qa-feedback"><div id="qHintBox"></div><div class="feedback" id="qFeedback" role="status" aria-live="polite"></div></div>
        <div class="qa-dock">
          ${q.format === 'choice'
            ? `<div class="choices" role="group" aria-labelledby="qPrompt">${q.options.map((o) => `<button type="button" data-opt="${esc(o)}" aria-pressed="false">${esc(o)}</button>`).join('')}</div>`
            : q.format === 'workspace' ? '<div class="qa-ws" id="qWs"></div>'
            : '<div class="answer" id="qAnswer" role="textbox" aria-readonly="true" aria-label="Your answer (use the number keys)"></div><p class="q-status" id="qStatus" aria-hidden="true"></p><div class="numpad" id="qPad"></div>'}
          <div class="dock-actions" id="qButtons">
            ${opts.allowHint && hints.length ? '<button type="button" class="btn btn-secondary" id="qHint">💡 Hint</button>' : ''}
            ${opts.allowSkip ? '<button type="button" class="btn btn-secondary" id="qSkip">Skip</button>' : ''}
            <button type="button" class="btn btn-primary btn-lg" id="qCheck">${opts.checkLabel || 'Check'}</button>
          </div>
          <div class="dock-actions" id="qNextRow"></div>
        </div>
      </div>`;
    let attempts = 0, hintLevel = 0, done = false, choice = null, firstTry = null;
    const fb = el.querySelector('#qFeedback');
    const pad = q.format === 'number' ? numPad(el.querySelector('#qPad'), el.querySelector('#qAnswer'), { max: q.maxDigits || 3 }) : null;
    if (opts.mountVisual && q.sk) opts.mountVisual(el.querySelector('.qa-visual'), q);
    const ws = q.format === 'workspace' && opts.mountAnswer ? opts.mountAnswer(el.querySelector('#qWs'), q) : null;
    const value = () => (pad ? pad.value : ws ? ws.value() : choice);
    if (q.format === 'choice') el.querySelector('.choices').addEventListener('click', (e) => {
      const b = e.target.closest('[data-opt]'); if (!b || done) return;
      choice = b.dataset.opt;
      el.querySelectorAll('[data-opt]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      // On a long question (a phone), bring Submit into view once an answer is chosen; short questions never move.
      const cb = el.querySelector('#qCheck');
      if (cb && cb.getBoundingClientRect().bottom > window.innerHeight) cb.scrollIntoView({ block: 'nearest' });
    });
    const hintHtml = (h) => `${rich(h.text)}${viz(hideTotals(h.visual))}`;
    /** Show hints up to `level` (1 = clue, 2 = strategy). */
    function revealHints(level) {
      if (done || !hints.length) return;
      hintLevel = Math.min(Math.max(hintLevel, level), hints.length);
      el.querySelector('#qHintBox').innerHTML = `<div class="feedback info"><strong>${hintLevel > 1 ? 'More help:' : 'Hint:'}</strong> ${hints.slice(0, hintLevel).map(hintHtml).join('<br>')}</div>`;
      const hb = el.querySelector('#qHint');
      if (hb) { if (hintLevel >= hints.length) hb.disabled = true; else hb.textContent = '💡 More help'; }
    }
    let requested = false;
    if (opts.allowHint && hints.length) el.querySelector('#qHint').addEventListener('click', () => { requested = true; revealHints(hintLevel + 1); status('💡 Read the hint.'); showFeedback(); });
    const typeLine = () => (opts.revealType && q.typeName ? `<p class="type-reveal">Kind of problem: <b>${esc(q.typeName)}</b></p>` : '');
    /** Bring the help/feedback into view on small screens (it sits below the answer pad). */
    const showFeedback = () => setTimeout(() => {
      const box = el.querySelector('.qa-feedback'); if (!box) return;
      const r = box.getBoundingClientRect();
      if (r.top > window.innerHeight - 80 || r.bottom < 0) box.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }, 20);
    const status = (s) => { const st = el.querySelector('#qStatus'); if (st) st.textContent = s; };
    function finish(given, skipped) {
      done = true;
      if (pad) pad.disable(true);
      el.querySelectorAll('[data-opt]').forEach((b) => { b.disabled = true; if (b.dataset.opt === String(q.answer)) b.classList.add('right'); else if (b.dataset.opt === given) b.classList.add('wrong'); });
      const qb = el.querySelector('#qButtons'); if (qb) qb.remove();
      el.querySelector('.qa').classList.add('done');   // the pad folds away; feedback sits next to Next
      const box = el.querySelector('#qAnswer'); if (box) { box.textContent = String(q.answerText || q.answer); box.classList.add('shown'); }
      const row = el.querySelector('#qNextRow');
      row.innerHTML = `<button type="button" class="btn btn-go btn-lg" id="qNext">${opts.nextLabel || 'Next →'}</button>`;
      row.querySelector('#qNext').addEventListener('click', () => opts.onNext());
      opts.onDone({ firstTry: !!firstTry, hinted: requested, given, skipped: !!skipped });
      if (opts.onFinished) opts.onFinished(el, { correct: !!firstTry, given, skipped: !!skipped });
      setTimeout(() => {
        const n = el.querySelector('#qNext'); if (!n) return;
        n.focus({ preventScroll: true });
        const r = n.getBoundingClientRect();
        const fbBox = el.querySelector('.qa-feedback').getBoundingClientRect();
        if (r.bottom > window.innerHeight || r.top < 0 || fbBox.top > window.innerHeight - 60) el.querySelector('.qa-feedback').scrollIntoView({ block: 'start', behavior: 'auto' });
      }, 30);
    }
    function check() {
      if (done) return;
      const given = value();
      if (given === null || given === '') { fb.className = 'feedback info'; fb.innerHTML = q.format === 'choice' ? 'Choose an answer first.' : 'Type your answer first.'; return; }
      attempts++;
      const ok = q.format === 'choice' ? given === q.answer : /^\s*\d+\s*$/.test(given) && Number(given) === q.answer;
      if (firstTry === null) firstTry = ok;
      if (ok) {
        fb.className = 'feedback ok';
        fb.innerHTML = `<strong>✓ ${attempts === 1 ? 'Correct!' : 'You got it!'}</strong> ${rich(q.explain.text)}${typeLine()}`;
        el.querySelector('#qHintBox').innerHTML = '';
        return finish(given);
      }
      if (attempts < tries) {
        // Progressive help: first miss → the clue, second miss → the strategy (with a picture).
        revealHints(attempts);
        fb.className = 'feedback bad';
        fb.innerHTML = `<strong>Not quite — try again.</strong> ${hints.length ? 'Use the help to think it through.' : ''}`;
        status(hints.length ? 'Not quite. Read the hint and try again.' : 'Not quite. Try again.');
        if (pad) pad.clear(); else { choice = null; el.querySelectorAll('[data-opt]').forEach((x) => x.setAttribute('aria-pressed', 'false')); }
        showFeedback();
        return;
      }
      el.querySelector('#qHintBox').innerHTML = '';
      fb.className = 'feedback bad';
      fb.innerHTML = `<strong>The answer is ${esc(q.answerText || q.answer)}.</strong> ${rich(q.explain.text)}${viz(q.explain.visual)}${typeLine()}`;
      finish(given);
    }
    el.querySelector('#qCheck').addEventListener('click', check);
    if (opts.allowSkip) el.querySelector('#qSkip').addEventListener('click', () => {
      if (done) return;
      firstTry = false;
      fb.className = 'feedback info';
      fb.innerHTML = `<strong>Skipped. The answer is ${esc(q.answerText || q.answer)}.</strong> ${rich(q.explain.text)}${viz(q.explain.visual)}${typeLine()}`;
      finish(null, true);
    });
    onKey = (e) => {
      if (done) { if (e.key === 'Enter' && !onButton(e)) { e.preventDefault(); opts.onNext(); } return; }
      if (pad && pad.key(e)) { e.preventDefault(); return; }
      // In a workspace, Enter belongs to the workspace (it commits a regroup mark); Submit is a button.
      if (ws && e.target && e.target.closest && e.target.closest('.sk')) return;
      if (e.key === 'Enter' && !onButton(e)) { e.preventDefault(); check(); }
    };
  }
  window.GalaxyUI = { askQuestion, actHead: (...a) => actHead(...a) };   // shared with the Subtraction adapter (js/sub-galaxy.js)

  /* ---------- landing ---------- */
  GM.SUBJECTS.forEach((s) => {
    const b = document.createElement('button');
    const open = s.status === 'open';
    b.className = `subject s-${s.id} ${open ? 'open' : 'soon'}`;
    b.dataset.subject = s.id;
    const readyNames = GM.ACTIVITIES.filter((a) => GM.isActivityReady(s.id, a.id)).map((a) => a.name);
    const label = !open ? 'Coming Soon' : readyNames.length === GM.ACTIVITIES.length ? 'Learn · Practice · Think · Flash · Test' : readyNames.length ? readyNames.join(' · ') : 'Lessons on the way';
    b.innerHTML = `<span class="sym" aria-hidden="true">${s.symbol}</span><span class="sName">${s.name}</span>` +
      (open ? `<span class="go">${label} →</span>` : `<span class="badge soon">${label}</span>`);
    if (open) { b.setAttribute('aria-label', `${s.name}. ${label}`); b.onclick = () => nav('#/' + s.id); }
    else {
      b.setAttribute('aria-disabled', 'true'); b.setAttribute('aria-label', `${s.name}. Coming soon`);
      b.onclick = () => { $('landingNote').textContent = `${s.name} is coming soon! Try Multiplication for now.`; };
    }
    $('subjects').appendChild(b);
  });

  /* ---------- activity menu ---------- */
  const ACCENT = { addition: 'grass-d', subtraction: 'sky-d', multiplication: 'grape-d', division: 'coral-d' };
  function renderMenu(sid) {
    const s = GM.getSubject(sid);
    $('menuTitle').textContent = s.name; $('menuSym').textContent = s.symbol;
    $('menu').style.setProperty('--accent', `var(--${ACCENT[sid]})`);
    const ready = GM.ACTIVITIES.filter((a) => GM.isActivityReady(sid, a.id));
    $('menuSub').textContent = ready.length === GM.ACTIVITIES.length ? 'What would you like to do?'
      : ready.length ? `${ready.length > 1 ? `${ready.slice(0, -1).map((a) => a.name).join(', ')} and ${ready[ready.length - 1].name} are` : `${ready[0].name} is`} ready. The others are coming soon.` : `${s.name} lessons and cards are being built. Check back soon!`;
    $('menuNote').textContent = '';
    const sub = sid === 'subtraction' && window.GalaxySubtraction ? window.GalaxySubtraction.menuMeta() : null;
    const done = sub ? sub.lessonsDone : sid === SUBJ ? store.summary().lessonsDone : 0;
    const box = $('modes'); box.innerHTML = '';
    GM.ACTIVITIES.forEach((a) => {
      const ok = GM.isActivityReady(sid, a.id), b = document.createElement('button');
      b.className = `mode m-${a.id} ${ok ? 'ready' : 'soon'}`; b.dataset.activity = a.id;
      const extra = ok && a.id === 'teach' && (sub || sid === SUBJ) ? `<span class="mMeta">${done} of ${sub ? sub.lessonsTotal : L.LESSONS.length} lessons done</span>` : '';
      b.innerHTML = `<span class="mIcon" aria-hidden="true">${a.icon}</span><span class="mText"><span class="mName">${a.name}</span>` +
        (ok ? `<span class="mBlurb">${a.blurb}</span>${extra}` : '<span class="badge soon">Coming soon</span>') + '</span>';
      if (ok) b.onclick = () => nav(`#/${sid}/${a.id}`);
      else { b.setAttribute('aria-disabled', 'true'); b.setAttribute('aria-label', `${a.name}. Coming soon`); b.onclick = () => { $('menuNote').textContent = `${s.name} ${a.name} is coming soon!`; }; }
      box.appendChild(b);
    });
    const grown = (GM.hasView(sid, 'progress') ? `<button class="btn btn-ghost" data-nav="#/${sid}/progress">📊 Progress</button>` : '') + (GM.hasView(sid, 'settings') ? `<button class="btn btn-ghost" data-nav="#/${sid}/settings">⚙️ Parent Settings</button>` : '');
    $('menuExtra').innerHTML = (grown ? `<span class="grownups">For grown-ups:</span>${grown}` : '') +
      '<button class="btn btn-ghost" data-nav="#/">⬅ All subjects</button>';
  }

  /* =====================================================================================
     TEACH — Show me how
     ===================================================================================== */
  let lessonState = null;
  const UNITS = [
    { name: 'What multiplication means', ids: ['equal-groups', 'repeated-addition', 'rows-columns', 'arrays'] },
    { name: 'Facts and equations', ids: ['equations', 'missing-factors', 'commutative', 'fact-families', 'strategies'] },
    { name: 'Use it and check it', ids: ['word-problems', 'connecting', 'check-the-work', 'times-as-many'] }
  ];
  function renderTeach() {
    const sum = store.summary({ lessonsTotal: L.LESSONS.length });
    const st = (id) => sum.lessons[id];
    const done = (id) => !!(st(id) && st(id).completed);
    const next = L.LESSONS.find((l) => !done(l.id)) || null;
    const num = (id) => L.LESSONS.findIndex((l) => l.id === id) + 1;
    const status = (id) => (done(id) ? '<span class="lp-done" title="Completed" aria-label="completed">✓</span>' : st(id) ? `<span class="lp-tried">best ${st(id).best} of 3</span>` : '');
    $('teach').innerHTML = screenHead('teachTitle', '💡 Teach <span class="h-sub">Show me how</span>') +
      `<div class="teach-layout">
        ${next ? `<div class="panel up-next"><p class="step-label">Up next · Lesson ${num(next.id)} of ${L.LESSONS.length}</p><h3 class="up-title">${esc(next.title)}</h3>
            <p class="lede">${esc(next.objective)}</p><button class="btn btn-go btn-lg" id="upNextStart" data-start="${next.id}">▶ Start this lesson</button>
            <p class="muted">${sum.lessonsDone} of ${L.LESSONS.length} lessons done</p></div>`
          : '<div class="panel up-next"><h3 class="up-title">All lessons done! ⭐</h3><p class="lede">Pick any lesson to look at it again.</p></div>'}
        <div class="panel lesson-path"><h3>All lessons</h3>${(L.UNITS || UNITS).map((u, ui) => {
          const open = next ? u.ids.includes(next.id) : ui === 0, n = u.ids.filter(done).length;
          return `<details class="unit"${open ? ' open' : ''}><summary><span class="unit-name">${ui + 1}. ${u.name}</span><span class="badge${n === u.ids.length ? ' done' : ''}">${n} of ${u.ids.length}</span></summary>
            <ol class="lp-list">${u.ids.map((id) => `<li><button class="lesson-row${next && id === next.id ? ' next' : ''}${done(id) ? ' is-done' : ''}" data-lesson="${id}"><span class="lp-num">${num(id)}</span><span class="lp-title">${esc(lessonTitle(id))}</span>${status(id)}</button></li>`).join('')}</ol></details>`;
        }).join('')}</div></div>`;
    $('teach').querySelectorAll('[data-lesson]').forEach((b) => b.addEventListener('click', () => startLesson(b.dataset.lesson)));
    if ($('upNextStart')) $('upNextStart').onclick = () => startLesson($('upNextStart').dataset.start);
    show('teach', crumbFor('Teach'));
  }
  function startLesson(id) {
    T.clearAll();
    lessonState = { lesson: L.getLesson(id), idx: L.LESSONS.findIndex((l) => l.id === id), step: 0, ex: 1, guidedDone: false, checkI: 0, checkRes: [], recorded: false };
    renderLesson(true);
  }
  // Steps: 0 Goal, 1 Explanation, 2 See it, 3 Worked example, 4 Try it together, 5 Check yourself, 6 Finish
  function renderLesson(first) {
    const st = lessonState, l = st.lesson;
    onKey = null;
    const stepsBar = L.STEPS.map((name, i) => `<li class="${i < st.step ? 'done' : i === st.step ? 'on' : ''}"><span>${name}</span></li>`).join('');
    let body = '', nextOk = true;
    const nextLabel = `Next: ${L.STEPS[st.step + 1] || ''} →`;
    if (st.step === 0) {
      body = `<p class="step-label">Goal</p><p class="objective">${esc(l.objective)}</p><h3>Key words</h3>
        <ul class="words">${l.words.map((w) => `<li><b>${esc(w.term)}</b>: ${esc(w.meaning)}</li>`).join('')}</ul>`;
    } else if (st.step === 1) {
      body = `<div class="explain lede">${l.explain.text.map((t) => `<p>${rich(t)}</p>`).join('')}</div>`;
    } else if (st.step === 2) {
      body = `${viz(l.explain.visual)}<p class="caption">${rich(l.explain.caption)}</p>`;
    } else if (st.step === 3) {
      const all = st.ex >= l.example.steps.length;
      body = `<h3>${rich(l.example.title)}</h3><div class="example-grid">${viz(l.example.visual)}
        <ol class="ex-steps">${l.example.steps.map((s, i) => `<li${i < st.ex ? '' : ' hidden'}>${rich(s)}</li>`).join('')}</ol></div>
        ${all ? '' : '<div class="btn-row"><button class="btn btn-secondary" id="exMore">Show the next step</button></div>'}`;
      nextOk = all;
    } else if (st.step === 4) {
      body = '<p class="step-label lead-in">Solve this one together. Ask for a hint if you need it.</p><div id="lessonQ"></div>';
    } else if (st.step === 5) {
      body = `<p class="step-label lead-in">Question ${st.checkI + 1} of 3 · On your own: no hints this time.</p><div id="lessonQ"></div>`;
    } else {
      const score = st.checkRes.filter(Boolean).length, passed = score >= L.PASS;
      if (!st.recorded) { store.recordLesson(l.id, score, passed); st.recorded = true; }
      const isLast = st.idx === L.LESSONS.length - 1;
      body = `<div class="finish">${passed ? '<p class="stars" aria-hidden="true">⭐⭐⭐</p>' : ''}
        <h3>${passed ? 'Lesson complete!' : 'Almost there!'}</h3><p class="big-score">${score} of 3</p>
        <p>${passed ? `You can now say: “${esc(l.objective)}”` : `You need ${L.PASS} of 3 to finish this lesson. Look at the picture again, then try the check once more.`}</p>
        <div class="btn-row center" style="margin-top:16px">
          ${passed ? (isLast ? '' : `<button class="btn btn-go btn-lg" id="nextLesson">Next lesson: ${esc(L.LESSONS[st.idx + 1].title)} →</button>`)
            : '<button class="btn btn-go btn-lg" id="retryCheck">Try the check again</button><button class="btn btn-secondary" id="reviewLesson">Review the lesson</button>'}
          <button class="btn btn-secondary" data-nav="${MENU}/teach">All lessons</button>
        </div></div>`;
    }
    const nav2 = st.step >= 5 ? '' : `<div class="btn-row between lesson-nav">
        <button class="btn btn-secondary" id="lessonBack" ${st.step === 0 ? 'disabled' : ''}>← Back</button>
        ${st.step === 4 ? '' : `<button class="btn btn-primary btn-lg" id="lessonNext" ${nextOk ? '' : 'disabled'}>${nextLabel}</button>`}</div>`;
    $('lesson').innerHTML = screenHead('lessonTitle', `Lesson ${st.idx + 1}: ${esc(l.title)}`, `${MENU}/teach`, '⬅ All lessons') +
      `<div class="panel lesson-panel ${st.step === 0 ? 'cream' : ''}"><ol class="stepper" aria-hidden="true">${stepsBar}</ol>
        <p class="step-label" id="stepLabel">Step ${st.step + 1} of ${L.STEPS.length} · ${L.STEPS[st.step]}</p>
        <div class="stack lesson-body">${body}</div>${nav2}</div>`;
    const go = (d) => { st.step += d; renderLesson(); };
    if ($('lessonBack')) $('lessonBack').onclick = () => go(-1);
    if ($('lessonNext')) $('lessonNext').onclick = () => go(1);
    if ($('exMore')) $('exMore').onclick = () => { st.ex++; renderLesson(); const n = $(st.ex >= l.example.steps.length ? 'lessonNext' : 'exMore'); if (n) n.focus(); };
    if ($('retryCheck')) $('retryCheck').onclick = () => { Object.assign(st, { step: 5, checkI: 0, checkRes: [], recorded: false }); renderLesson(); };
    if ($('reviewLesson')) $('reviewLesson').onclick = () => { Object.assign(st, { step: 1, checkI: 0, checkRes: [], recorded: false }); renderLesson(); };
    if ($('nextLesson')) $('nextLesson').onclick = () => startLesson(L.LESSONS[st.idx + 1].id);
    if (st.step === 4) {
      askQuestion($('lessonQ'), fromLesson(l.guided), { tries: 2, allowHint: true, nextLabel: 'Next: Check yourself →',
        onDone: () => { st.guidedDone = true; }, onNext: () => go(1) });
    }
    if (st.step === 5) {
      const q = l.check[st.checkI], last = st.checkI === l.check.length - 1;
      askQuestion($('lessonQ'), fromLesson(q), { tries: 1, allowHint: false, nextLabel: last ? 'See my result →' : 'Next question →',
        onDone: (r) => { st.checkRes[st.checkI] = r.firstTry; },
        onNext: () => { if (last) st.step = 6; else st.checkI++; renderLesson(); } });
    }
    if (first) show('lesson', crumbFor('Teach'));
    else { const h = $('lessonTitle'); if (h) h.focus({ preventScroll: true }); window.scrollTo(0, 0); }
  }
  /** Open a lesson from anywhere (e.g. a Lab recommendation). */
  function openLesson(id) { history.pushState(null, '', `${MENU}/teach`); stopAll(); renderTeach(); startLesson(id); }

  /* =====================================================================================
     PRACTICE — Let me try
     ===================================================================================== */
  let practiceState = null;
  /** Missed questions from Practice/Lab plus facts missed in Tests, as practice pairs. */
  function missPairs() {
    const pairs = store.missedQuestions().map((m) => ({ type: m.type, fam: m.fam, other: m.other }));
    for (const f of store.missedFacts()) if (!pairs.some((p) => p.fam === f.fam && p.other === f.other)) pairs.push({ type: 'fact', fam: f.fam, other: f.other });
    return pairs.filter((p) => settings.extension || (p.fam <= M.CORE_MAX && p.other <= M.CORE_MAX)).slice(0, 30);
  }
  function renderPracticeSetup() {
    const pairs = missPairs();
    $('practiceSetup').innerHTML = screenHead('practiceSetupTitle', '✏️ Practice <span class="h-sub">Let me try</span>') +
      `<div class="panel workspace start-hero"><div class="hero-icon" aria-hidden="true">✏️</div><div class="hero-body">
        <h3 class="hero-title">Let's practice!</h3>
        <div class="chips-big"><span>${settings.practice.count} problems</span><span>${tablesText(settings.tables)}</span><span>No timer</span></div>
        <p class="lede">Lots of different kinds of problems. Ask for a hint any time.</p>
        <button class="btn btn-go btn-lg" id="psStart">▶ Start practice</button></div></div>
       <div class="panel ice"><div class="panel-head"><h3>Practice my misses</h3><span class="badge">${pairs.length} problem${pairs.length === 1 ? '' : 's'}</span></div>
         ${pairs.length ? `<p class="muted">Problems you missed in Practice, the Lab or a Test come back here until you get them right.</p>
           <div class="btn-row" style="margin-top:12px"><button class="btn btn-primary" id="psMisses">Practice my misses</button></div>`
          : '<p class="muted">Nothing here yet. Problems you miss come back here until you get them right.</p>'}</div>
       <p class="grownup-note">Grown-ups: number of problems and ${SP.famsNoun} are in <a href="${MENU}/settings" data-nav="${MENU}/settings">Parent Settings</a>.</p>`;
    $('psStart').onclick = () => startPractice({ count: settings.practice.count });
    if ($('psMisses')) $('psMisses').onclick = () => startPractice({ pairs, count: M.missPracticeCount(pairs.length) });
    show('practiceSetup', crumbFor('Practice'));
  }
  function startPractice({ count, pairs }) {
    T.clearAll();
    const types = settings.lab.allTypes ? B.TYPES.map((t) => t.id) : B.practiceTypes(store.completedLessons());
    practiceState = { qs: B.makeSet({ types, families: usableTables(settings.tables), extension: settings.extension, count, pairs }), i: 0, results: [], fromMisses: !!pairs };
    renderPracticeQ(true);
  }
  function renderPracticeQ(first) {
    const ps = practiceState, q = ps.qs[ps.i], n = ps.qs.length, last = ps.i === n - 1;
    $('practice').innerHTML = `<div class="panel workspace">${actHead({ id: 'practiceTitle', title: `✏️ Practice${ps.fromMisses ? ': my misses' : ''}`,
        count: `<span class="act-count" id="pCount">Question ${ps.i + 1} of ${n}</span>`, right: `<span class="badge type">${esc(q.typeName)}${q.extension ? ' · extension' : ''}</span>`,
        exit: `<button class="btn btn-ghost-light" data-nav="${MENU}">✕ Exit</button>`, now: ps.i, max: n, label: 'Practice progress' })}
        <div id="pQ" class="q-host"></div></div>`;
    askQuestion($('pQ'), q, { tries: q.format === 'choice' ? 1 : 3, allowHint: true, nextLabel: last ? 'See my results →' : 'Next question →',
      onDone: (r) => { ps.results.push({ q, firstTry: r.firstTry, hinted: r.hinted }); store.recordPracticeAnswer(q, r.firstTry, r.hinted); },
      onNext: () => { if (last) finishPractice(); else { ps.i++; renderPracticeQ(); } } });
    if (first) show('practice', crumbFor('Practice'));
    else { $('practiceTitle').focus({ preventScroll: true }); window.scrollTo(0, 0); }
  }
  /** Missed questions with their worked explanations (shared by the Practice and Lab reports). */
  const reviewList = (items, id) => `<ul class="missed-list" id="${id}">${items.map((q) => `<li><details><summary><span class="badge type">${esc(q.typeName)}</span> ${rich(promptText(q))} → <b>${esc(q.answer)}</b></summary>
      <p style="margin-top:6px">${rich(q.explain.text)}</p>${viz(q.explain.visual)}</details></li>`).join('')}</ul>`;
  function finishPractice() {
    const ps = practiceState; onKey = null;
    store.recordPracticeSession(ps.results.map((r) => r.q.typeId));
    const right = ps.results.filter((r) => r.firstTry).length, hints = ps.results.filter((r) => r.hinted).length;
    const missed = ps.results.filter((r) => !r.firstTry);
    $('practiceDone').innerHTML = screenHead('practiceDoneTitle', '✏️ Practice complete!') +
      `<div class="panel"><div class="results-top"><div class="pct">${right}/${ps.results.length}</div>
          <div><p class="lede"><b>${right} of ${ps.results.length}</b> right on the first try${hints ? ` · ${hints} hint${hints === 1 ? '' : 's'} used` : ''}.</p>
          <p class="muted">${right === ps.results.length ? 'Every one on the first try. Stellar!' : 'Mistakes help your brain grow. Look at the ones below, then practice them again.'}</p></div></div></div>
       ${missed.length ? `<div class="panel cream"><h3>Look again</h3>${reviewList(missed.map((r) => r.q), 'pdMissed')}</div>` : ''}
       <div class="btn-row center" style="margin-top:16px">
         ${missed.length ? '<button class="btn btn-go btn-lg" id="pdAgain">Practice these again</button>' : ''}
         <button class="btn btn-primary" id="pdNew">New practice</button>
         <button class="btn btn-ghost" data-nav="${MENU}">⬅ ${SP.name}</button></div>`;
    if ($('pdAgain')) $('pdAgain').onclick = () => { const pairs = missed.map((r) => ({ type: r.q.typeId, fam: r.q.fam, other: r.q.other })); startPractice({ pairs, count: M.missPracticeCount(pairs.length) }); };
    $('pdNew').onclick = () => nav(`${MENU}/practice`);
    show('practiceDone', crumbFor('Practice'));
  }

  /* =====================================================================================
     MATH THINKING LAB — Make me think
     ===================================================================================== */
  let labState = null;
  const LAB_SIZES = [{ n: 10, name: 'Quick Challenge', icon: '🚀' }, { n: 25, name: 'Thinking Workout', icon: '🪐' }, { n: 50, name: 'Big Challenge', icon: '🌌' }];
  function labTypes() { return settings.lab.allTypes ? B.TYPES.map((t) => t.id) : B.unlockedTypes(store.completedLessons(), store.practiceCorrect()); }
  function renderLabSetup() {
    const types = labTypes(), locked = B.TYPES.filter((t) => !types.includes(t.id));
    const next = locked.length ? L.getLesson(locked[0].lesson) : null;
    $('labSetup').innerHTML = screenHead('labSetupTitle', '🧪 Math Thinking Lab') +
      `<p class="screen-sub">Different problems. Different ways to think.</p>
       <div class="lab-sizes">${LAB_SIZES.map((s) => `<button class="lab-size" data-size="${s.n}"><span class="ls-icon" aria-hidden="true">${s.icon}</span><span class="ls-n">${s.n}</span><span class="ls-unit">problems</span><span class="ls-name">${s.name}</span></button>`).join('')}</div>
       <div class="panel ice lab-info"><p><b>No timer.</b> One try for each problem, then you'll see how to think about it.</p>
         <p>Your Lab has <b id="labTypeCount">${types.length} of ${B.TYPES.length}</b> kinds of problems.</p>
         ${locked.length ? `<p class="muted">More kinds join the Lab when you finish a Teach lesson or try them in Practice.${next ? ` Next up: <b>${esc(next.title)}</b>.` : ''}</p>
           <div class="btn-row" style="margin-top:8px">${next ? `<button class="btn btn-secondary" id="labLearn">Learn “${esc(next.title)}”</button>` : ''}<button class="btn btn-secondary" data-nav="${MENU}/practice">Go to Practice</button></div>` : '<p class="muted">Every kind of problem is in your Lab.</p>'}</div>`;
    $('labSetup').querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', () => startLab(+b.dataset.size)));
    if ($('labLearn')) $('labLearn').onclick = () => openLesson(next.id);
    show('labSetup', crumbFor('Math Thinking Lab'));
  }
  function startLab(count) {
    T.clearAll();
    labState = { qs: B.makeSet({ types: labTypes(), families: usableTables(settings.tables), extension: settings.extension, count }), i: 0, answers: [] };
    renderLabQ(true);
  }
  function renderLabQ(first) {
    const ls = labState, q = ls.qs[ls.i], n = ls.qs.length, last = ls.i === n - 1;
    $('lab').innerHTML = `<div class="panel workspace">${actHead({ id: 'labTitle', title: '🧪 Math Thinking Lab', count: `<span class="act-count" id="lCount">Problem ${ls.i + 1} of ${n}</span>`,
        right: `<span class="muted" id="lScore">${ls.answers.filter((x) => x.correct).length} right so far</span>`, exit: '<button class="btn btn-ghost-light" id="labExit">✕ Exit</button>',
        now: ls.i, max: n, label: 'Challenge progress' })}
        <div class="feedback info lab-leave" id="labLeave" hidden><strong>Leave the challenge?</strong> Problems you have answered can still count.
          <div class="btn-row" style="margin-top:8px"><button class="btn btn-primary" id="labFinishNow">Finish now and see my report</button><button class="btn btn-secondary" id="labStay">Keep going</button><button class="btn btn-danger" data-nav="${MENU}" id="labQuit">Leave without saving</button></div></div>
        <div id="lQ" class="q-host"></div></div>`;
    // Lab: no hints and no strategy label before answering; the type is named in the feedback afterwards.
    askQuestion($('lQ'), q, { tries: 1, allowHint: false, allowSkip: true, revealType: true, hideHintSub: true, checkLabel: 'Submit', nextLabel: last ? 'See my report →' : 'Next problem →',
      onDone: (r) => { ls.answers.push({ q, given: r.skipped ? null : r.given, correct: r.firstTry }); },
      onNext: () => { if (last) finishLab(); else { ls.i++; renderLabQ(); } } });
    $('labExit').onclick = () => { $('labFinishNow').hidden = ls.answers.length === 0; $('labLeave').hidden = false; $('labStay').focus(); };
    $('labStay').onclick = () => { $('labLeave').hidden = true; };
    $('labFinishNow').onclick = () => finishLab();
    if (first) show('lab', crumbFor('Math Thinking Lab'));
    else { $('labTitle').focus({ preventScroll: true }); window.scrollTo(0, 0); }
  }
  function finishLab() {
    const ls = labState; onKey = null;
    const sc = B.scoreSession(ls.answers);
    store.recordLab(sc, ls.answers);
    const types = Object.keys(sc.byType).sort((a, b) => B.TYPES.findIndex((t) => t.id === a) - B.TYPES.findIndex((t) => t.id === b));
    // Recommend the lessons behind the question types missed most (up to three).
    const missCount = {};
    for (const m of sc.missed) missCount[m.q.typeId] = (missCount[m.q.typeId] || 0) + 1;
    const lessonIdx = (id) => L.LESSONS.findIndex((l) => l.id === B.TYPE[id].lesson);
    const recs = [...new Set(Object.entries(missCount).sort((x, y) => (y[1] - x[1]) || (B.TYPE[x[0]].difficulty - B.TYPE[y[0]].difficulty) || (lessonIdx(x[0]) - lessonIdx(y[0])))
      .map(([id]) => B.TYPE[id].lesson))].slice(0, 3);
    $('labDone').innerHTML = screenHead('labDoneTitle', '🧪 Lab report') +
      `<div class="panel"><div class="results-top"><div><div class="pct" id="ldPct">${sc.percent}%</div><p class="center muted">${sc.correct} of ${sc.total} right</p></div>
          <div class="tally"><div class="c"><b id="ldC">${sc.correct}</b>correct</div><div class="i"><b id="ldI">${sc.incorrect}</b>incorrect</div><div class="u"><b id="ldU">${sc.unanswered}</b>skipped</div></div></div>
        <p class="center" style="margin-top:10px">${sc.percent >= 90 ? 'Brilliant thinking!' : sc.percent >= 70 ? 'Great thinking. Look at the problems below to grow even more.' : 'Good effort. Every problem you look at again makes your brain stronger.'}</p></div>
       <div class="panel"><h3>How you did with each kind of problem</h3><div class="table-wrap"><table class="data" id="ldTypes"><thead><tr><th>Kind of problem</th><th>Right</th></tr></thead><tbody>
         ${types.map((id) => `<tr><td>${esc(B.TYPE[id].name)}</td><td>${sc.byType[id].correct} of ${sc.byType[id].total}</td></tr>`).join('')}</tbody></table></div>
         </div>
       ${sc.missed.length ? `<div class="panel cream"><h3>Problems to look at again</h3>${reviewList(sc.missed.map((m) => m.q), 'ldMissed')}</div>` : ''}
       ${recs.length ? `<div class="panel ice"><h3>Recommended lessons</h3><div class="btn-row" style="margin-top:8px" id="ldRecs">${recs.map((id) => `<button class="btn btn-secondary" data-rec="${id}">💡 ${esc(lessonTitle(id))}</button>`).join('')}</div></div>` : ''}
       <div class="btn-row center" style="margin-top:16px">
         ${sc.missed.length ? '<button class="btn btn-primary" id="ldMisses">Practice my misses</button>' : ''}
         <button class="btn btn-go btn-lg" id="ldAgain">Start another challenge</button>
         <button class="btn btn-ghost" data-nav="${MENU}">⬅ ${SP.name}</button></div>`;
    $('labDone').querySelectorAll('[data-rec]').forEach((b) => b.addEventListener('click', () => openLesson(b.dataset.rec)));
    if ($('ldMisses')) $('ldMisses').onclick = () => {
      const pairs = sc.missed.map((m) => ({ type: m.q.typeId, fam: m.q.fam, other: m.q.other }));
      history.pushState(null, '', `${MENU}/practice`); stopAll(); startPractice({ pairs, count: M.missPracticeCount(pairs.length) });
    };
    $('ldAgain').onclick = () => nav(`${MENU}/lab`);
    labState = null;
    show('labDone', crumbFor('Lab report'));
  }

  /* =====================================================================================
     FLASHCARDS — Help me remember
     ===================================================================================== */
  let fcState = null;
  function renderFcSetup() {
    const tables = settings.extension ? ALL : CORE, f = settings.fc;
    $('fcSetup').innerHTML = screenHead('fcSetupTitle', '🃏 Flashcards <span class="h-sub">Help me remember</span>') +
      `<div class="panel start-panel fc-setup"><h3 class="center">${SP.pickTitle}</h3><p class="muted center">Tap one to start.</p>
        <div class="table-pick" id="fsPick">${tables.map((n) => `<button type="button" data-table="${n}" aria-label="Start ${SP.famOne(n)}">${SP.fam(n)}</button>`).join('')}<button type="button" data-table="0" class="mixed" aria-label="Start ${SP.mixed}">🔀 Mixed</button></div>
        <p class="muted center">${f.reveal ? `Each answer shows after ${f.reveal} seconds. Tap the card to see it sooner.` : 'Tap the card to see each answer.'}</p></div>
       <p class="grownup-note">Grown-ups: timing and session length are in <a href="${MENU}/settings" data-nav="${MENU}/settings">Parent Settings</a>.</p>`;
    if (!tables.includes(f.table)) f.table = 0;
    $('fsPick').addEventListener('click', (e) => { const b = e.target.closest('[data-table]'); if (!b) return; f.table = +b.dataset.table; saveSettings(); startFlashcards(); });
    show('fcSetup', crumbFor('Flashcards'));
  }
  function startFlashcards() {
    T.clearAll();
    const f = settings.fc, fams = f.table ? [f.table] : usableTables(ALL), facts = M.factsFor(fams, settings.extension ? 12 : M.CORE_MAX);
    fcState = { deck: f.order === 'shuffle' ? M.shuffle(facts.slice()) : facts, idx: 0, seen: 1, reveal: f.reveal, hold: f.hold, totalMs: f.minutes * 60000,
      activeMs: 0, resumedAt: Date.now(), paused: false, flipped: false, phase: null, families: fams };
    const tap = f.reveal === 0;
    $('fc').innerHTML = `<div class="panel workspace fc-space">${actHead({ id: 'fcTitle', title: `🃏 ${f.table ? SP.fam(f.table) : 'Mixed'} flashcards`, count: '<span class="act-count" id="fcSeen"></span>',
        right: '<span class="timer-pill" id="fcClock"></span>', exit: `<button class="btn btn-ghost-light" data-nav="${MENU}">✕ Exit</button>`, now: 1, max: 1, label: 'Time left', spanId: 'fcBar' })}
        <div class="fc-stage"><button class="fc" id="fcCard" aria-label="Flash card. Tap to see the answer."><div class="fc-face fc-front" id="fcFront"></div><div class="fc-face fc-back" id="fcBack"></div></button></div>
        <p class="fc-status" id="fcStatus" aria-live="polite"></p>
        <div class="fc-controls-row">
          <button class="btn btn-primary btn-lg" id="fcFlip">👀 Show answer</button>
          ${tap ? '<button class="btn btn-secondary btn-lg" id="fcNext">Next card ➜</button>' : ''}
          <button class="btn btn-secondary btn-lg" id="fcPause">⏸ Pause</button>
          <button class="btn btn-ghost-light btn-lg" id="fcEnd">✓ I'm done</button>
        </div></div>`;
    $('fcCard').onclick = () => fcFlip();
    $('fcFlip').onclick = () => fcFlip();
    if ($('fcNext')) $('fcNext').onclick = () => fcMove(1);
    $('fcPause').onclick = fcTogglePause;
    $('fcEnd').onclick = fcFinish;
    onKey = (e) => {
      if (e.key === ' ' && !onButton(e)) { e.preventDefault(); fcFlip(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); fcMove(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); fcMove(-1); }
      else if (e.key === 'p' || e.key === 'P') fcTogglePause();
    };
    fcShowCard();
    T.every(fcTick, 250);
    fcTick();
    show('fc', crumbFor('Flashcards'));
  }
  const fcElapsed = () => fcState.activeMs + (fcState.paused ? 0 : Date.now() - fcState.resumedAt);
  function fcTick() {
    const s = fcState; if (!s) return;
    const left = Math.max(0, s.totalMs - fcElapsed());
    $('fcClock').textContent = `${fmt(Math.ceil(left / 1000))} left`;
    $('fcSeen').textContent = `${s.seen} card${s.seen === 1 ? '' : 's'}`;
    $('fcBar').style.width = `${(left / s.totalMs) * 100}%`;
    if (left <= 0) fcFinish();
  }
  function fcStatusText() {
    const s = fcState;
    if (s.paused) return 'Paused';
    return s.reveal === 0 ? 'Think of the answer, then tap the card.' : `Think of the answer. It shows in ${s.reveal} seconds.`;
  }
  function fcShowCard() {
    const s = fcState, { fam, other } = s.deck[s.idx];
    s.flipped = false;
    $('fcCard').classList.remove('flip');
    $('fcFront').innerHTML = SP.flashFront(fam, other);
    $('fcBack').innerHTML = SP.flashBack(fam, other);
    $('fcCard').setAttribute('aria-label', `Flash card: ${SP.flashAria(fam, other)}. Tap to see the answer.`);
    $('fcStatus').textContent = fcStatusText();
    $('fcFlip').textContent = '👀 Show answer';
    fcSchedule();
  }
  /** Auto mode: flip after `reveal` seconds, then hold the answer for `hold` seconds, then the next card. */
  function fcSchedule() {
    const s = fcState;
    T.cancel(s.phase); s.phase = null;
    if (s.reveal === 0 || s.paused) return;
    if (!s.flipped) s.phase = T.after(() => { fcSetFlip(true); s.phase = T.after(() => fcMove(1), s.hold * 1000); }, s.reveal * 1000);
    else s.phase = T.after(() => fcMove(1), s.hold * 1000);
  }
  function fcSetFlip(on) {
    const s = fcState; s.flipped = on;
    $('fcCard').classList.toggle('flip', on);
    const { fam, other } = s.deck[s.idx];
    $('fcCard').setAttribute('aria-label', on ? `Answer: ${SP.flashAnswerAria(fam, other)}` : `Flash card: ${SP.flashAria(fam, other)}. Tap to see the answer.`);
    $('fcFlip').textContent = on ? '🙈 Hide answer' : '👀 Show answer';
  }
  function fcFlip() { const s = fcState; if (!s || s.paused) return; fcSetFlip(!s.flipped); fcSchedule(); }
  function fcMove(d) {
    const s = fcState; if (!s || s.paused) return;
    if (d > 0) {
      s.idx++; s.seen++;
      if (s.idx >= s.deck.length) { s.idx = 0; if (settings.fc.order === 'shuffle') M.shuffle(s.deck); }
    } else s.idx = (s.idx - 1 + s.deck.length) % s.deck.length;
    fcShowCard(); fcTick();
  }
  function fcTogglePause() {
    const s = fcState; if (!s) return;
    if (!s.paused) { s.activeMs += Date.now() - s.resumedAt; s.paused = true; T.cancel(s.phase); s.phase = null; }
    else { s.paused = false; s.resumedAt = Date.now(); fcSchedule(); }
    $('fc').classList.toggle('paused', s.paused);
    $('fcPause').textContent = s.paused ? '▶ Resume' : '⏸ Pause';
    ['fcFlip', 'fcNext'].forEach((id) => { if ($(id)) $(id).disabled = s.paused; });
    $('fcStatus').textContent = fcStatusText();
  }
  function fcFinish() {
    const s = fcState; if (!s) return;
    const seconds = Math.round(Math.min(fcElapsed(), s.totalMs) / 1000);
    T.clearAll(); onKey = null; fcState = null;
    $('fc').classList.remove('paused');
    store.recordFlash(seconds, s.seen);
    const tables = s.families.length === 1 ? SP.famOne(s.families[0]) : SP.mixed;
    $('fcDone').innerHTML = screenHead('fcDoneTitle', '🃏 Great flying!') +
      `<div class="panel center"><p class="stars" aria-hidden="true">🚀⭐🚀</p>
        <div class="stats" style="margin-top:8px"><div class="stat"><b>${s.seen}</b>cards seen</div><div class="stat"><b>${fmt(seconds)}</b>time practiced</div><div class="stat"><b style="font-size:1.1rem">${esc(tables)}</b>${SP.famNoun}</div></div>
        <div class="btn-row center" style="margin-top:16px"><button class="btn btn-go btn-lg" id="fdAgain">Flashcards again</button>
          <button class="btn btn-secondary" data-nav="${MENU}/flashcards">Pick another</button><button class="btn btn-secondary" data-nav="${MENU}">⬅ ${SP.name}</button></div></div>`;
    $('fdAgain').onclick = startFlashcards;
    show('fcDone', crumbFor('Flashcards'));
  }

  /* =====================================================================================
     TEST — Show what I know
     ===================================================================================== */
  let testState = null;
  /** Tables for the next test. Automatic mode picks as many tables as can each get the 5 questions mastery needs:
      tables with one passing test first (to finish them), then the lowest unmastered tables. When every table is
      mastered it reviews all of them. Custom mode uses the parent's choice. */
  function testTables() {
    if (settings.test.mode === 'custom') return usableTables(settings.test.families);
    const fams = store.summary().families.filter((f) => settings.extension || !f.extension);
    const open = fams.filter((f) => !f.mastered).sort((x, y) => (y.passes - x.passes) || (x.fam - y.fam));
    if (!open.length) return fams.map((f) => f.fam);
    return open.slice(0, Math.max(1, M.masteryTableLimit(settings.test.count))).map((f) => f.fam).sort((x, y) => x - y);
  }
  const countsForMastery = (tables, count) => tables.length <= M.masteryTableLimit(count);
  function renderTestSetup() {
    const t = settings.test, tables = testTables();
    $('testSetup').innerHTML = screenHead('testSetupTitle', '⏱️ Test <span class="h-sub">Show what I know</span>') +
      `<div class="panel workspace start-hero test-hero"><div class="hero-icon" aria-hidden="true">⏱️</div><div class="hero-body">
        <h3 class="hero-title">Show what you know</h3>
        <div class="chips-big"><span>${t.count} questions</span><span>${tablesText(tables)}</span><span>${t.timer ? `${t.timer} seconds each` : 'No timer'}</span></div>
        <p class="lede" id="tsCounts">${countsForMastery(tables, t.count) ? `⭐ This test can help you master these ${SP.units}.` : 'This is a practice test.'} No hints. Just do your best!</p>
        <button class="btn btn-go btn-lg" id="tsStart">▶ Start test</button></div></div>
       <p class="grownup-note">Grown-ups: questions, timer and ${SP.famsNoun} are in <a href="${MENU}/settings" data-nav="${MENU}/settings">Parent Settings</a>.</p>`;
    $('tsStart').onclick = () => startTest({ families: tables, count: t.count, timer: t.timer, kind: 'test' });
    show('testSetup', crumbFor('Test'));
  }
  function startTest({ families, facts, count, timer, kind }) {
    T.clearAll();
    testState = { qs: M.makeTestSet({ families, facts, count, maxFactor: settings.extension ? 12 : M.CORE_MAX }), i: 0, responses: [], timer, kind,
      families: families || [...new Set(facts.map((f) => f.fam))].sort((a, b) => a - b),
      deadline: 0, shownAt: 0, ticker: null, quitArmed: false, settings: { families, facts, count, timer, kind } };
    $('test').innerHTML = `<div class="panel workspace test-sheet">${actHead({ id: 'testTitle', title: kind === 'retry' ? '⏱️ Retry missed facts' : '⏱️ Test',
        count: '<span class="act-count" id="tCount"></span>', right: timer ? '<span class="timer-pill" id="tTimer" role="timer" aria-live="off"></span>' : '<span class="badge">No timer</span>',
        exit: '<button class="btn btn-danger btn-sm" id="tQuit">Quit</button>', now: 0, max: count, label: 'Test progress', barId: 'tProg', spanId: 'tBar' })}
        ${timer ? '<div class="timer-bar" aria-hidden="true"><span id="tTimeBar"></span></div>' : ''}
        <div class="qa no-visual test-qa">
          <div class="qa-q"><p class="q-prompt big" id="tQ" aria-live="polite"></p></div>
          <div class="qa-dock"><div class="answer" id="tAns" role="textbox" aria-readonly="true" aria-label="Your answer (use the number keys)"></div><div class="numpad" id="tPad"></div>
            <div class="dock-actions">${timer ? '' : '<button class="btn btn-secondary" id="tSkip">Skip</button>'}<button class="btn btn-primary btn-lg" id="tSubmit">Submit</button></div>
            <p class="hint-text center" id="tMsg">Type with the keys or your keyboard. Enter submits.</p></div>
        </div></div>`;
    testState.pad = numPad($('tPad'), $('tAns'));
    $('tSubmit').onclick = () => testSubmit(false);
    if ($('tSkip')) $('tSkip').onclick = () => testRecord(null);
    $('tQuit').onclick = () => {
      if (!testState.quitArmed) { testState.quitArmed = true; $('tQuit').textContent = 'Tap again to quit'; $('tMsg').textContent = 'Quitting now means this test is not saved.'; return; }
      nav(MENU);
    };
    show('test', crumbFor('Test'));
    testAsk();
  }
  function testAsk() {
    const ts = testState, q = ts.qs[ts.i], n = ts.qs.length;
    $('tCount').textContent = `Question ${ts.i + 1} of ${n}`;
    $('tBar').style.width = `${(ts.i / n) * 100}%`;
    $('tProg').setAttribute('aria-valuenow', String(ts.i));
    $('tQ').textContent = q.prompt;
    ts.pad.clear();
    ts.shownAt = Date.now();
    onKey = (e) => {
      if (ts.pad.key(e)) { e.preventDefault(); return; }
      if (e.key === 'Enter' && !onButton(e)) { e.preventDefault(); testSubmit(false); }
    };
    T.cancel(ts.ticker);
    if (ts.timer) { ts.deadline = ts.shownAt + ts.timer * 1000; testTick(); ts.ticker = T.every(testTick, 100); }
  }
  function testTick() {
    const ts = testState; if (!ts) return;
    const left = ts.deadline - Date.now();
    $('tTimer').textContent = `⏱ ${Math.max(0, Math.ceil(left / 1000))} s`;
    $('tTimer').classList.toggle('low', left <= 1000);
    $('tTimeBar').style.width = `${Math.max(0, left / (ts.timer * 1000)) * 100}%`;
    if (left <= 0) testSubmit(true);
  }
  /** Submit: a typed answer is graded; time running out with nothing typed is "unanswered". */
  function testSubmit(timeUp) {
    const ts = testState; if (!ts) return;
    const v = ts.pad.value;
    if (!v && !timeUp) { $('tMsg').textContent = ts.timer ? 'Type an answer before the time runs out.' : 'Type an answer, or press Skip.'; return; }
    testRecord(v || null);
  }
  function testRecord(given) {
    const ts = testState; if (!ts) return;
    T.cancel(ts.ticker); ts.ticker = null;
    const ms = Math.min(Date.now() - ts.shownAt, ts.timer * 1000);
    ts.responses.push({ q: ts.qs[ts.i], given, ms: ts.timer && given !== null ? ms : undefined });
    ts.i++;
    if (ts.i < ts.qs.length) { $('tMsg').textContent = 'Type with the keys or your keyboard. Enter submits.'; testAsk(); }
    else testFinish();
  }
  function testFinish() {
    const ts = testState; onKey = null; T.clearAll();
    const sc = M.scoreTest(ts.responses);
    store.recordTest(sc, { kind: ts.kind, timed: ts.timer, families: ts.families, responses: ts.responses });
    const fams = Object.keys(sc.byFamily).map(Number).sort((a, b) => a - b);
    const counts = ts.kind === 'test';
    $('testDone').innerHTML = `<h2 class="sr-only" id="testDoneTitle" tabindex="-1">Test results</h2>
      <div class="assess">
        <div class="results-top"><div><div class="pct" id="rPct">${sc.percent}%</div><p class="center muted">${sc.correct} of ${sc.total}</p></div>
          <div class="tally"><div class="c"><b id="rC">${sc.correct}</b>correct</div><div class="i"><b id="rI">${sc.incorrect}</b>incorrect</div><div class="u"><b id="rU">${sc.unanswered}</b>unanswered</div></div></div>
        <p class="center" style="margin-top:10px">${ts.kind === 'retry' ? 'Retry of missed facts: great for practice, but only full tests count toward mastery.'
          : sc.percent >= 90 ? 'Excellent work!' : sc.percent >= 70 ? 'Good work. Practice the missed facts, then try again.' : 'Keep going. Practice and flashcards will help.'}</p>
        ${ts.timer && sc.avgCorrectMs !== null ? `<p class="center muted">You answered in about ${(sc.avgCorrectMs / 1000).toFixed(1)} seconds each.</p>` : ''}
        ${sc.missed.length ? `<h3 style="margin-top:16px">Missed facts</h3><ul class="missed-list" id="rMissed" style="margin-top:8px">${sc.missed.map((m) =>
          `<li><b>${esc(m.q.equation)}</b> <span class="muted">· ${m.result === 'unanswered' ? 'no answer' : `you answered ${esc(m.given)}`}</span></li>`).join('')}</ul>` : '<p class="center" style="margin-top:12px"><b>No missed facts!</b></p>'}
        <h3 style="margin-top:16px">Accuracy by ${SP.unit}</h3>
        <div class="table-wrap"><table class="data" id="rFam"><thead><tr><th>${SP.key === 'div' ? 'Family' : 'Table'}</th><th>Right</th><th>%</th>${counts ? '<th>Star</th>' : ''}</tr></thead><tbody>${fams.map((f) => {
          const b = sc.byFamily[f], pct = Math.round((b.correct / b.total) * 100);
          const note = b.total < M.MASTERY_MIN_QUESTIONS ? '–' : pct >= 90 ? '⭐ counts' : 'not yet';
          return `<tr><td>${SP.fam(f)}${f > M.CORE_MAX ? ' <span class="badge ext">ext</span>' : ''}</td><td>${b.correct} / ${b.total}</td><td>${pct}%</td>${counts ? `<td>${note}</td>` : ''}</tr>`;
        }).join('')}</tbody></table></div>
        <div class="btn-row center" style="margin-top:16px">
          ${sc.missed.length ? '<button class="btn btn-go btn-lg" id="rRetry">Retry missed facts</button>' : ''}
          <button class="btn btn-primary" id="rRetake">Retake test</button><button class="btn btn-secondary" data-nav="${MENU}">⬅ ${SP.name} menu</button></div>
      </div>`;
    if ($('rRetry')) $('rRetry').onclick = () => startTest({ facts: sc.missed.map((m) => ({ fam: m.q.fam, other: m.q.other })), count: sc.missed.length, timer: ts.timer, kind: 'retry' });
    $('rRetake').onclick = () => startTest(ts.settings);
    testState = null;
    show('testDone', crumbFor('Test results'));
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (fcState && !fcState.paused) fcTogglePause();
      if (testState && testState.timer && testState.ticker) { T.cancel(testState.ticker); testState.ticker = null; testState.hiddenAt = Date.now(); }
    } else if (testState && testState.hiddenAt) {
      const away = Date.now() - testState.hiddenAt;
      testState.deadline += away; testState.shownAt += away; testState.hiddenAt = 0;
      testState.ticker = T.every(testTick, 100);
    }
  });

  /* =====================================================================================
     PARENT SETTINGS
     ===================================================================================== */
  function renderSettings() {
    $('settings').innerHTML = screenHead('settingsTitle', '⚙️ Parent Settings') +
      `<p class="settings-note">For grown-ups. Settings are saved on this device as soon as you tap them. They are <b>not locked</b>, so a child could change them.</p>
       <div class="settings-grid">
        <section class="panel settings-card"><h3>📚 ${SP.famsHeading}</h3><p class="set-help">Used by Practice and the Math Thinking Lab.</p>
          <div class="set-row" id="stTables"></div>
          <div class="set-row"><div id="stExt"></div><p class="set-help">${SP.goalText}</p></div></section>
        <section class="panel settings-card"><h3>✏️ Practice and 🧪 Lab</h3>
          <div class="set-row" id="stPracCount"></div>
          <div class="set-row"><div id="stLabTypes"></div>
            <p class="set-help"><b>As they learn them:</b> ${SP.kindsHelp}</p>
            <p class="set-help">The Lab starts with six kinds and adds one when its lesson is finished, or after 3 right answers of that kind in Practice.</p></div></section>
        <section class="panel settings-card"><h3>🃏 Flashcards</h3>
          <div class="set-row" id="stReveal"></div><div class="set-row" id="stHold"></div><div class="set-row" id="stMin"></div><div class="set-row" id="stOrder"></div></section>
        <section class="panel settings-card"><h3>⏱️ Test</h3>
          <div class="set-row" id="stTestMode"></div><div class="set-row" id="stTestTables"></div><div class="set-row" id="stTestCount"></div><div class="set-row" id="stTimer"></div>
          <div class="feedback info" id="stMastery" aria-live="polite"></div></section>
       </div>
       <div class="btn-row between" style="margin-top:16px"><button class="btn btn-ghost" data-nav="${MENU}">⬅ ${SP.name}</button><button class="btn btn-ghost" data-nav="${MENU}/progress">📊 Progress</button></div>`;
    const S = settings, save = () => saveSettings();
    familyPicker($('stTables'), SP.famsHeading, S.tables, (v) => { S.tables = v; save(); }, () => S.extension);
    seg($('stExt'), SP.extLabel, [{ v: false, label: 'Off' }, { v: true, label: 'On' }], S.extension, (v) => { S.extension = v; save(); $('stTables').refresh(); $('stTestTables').refresh(); masteryNote(); });
    seg($('stPracCount'), 'Problems in a practice', [{ v: 10, label: '10' }, { v: 20, label: '20' }, { v: 30, label: '30' }], S.practice.count, (v) => { S.practice.count = v; save(); });
    seg($('stLabTypes'), 'Kinds of problems', [{ v: false, label: 'As they learn them' }, { v: true, label: 'All 12 kinds now' }], S.lab.allTypes, (v) => { S.lab.allTypes = v; save(); });
    let holdSeg = null;
    seg($('stReveal'), 'Show the answer', [{ v: 0, label: 'On tap' }, { v: 2, label: '2 s' }, { v: 3, label: '3 s' }, { v: 5, label: '5 s' }, { v: 10, label: '10 s' }], S.fc.reveal,
      (v) => { S.fc.reveal = v; save(); holdSeg.disable(v === 0); });
    holdSeg = seg($('stHold'), 'Keep the answer up for', [{ v: 1, label: '1 s' }, { v: 2, label: '2 s' }, { v: 3, label: '3 s' }, { v: 5, label: '5 s' }], S.fc.hold, (v) => { S.fc.hold = v; save(); });
    holdSeg.disable(S.fc.reveal === 0);
    seg($('stMin'), 'Session length', [{ v: 3, label: '3 min' }, { v: 5, label: '5 min' }, { v: 10, label: '10 min' }], S.fc.minutes, (v) => { S.fc.minutes = v; save(); });
    seg($('stOrder'), 'Order', [{ v: 'shuffle', label: 'Shuffled' }, { v: 'order', label: 'In order' }], S.fc.order, (v) => { S.fc.order = v; save(); });
    seg($('stTestMode'), `Which ${SP.units}`, [{ v: 'auto', label: 'Automatic' }, { v: 'custom', label: 'I choose' }], S.test.mode, (v) => { S.test.mode = v; save(); $('stTestTables').hidden = v !== 'custom'; masteryNote(); });
    familyPicker($('stTestTables'), `Test ${SP.famsNoun}`, S.test.families, (v) => { S.test.families = v; save(); masteryNote(); }, () => S.extension);
    $('stTestTables').hidden = S.test.mode !== 'custom';
    seg($('stTestCount'), 'Questions', [{ v: 10, label: '10' }, { v: 20, label: '20' }, { v: 36, label: '36' }], S.test.count, (v) => { S.test.count = v; save(); masteryNote(); });
    seg($('stTimer'), 'Time for each question', [{ v: 0, label: 'Untimed' }, { v: 2, label: '2 s' }, { v: 3, label: '3 s' }, { v: 5, label: '5 s' }, { v: 10, label: '10 s' }], S.test.timer, (v) => { S.test.timer = v; save(); });
    function masteryNote() {
      const limit = M.masteryTableLimit(S.test.count), n = testTables().length;
      if (S.test.mode === 'auto') { $('stMastery').innerHTML = `<strong>Automatic:</strong> each test covers ${limit === 1 ? `1 ${SP.unit}` : `up to ${limit} ${SP.units}`} that are not mastered yet (5+ questions each), so every test can count toward mastery. The ${SP.units} change as they are mastered.`; return; }
      $('stMastery').innerHTML = n <= limit
        ? `<strong>Counts toward mastery:</strong> each ${SP.unit} gets at least ${M.MASTERY_MIN_QUESTIONS} questions.`
        : `<strong>Practice test:</strong> with ${n} ${n === 1 ? SP.unit : SP.units} and ${S.test.count} questions, each ${SP.unit} gets fewer than ${M.MASTERY_MIN_QUESTIONS} questions, so the test will not count toward mastery. Pick up to ${limit} ${limit === 1 ? SP.unit : SP.units} for ${S.test.count} questions to earn mastery.`;
    }
    masteryNote();
    show('settings', `${SP.sym} ${SP.name} · Parent Settings`);
  }

  /* =====================================================================================
     PROGRESS (for grown-ups)
     ===================================================================================== */
  function renderProgress() {
    const s = store.summary({ lessonsTotal: L.LESSONS.length }), p = s.practice;
    const recentTests = s.tests.slice(-5).reverse(), recentLab = s.lab.slice(-5).reverse();
    const labAvg = s.lab.length ? Math.round(s.lab.reduce((a, x) => a + x.percent, 0) / s.lab.length) : null;
    const dots = (f) => (f.mastered ? '⭐ Mastered' : `${'●'.repeat(f.passes)}${'○'.repeat(f.needed - f.passes)} ${f.passes}/${f.needed}`);
    const pc = (x) => (x.total ? `${x.correct}/${x.total}` : '–');
    const date = (at) => (at ? new Date(at).toLocaleDateString() : '');
    $('progress').innerHTML = screenHead('progressTitle', `📊 ${SP.name} progress`) +
      (store.persistent ? '' : '<div class="feedback info" style="margin-bottom:12px">This browser is not letting Galaxy Math save, so progress lasts only until the page is closed.</div>') +
      `<div class="panel"><div class="stats">
          <div class="stat"><b id="pgLessons">${s.lessonsDone}/${s.lessonsTotal}</b>lessons finished<small>understanding</small></div>
          <div class="stat"><b>${p.questions ? Math.round((p.firstTry / p.questions) * 100) + '%' : '–'}</b>practice right first try<small>${p.questions} problems</small></div>
          <div class="stat"><b id="pgLab">${s.labSessions}</b>Thinking Lab challenges<small>${labAvg === null ? 'none yet' : `average ${labAvg}%`}</small></div>
          <div class="stat"><b id="pgTests">${s.testsTaken}</b>tests taken<small>independent</small></div>
          <div class="stat"><b id="pgCore">${s.coreMastered}/10</b>${SP.coreText}<small>from tests</small></div></div>
        <p class="hint-text" style="margin-top:10px">Four kinds of evidence are kept apart: <b>understanding</b> (Teach lessons), <b>practice</b> (with hints), <b>reasoning</b> (Thinking Lab, no hints) and <b>independent tests</b>. Memorization speed comes only from timed tests. A ${SP.unit} is mastered at 90%+ in two separate tests; a kind of problem is “Strong” only after 10+ problems at 90%+ across at least two sessions.</p></div>
       <div class="panel"><h3>Kinds of problems (Practice and Lab)</h3><div class="table-wrap"><table class="data" id="pgTypes"><thead><tr><th>Kind of problem</th><th>Practice</th><th>Lab</th><th>Status</th></tr></thead><tbody>
         ${s.types.map((t) => `<tr><td>${t.letter}. ${esc(t.name)}</td><td>${pc(t.practice)}</td><td>${pc(t.lab)}</td><td><span class="status st-${t.status.id}">${esc(t.status.label)}</span></td></tr>`).join('')}
       </tbody></table></div></div>
       <div class="panel"><h3>${SP.famsHeading}</h3><div class="table-wrap"><table class="data" id="pgTable"><thead><tr><th>${SP.key === 'div' ? 'Family' : 'Table'}</th><th>Accuracy (all activities)</th><th>Test mastery</th><th>Timed speed</th></tr></thead><tbody>
         ${s.families.map((f) => `<tr><td>${SP.fam(f.fam)}${f.extension ? ' <span class="badge ext">extension</span>' : ''}</td><td>${f.accuracy === null ? '–' : `${f.accuracy}% <span class="muted">(${f.correct}/${f.total})</span>`}</td><td class="mastery-dots">${dots(f)}</td><td>${f.avgSeconds === null ? '–' : `${f.avgSeconds} s`}</td></tr>`).join('')}
       </tbody></table></div></div>
       <div class="panel"><h3>Understanding: Teach lessons</h3><ul class="words" style="margin-top:8px">${L.LESSONS.map((l, i) => { const st = s.lessons[l.id];
          return `<li>${i + 1}. ${esc(l.title)}: ${st && st.completed ? '<b>✓ completed</b>' : st ? `tried (best ${st.best} of 3)` : 'not started'}</li>`; }).join('')}</ul></div>
       <div class="panel"><h3>Recent Thinking Lab challenges</h3>${recentLab.length ? `<div class="table-wrap"><table class="data" style="margin-top:8px"><thead><tr><th>Date</th><th>Problems</th><th>Score</th><th>✓ / ✗ / skipped</th></tr></thead><tbody>${recentLab.map((x) =>
          `<tr><td>${date(x.at)}</td><td>${x.total}</td><td>${x.percent}%</td><td>${x.correct} / ${x.incorrect} / ${x.unanswered}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No challenges yet.</p>'}</div>
       <div class="panel"><h3>Recent tests</h3>${recentTests.length ? `<div class="table-wrap"><table class="data" style="margin-top:8px"><thead><tr><th>Date</th><th>Score</th><th>✓ / ✗ / blank</th><th>Type</th></tr></thead><tbody>${recentTests.map((t) =>
          `<tr><td>${date(t.at)}</td><td>${t.percent}%</td><td>${t.correct} / ${t.incorrect} / ${t.unanswered} of ${t.total}</td><td>${t.kind === 'retry' ? 'retry missed' : t.timed ? `${t.timed} s timed` : 'untimed'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No tests yet.</p>'}</div>
       <div class="panel cream"><h3>Problems to practice</h3>${s.missedQuestions.length || s.misses.length ? `<div class="chips-list" style="margin-top:8px" id="pgMissed">${s.missedQuestions.slice(0, 20).map((m) => `<span>${esc(B.TYPE[m.type].name)}: ${SP.factText(m.fam, m.other)}</span>`).join('')}${s.misses.filter((f) => !s.missedQuestions.some((m) => m.fam === f.fam && m.other === f.other)).slice(0, 12).map((f) => `<span>Test: ${SP.factText(f.fam, f.other)}</span>`).join('')}</div>
          <div class="btn-row" style="margin-top:12px"><button class="btn btn-primary" data-nav="${MENU}/practice">Go to Practice my misses</button></div>` : '<p class="muted">None right now.</p>'}</div>
       <div class="panel"><h3>Milestones</h3>${s.milestones.length ? `<ul class="words" style="margin-top:8px">${s.milestones.map((m) => `<li>⭐ ${esc(m)}</li>`).join('')}</ul>` : `<p class="muted">Milestones appear as lessons are finished, challenges completed and ${SP.units} mastered.</p>`}
         <p class="muted" style="margin-top:10px">Memory practice: ${s.flash.sessions} flashcard session${s.flash.sessions === 1 ? '' : 's'}, ${fmt(s.flash.seconds)} total, ${s.flash.cards} cards. Flashcards and opening lessons never count as mastery.</p></div>
       <div class="btn-row between" style="margin-top:16px"><button class="btn btn-ghost" data-nav="${MENU}">⬅ ${SP.name}</button><button class="btn btn-danger" id="pgReset">Reset progress</button></div>`;
    let armed = false;
    $('pgReset').onclick = () => {
      if (!armed) { armed = true; $('pgReset').textContent = 'Tap again to erase all progress'; return; }
      store.reset(); renderProgress();
    };
    show('progress', `${SP.sym} ${SP.name} · Progress`);
  }

  // Read-only view of the running activity for the browser tests.
  // Review/test hooks: show specific generated questions (used by tests/review-shots.mjs for layout screenshots).
  window.__galaxy.startLabWith = (qs) => { stopAll(); labState = { qs, i: 0, answers: [] }; renderLabQ(true); };
  window.__galaxy.startPracticeWith = (qs) => { stopAll(); practiceState = { qs, i: 0, results: [], fromMisses: false }; renderPracticeQ(true); };
  window.__galaxy.state = () => ({ lesson: lessonState, practice: practiceState, lab: labState, test: testState && { ...testState, pad: undefined }, fc: fcState, settings });

  route();
})();
