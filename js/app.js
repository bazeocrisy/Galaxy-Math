/* Galaxy Math app: router, shared UI components and the five Multiplication activities
   (Teach, Practice, Math Thinking Lab, Flashcards, Test) plus Parent Settings and Progress.
   Depends on registry.js, mult-math.js, visuals.js, mult-lessons.js, mult-bank.js, progress.js. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const GM = window.GalaxyMathRegistry, M = window.GalaxyMult, V = window.GalaxyVisuals, L = window.GalaxyMultLessons,
    B = window.GalaxyBank, P = window.GalaxyProgress;
  const store = P.createStore(P.browserStorage());
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const viz = (spec) => (spec ? `<div class="viz-wrap">${V.render(spec)}</div>` : '');
  /** A question's own picture: number lines drop their landing numbers so the total is not given away. */
  const hideTotals = (spec) => !spec ? spec : spec.kind === 'jumps' ? { ...spec, labels: false }
    : spec.kind === 'set' ? { ...spec, items: spec.items.map((it) => ({ ...it, visual: hideTotals(it.visual) })) } : spec;
  const fmt = (sec) => `${Math.floor(sec / 60)}:${String(Math.max(0, sec) % 60).padStart(2, '0')}`;
  const SUBJ = 'multiplication', MENU = '#/multiplication';
  const lessonTitle = (id) => { const l = L.getLesson(id); return l ? l.title : id; };

  /* ---------- timers: every timeout/interval goes through T so leaving a screen stops them all ---------- */
  const T = {
    ids: new Set(),
    after(fn, ms) { const id = setTimeout(() => { T.ids.delete(id); fn(); }, ms); T.ids.add(id); return id; },
    every(fn, ms) { const id = setInterval(fn, ms); T.ids.add(id); return id; },
    cancel(id) { if (id) { clearTimeout(id); clearInterval(id); T.ids.delete(id); } },
    clearAll() { for (const id of T.ids) { clearTimeout(id); clearInterval(id); } T.ids.clear(); }
  };
  window.__galaxy = { timers: T, store };   // inspected by the browser tests

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
  function loadSettings() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(SKEY)) || {}; } catch (e) { s = {}; }
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
      test: { families: fam(te.families, CORE), count: pickOne(te.count, [10, 20, 36], 10), timer: pickOne(te.timer, [0, 2, 3, 5, 10], 5) }
    };
    return out;
  }
  const settings = loadSettings();
  function saveSettings() { try { localStorage.setItem(SKEY, JSON.stringify(settings)); } catch (e) { /* in-memory only */ } }
  const usableTables = (list) => { const t = M.cleanFamilies(list).filter((n) => settings.extension || n <= M.CORE_MAX); return t.length ? t : CORE.slice(); };
  const tablesText = (list) => { const t = usableTables(list); return t.length === 12 ? 'all tables' : t.length === 10 && t.every((n) => n <= 10) ? 'tables 1–10' : `the ${t.join(', ')} table${t.length === 1 ? '' : 's'}`; };

  /* ---------- screens and routing ---------- */
  const SCREENS = ['landing', 'menu', 'teach', 'lesson', 'practiceSetup', 'practice', 'practiceDone', 'labSetup', 'lab', 'labDone',
    'fcSetup', 'fc', 'fcDone', 'testSetup', 'test', 'testDone', 'progress', 'settings'];
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
  }
  function route() {
    stopAll();
    const r = GM.resolveRoute(location.hash);
    if (r.hash !== location.hash && !(location.hash === '' && r.hash === '#/')) history.replaceState(null, '', r.hash);
    const s = r.subject && GM.getSubject(r.subject);
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
  const crumbFor = (activity) => `× Multiplication · ${activity}`;
  const screenHead = (id, title, back = MENU, backLabel = '⬅ Multiplication') =>
    `<div class="screen-head"><h2 id="${id}" tabindex="-1">${title}</h2><button class="btn btn-ghost" data-nav="${back}">${backLabel}</button></div>`;

  /* ---------- shared components ---------- */
  /** Times-table chooser for Parent Settings. Tapping one table while "All" or "Core" is selected picks just that table. */
  function familyPicker(el, legend, initial, onChange) {
    let sel = new Set(M.cleanFamilies(initial));
    el.innerHTML = `<fieldset class="field"><legend>${legend}</legend>
      <div class="fam-picker">${ALL.map((n) => `<button type="button" data-fam="${n}" class="${n > M.CORE_MAX ? 'ext' : ''}" aria-label="${n}s table${n > M.CORE_MAX ? ' (extension)' : ''}">${n}</button>`).join('')}</div>
      <div class="fam-quick"><button type="button" data-quick="core">Core 1–10</button><button type="button" data-quick="all">All 1–12</button></div></fieldset>`;
    const preset = () => sel.size === 12 || (sel.size === 10 && [...sel].every((n) => n <= 10));
    const sync = () => {
      const all = sel.size === 12, core = sel.size === 10 && [...sel].every((n) => n <= 10);
      el.querySelectorAll('[data-fam]').forEach((b) => b.setAttribute('aria-pressed', String(!all && !core && sel.has(+b.dataset.fam))));
      el.querySelector('[data-quick=all]').setAttribute('aria-pressed', String(all));
      el.querySelector('[data-quick=core]').setAttribute('aria-pressed', String(core));
      onChange([...sel].sort((a, b) => a - b));
    };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.fam) {
        const n = +b.dataset.fam;
        if (preset()) sel = new Set([n]);
        else { sel.has(n) ? sel.delete(n) : sel.add(n); if (!sel.size) sel = new Set(CORE); }
      } else if (b.dataset.quick === 'all') sel = new Set(ALL);
      else if (b.dataset.quick === 'core') sel = new Set(CORE);
      sync();
    });
    sync();
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
  const fromLesson = (q) => ({ format: q.type === 'choice' ? 'choice' : 'number', prompt: q.prompt, answer: q.answer, options: q.options, big: q.big,
    visual: q.visual || null, hints: q.hint ? [{ text: q.hint, visual: q.hintVisual || null }] : [], explain: { text: q.explain, visual: q.explainVisual || null } });

  /** One question: problem → picture → answer → feedback (that order on phones; picture beside the answer on desktop).
      q: { format: 'number'|'choice', prompt, sub?, big?, answer, options?, visual?, hints: [{ text, visual? }], explain: { text, visual? }, typeName? }
      opts: { tries, allowHint, allowSkip, revealType, onDone({ firstTry, hinted, given, skipped }), nextLabel, onNext } */
  function askQuestion(el, q, opts) {
    const tries = opts.tries || 1, hints = q.hints || [];
    el.innerHTML = `<div class="qa">
        <div class="qa-q"><p class="q-prompt${q.big ? ' big' : ''}" id="qPrompt">${rich(q.prompt)}</p>${q.sub ? `<p class="q-sub">${esc(q.sub)}</p>` : ''}</div>
        <div class="qa-visual">${viz(hideTotals(q.visual))}</div>
        <div class="qa-answer">
          ${q.format === 'choice'
            ? `<div class="choices" role="group" aria-labelledby="qPrompt">${q.options.map((o) => `<button type="button" data-opt="${esc(o)}" aria-pressed="false">${esc(o)}</button>`).join('')}</div>`
            : '<div class="answer" id="qAnswer" aria-label="Your answer"></div><div class="numpad" id="qPad"></div>'}
          <div class="btn-row center" id="qButtons">
            ${opts.allowHint && hints.length ? '<button type="button" class="btn btn-secondary" id="qHint">💡 Hint</button>' : ''}
            ${opts.allowSkip ? '<button type="button" class="btn btn-secondary" id="qSkip">Skip</button>' : ''}
            <button type="button" class="btn btn-primary btn-lg" id="qCheck">${opts.checkLabel || 'Check'}</button>
          </div>
        </div>
        <div class="qa-feedback"><div id="qHintBox"></div><div class="feedback" id="qFeedback" role="status" aria-live="polite"></div><div class="btn-row center" id="qNextRow"></div></div>
      </div>`;
    let attempts = 0, hintLevel = 0, done = false, choice = null, firstTry = null;
    const fb = el.querySelector('#qFeedback');
    const pad = q.format === 'number' ? numPad(el.querySelector('#qPad'), el.querySelector('#qAnswer')) : null;
    const value = () => (pad ? pad.value : choice);
    if (q.format === 'choice') el.querySelector('.choices').addEventListener('click', (e) => {
      const b = e.target.closest('[data-opt]'); if (!b || done) return;
      choice = b.dataset.opt;
      el.querySelectorAll('[data-opt]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
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
    if (opts.allowHint && hints.length) el.querySelector('#qHint').addEventListener('click', () => { requested = true; revealHints(hintLevel + 1); });
    const typeLine = () => (opts.revealType && q.typeName ? `<p class="type-reveal">This was a <b>${esc(q.typeName)}</b> problem.</p>` : '');
    function finish(given, skipped) {
      done = true;
      if (pad) pad.disable(true);
      el.querySelectorAll('[data-opt]').forEach((b) => { b.disabled = true; if (b.dataset.opt === String(q.answer)) b.classList.add('right'); else if (b.dataset.opt === given) b.classList.add('wrong'); });
      const qb = el.querySelector('#qButtons'); if (qb) qb.remove();
      const row = el.querySelector('#qNextRow');
      row.innerHTML = `<button type="button" class="btn btn-go btn-lg" id="qNext">${opts.nextLabel || 'Next →'}</button>`;
      row.querySelector('#qNext').addEventListener('click', () => opts.onNext());
      opts.onDone({ firstTry: !!firstTry, hinted: requested, given, skipped: !!skipped });
      setTimeout(() => {
        const n = el.querySelector('#qNext'); if (!n) return;
        n.focus({ preventScroll: true });
        const r = n.getBoundingClientRect();
        if (r.bottom > window.innerHeight || r.top < 0) el.querySelector('.qa-feedback').scrollIntoView({ block: 'end', behavior: 'auto' });
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
        fb.innerHTML = `<strong>Not quite — try again.</strong> ${hints.length ? 'Read the help above.' : ''}`;
        if (pad) pad.clear(); else { choice = null; el.querySelectorAll('[data-opt]').forEach((x) => x.setAttribute('aria-pressed', 'false')); }
        return;
      }
      el.querySelector('#qHintBox').innerHTML = '';
      fb.className = 'feedback bad';
      fb.innerHTML = `<strong>The answer is ${esc(q.answer)}.</strong> ${rich(q.explain.text)}${viz(q.explain.visual)}${typeLine()}`;
      finish(given);
    }
    el.querySelector('#qCheck').addEventListener('click', check);
    if (opts.allowSkip) el.querySelector('#qSkip').addEventListener('click', () => {
      if (done) return;
      firstTry = false;
      fb.className = 'feedback info';
      fb.innerHTML = `<strong>Skipped. The answer is ${esc(q.answer)}.</strong> ${rich(q.explain.text)}${viz(q.explain.visual)}${typeLine()}`;
      finish(null, true);
    });
    onKey = (e) => {
      if (done) { if (e.key === 'Enter' && !onButton(e)) { e.preventDefault(); opts.onNext(); } return; }
      if (pad && pad.key(e)) { e.preventDefault(); return; }
      if (e.key === 'Enter' && !onButton(e)) { e.preventDefault(); check(); }
    };
  }

  /* ---------- landing ---------- */
  GM.SUBJECTS.forEach((s) => {
    const b = document.createElement('button');
    const open = s.status === 'open';
    b.className = `subject s-${s.id} ${open ? 'open' : 'soon'}`;
    b.dataset.subject = s.id;
    const label = !open ? 'Coming Soon' : GM.readyCount(s.id) === GM.ACTIVITIES.length ? 'Learn · Practice · Think · Flash · Test' : 'Lessons on the way';
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
      : ready.length ? `${ready.map((a) => a.name).join(' and ')} ${ready.length > 1 ? 'are' : 'is'} ready. The others are coming soon.` : `${s.name} lessons and cards are being built. Check back soon!`;
    $('menuNote').textContent = '';
    const done = sid === SUBJ ? store.summary().lessonsDone : 0;
    const box = $('modes'); box.innerHTML = '';
    GM.ACTIVITIES.forEach((a) => {
      const ok = GM.isActivityReady(sid, a.id), b = document.createElement('button');
      b.className = `mode m-${a.id} ${ok ? 'ready' : 'soon'}`; b.dataset.activity = a.id;
      const extra = ok && a.id === 'teach' && sid === SUBJ ? `<span class="mMeta">${done} of ${L.LESSONS.length} lessons done</span>` : '';
      b.innerHTML = `<span class="mIcon" aria-hidden="true">${a.icon}</span><span class="mText"><span class="mName">${a.name}</span>` +
        (ok ? `<span class="mBlurb">${a.blurb}</span>${extra}` : '<span class="badge soon">Coming soon</span>') + '</span>';
      if (ok) b.onclick = () => nav(`#/${sid}/${a.id}`);
      else { b.setAttribute('aria-disabled', 'true'); b.setAttribute('aria-label', `${a.name}. Coming soon`); b.onclick = () => { $('menuNote').textContent = `${s.name} ${a.name} is coming soon!`; }; }
      box.appendChild(b);
    });
    $('menuExtra').innerHTML = (GM.hasView(sid, 'settings') ? `<span class="grownups">For grown-ups:</span><button class="btn btn-ghost" data-nav="#/${sid}/progress">📊 Progress</button><button class="btn btn-ghost" data-nav="#/${sid}/settings">⚙️ Parent Settings</button>` : '') +
      '<button class="btn btn-ghost" data-nav="#/">⬅ All subjects</button>';
  }

  /* =====================================================================================
     TEACH — Show me how
     ===================================================================================== */
  let lessonState = null;
  function renderTeach() {
    const sum = store.summary({ lessonsTotal: L.LESSONS.length });
    $('teach').innerHTML = screenHead('teachTitle', '💡 Teach <span class="h-sub">Show me how</span>') +
      `<div class="panel"><div class="panel-head"><p class="lede">Short lessons about what multiplication <b>means</b>. Finish a lesson by getting ${L.PASS} of the 3 check questions right.</p>
        <span class="badge done">${sum.lessonsDone} of ${L.LESSONS.length} done</span></div>
        <div class="lessons">${L.LESSONS.map((l, i) => {
          const st = sum.lessons[l.id];
          const badge = st && st.completed ? '<span class="badge done">✓ Completed</span>' : st ? `<span class="badge">Best: ${st.best} of 3</span>` : '<span class="badge">Not started</span>';
          return `<button class="lesson-card${st && st.completed ? ' done' : ''}" data-lesson="${l.id}"><span class="num">Lesson ${i + 1}</span><span class="t">${esc(l.title)}</span>${badge}</button>`;
        }).join('')}</div></div>`;
    $('teach').querySelectorAll('[data-lesson]').forEach((b) => b.addEventListener('click', () => startLesson(b.dataset.lesson)));
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
    const stepsBar = L.STEPS.map((_, i) => `<span class="${i < st.step ? 'done' : i === st.step ? 'on' : ''}"></span>`).join('');
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
      body = '<p class="step-label">Solve this one together. Ask for a hint if you need it.</p><div id="lessonQ"></div>';
    } else if (st.step === 5) {
      body = `<p class="step-label">Question ${st.checkI + 1} of 3 · On your own: no hints this time.</p><div id="lessonQ"></div>`;
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
      `<div class="panel ${st.step === 0 ? 'cream' : ''}"><div class="steps" aria-hidden="true">${stepsBar}</div>
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
      `<div class="panel start-panel"><p class="lede">${settings.practice.count} problems from ${tablesText(settings.tables)}, in lots of different ways. No timer, and you can ask for a hint.</p>
        <button class="btn btn-go btn-lg btn-block" id="psStart">▶ Start practice</button></div>
       <div class="panel ice"><div class="panel-head"><h3>Practice my misses</h3><span class="badge">${pairs.length} problem${pairs.length === 1 ? '' : 's'}</span></div>
         ${pairs.length ? `<p class="muted">Problems you missed in Practice, the Lab or a Test come back here until you get them right.</p>
           <div class="btn-row" style="margin-top:12px"><button class="btn btn-primary" id="psMisses">Practice my misses</button></div>`
          : '<p class="muted">Nothing here yet. Problems you miss come back here until you get them right.</p>'}</div>
       <p class="grownup-note">Grown-ups: number of problems and times tables are in <a href="#/multiplication/settings" data-nav="#/multiplication/settings">Parent Settings</a>.</p>`;
    $('psStart').onclick = () => startPractice({ count: settings.practice.count });
    if ($('psMisses')) $('psMisses').onclick = () => startPractice({ pairs, count: M.missPracticeCount(pairs.length) });
    show('practiceSetup', crumbFor('Practice'));
  }
  function startPractice({ count, pairs }) {
    T.clearAll();
    practiceState = { qs: B.makeSet({ families: usableTables(settings.tables), extension: settings.extension, count, pairs }), i: 0, results: [], fromMisses: !!pairs };
    renderPracticeQ(true);
  }
  function renderPracticeQ(first) {
    const ps = practiceState, q = ps.qs[ps.i], n = ps.qs.length, last = ps.i === n - 1;
    $('practice').innerHTML = screenHead('practiceTitle', `✏️ Practice${ps.fromMisses ? ': my misses' : ''}`, MENU, '✕ Exit') +
      `<div class="panel q-panel"><div class="meta-row"><span id="pCount">Question ${ps.i + 1} of ${n}</span><span class="badge type">${esc(q.typeName)}${q.extension ? ' · extension' : ''}</span></div>
        <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${ps.i}" aria-label="Practice progress"><span style="width:${(ps.i / n) * 100}%"></span></div>
        <div id="pQ" class="q-host"></div></div>`;
    askQuestion($('pQ'), q, { tries: q.format === 'choice' ? 2 : 3, allowHint: true, nextLabel: last ? 'See my results →' : 'Next question →',
      onDone: (r) => { ps.results.push({ q, firstTry: r.firstTry, hinted: r.hinted }); store.recordPracticeAnswer(q, r.firstTry, r.hinted); },
      onNext: () => { if (last) finishPractice(); else { ps.i++; renderPracticeQ(); } } });
    if (first) show('practice', crumbFor('Practice'));
    else { $('practiceTitle').focus({ preventScroll: true }); window.scrollTo(0, 0); }
  }
  /** Missed questions with their worked explanations (shared by the Practice and Lab reports). */
  const reviewList = (items, id) => `<ul class="missed-list" id="${id}">${items.map((q) => `<li><details><summary><span class="badge type">${esc(q.typeName)}</span> ${rich(q.prompt)} → <b>${esc(q.answer)}</b></summary>
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
         <button class="btn btn-ghost" data-nav="${MENU}">⬅ Multiplication</button></div>`;
    if ($('pdAgain')) $('pdAgain').onclick = () => { const pairs = missed.map((r) => ({ type: r.q.typeId, fam: r.q.fam, other: r.q.other })); startPractice({ pairs, count: M.missPracticeCount(pairs.length) }); };
    $('pdNew').onclick = () => nav(`${MENU}/practice`);
    show('practiceDone', crumbFor('Practice'));
  }

  /* =====================================================================================
     MATH THINKING LAB — Make me think
     ===================================================================================== */
  let labState = null;
  const LAB_SIZES = [{ n: 10, name: 'Quick Challenge', icon: '🚀' }, { n: 25, name: 'Thinking Workout', icon: '🪐' }, { n: 50, name: 'Big Challenge', icon: '🌌' }];
  function labTypes() { return settings.lab.allTypes ? B.TYPES.map((t) => t.id) : B.unlockedTypes(store.completedLessons(), store.practiceAttempts()); }
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
    $('lab').innerHTML = screenHead('labTitle', '🧪 Math Thinking Lab', MENU, '✕ Exit') +
      `<div class="panel q-panel"><div class="meta-row"><span id="lCount">Problem ${ls.i + 1} of ${n}</span><span class="muted" id="lScore">${ls.answers.filter((a) => a.correct).length} right so far</span></div>
        <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${ls.i}" aria-label="Challenge progress"><span style="width:${(ls.i / n) * 100}%"></span></div>
        <div id="lQ" class="q-host"></div></div>`;
    // Lab: no hints and no strategy label before answering; the type is named in the feedback afterwards.
    askQuestion($('lQ'), q, { tries: 1, allowHint: false, allowSkip: true, revealType: true, checkLabel: 'Submit', nextLabel: last ? 'See my report →' : 'Next problem →',
      onDone: (r) => { ls.answers.push({ q, given: r.skipped ? null : r.given, correct: r.firstTry }); },
      onNext: () => { if (last) finishLab(); else { ls.i++; renderLabQ(); } } });
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
    const recs = [...new Set(Object.entries(missCount).sort((a, b) => b[1] - a[1]).map(([id]) => B.TYPE[id].lesson))].slice(0, 3);
    $('labDone').innerHTML = screenHead('labDoneTitle', '🧪 Lab report') +
      `<div class="panel"><div class="results-top"><div><div class="pct" id="ldPct">${sc.percent}%</div><p class="center muted">${sc.correct} of ${sc.total} right</p></div>
          <div class="tally"><div class="c"><b id="ldC">${sc.correct}</b>correct</div><div class="i"><b id="ldI">${sc.incorrect}</b>incorrect</div><div class="u"><b id="ldU">${sc.unanswered}</b>skipped</div></div></div>
        <p class="center" style="margin-top:10px">${sc.percent >= 90 ? 'Brilliant thinking!' : sc.percent >= 70 ? 'Great thinking. Look at the problems below to grow even more.' : 'Good effort. Every problem you look at again makes your brain stronger.'}</p></div>
       <div class="panel"><h3>How you did with each kind of problem</h3><div class="table-wrap"><table class="data" id="ldTypes"><thead><tr><th>Kind of problem</th><th>Right</th></tr></thead><tbody>
         ${types.map((id) => `<tr><td>${esc(B.TYPE[id].name)}</td><td>${sc.byType[id].correct} of ${sc.byType[id].total}</td></tr>`).join('')}</tbody></table></div>
         <p class="hint-text">One challenge is a snapshot. Skills are marked “Strong” only after several sessions.</p></div>
       ${sc.missed.length ? `<div class="panel cream"><h3>Problems to look at again</h3>${reviewList(sc.missed.map((m) => m.q), 'ldMissed')}</div>` : ''}
       ${recs.length ? `<div class="panel ice"><h3>Recommended lessons</h3><div class="btn-row" style="margin-top:8px" id="ldRecs">${recs.map((id) => `<button class="btn btn-secondary" data-rec="${id}">💡 ${esc(lessonTitle(id))}</button>`).join('')}</div></div>` : ''}
       <div class="btn-row center" style="margin-top:16px">
         ${sc.missed.length ? '<button class="btn btn-primary" id="ldMisses">Practice my misses</button>' : ''}
         <button class="btn btn-go btn-lg" id="ldAgain">Start another challenge</button>
         <button class="btn btn-ghost" data-nav="${MENU}">⬅ Multiplication</button></div>`;
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
      `<div class="panel start-panel"><h3>Pick a times table</h3>
        <div class="table-pick" id="fsPick">${tables.map((n) => `<button type="button" data-table="${n}" aria-label="${n}s table">${n}s</button>`).join('')}<button type="button" data-table="0" class="mixed">Mixed</button></div>
        <button class="btn btn-go btn-lg btn-block" id="fsStart">▶ Start flashcards</button>
        <p class="muted center">${f.reveal ? `The answer shows after ${f.reveal} seconds. Tap the card to see it sooner.` : 'Tap the card to see the answer.'}</p></div>
       <p class="grownup-note">Grown-ups: timing and session length are in <a href="#/multiplication/settings" data-nav="#/multiplication/settings">Parent Settings</a>.</p>`;
    if (!tables.includes(f.table)) f.table = 0;
    const sync = () => $('fsPick').querySelectorAll('[data-table]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.table === f.table)));
    $('fsPick').addEventListener('click', (e) => { const b = e.target.closest('[data-table]'); if (!b) return; f.table = +b.dataset.table; saveSettings(); sync(); });
    sync();
    $('fsStart').onclick = startFlashcards;
    show('fcSetup', crumbFor('Flashcards'));
  }
  function startFlashcards() {
    T.clearAll();
    const f = settings.fc, fams = f.table ? [f.table] : usableTables(ALL), facts = M.factsFor(fams, settings.extension ? 12 : M.CORE_MAX);
    fcState = { deck: f.order === 'shuffle' ? M.shuffle(facts.slice()) : facts, idx: 0, seen: 1, reveal: f.reveal, hold: f.hold, totalMs: f.minutes * 60000,
      activeMs: 0, resumedAt: Date.now(), paused: false, flipped: false, phase: null, families: fams };
    const tap = f.reveal === 0;
    $('fc').innerHTML = screenHead('fcTitle', `🃏 ${f.table ? `${f.table}s` : 'Mixed'} flashcards`, MENU, '✕ Exit') +
      `<div class="fc-wrap"><div class="meta-row on-dark"><span id="fcClock"></span><span id="fcSeen"></span></div>
        <div class="bar dark"><span id="fcBar" style="width:100%"></span></div>
        <div class="fc-stage"><button class="fc" id="fcCard" aria-label="Flash card. Tap to see the answer."><div class="fc-face fc-front" id="fcFront"></div><div class="fc-face fc-back" id="fcBack"></div></button></div>
        <p class="fc-status on-dark" id="fcStatus" aria-live="polite"></p>
        <div class="fc-simple">
          <button class="btn btn-primary btn-lg" id="fcFlip">Show answer</button>
          ${tap ? '<button class="btn btn-secondary btn-lg" id="fcNext">Next card →</button>' : ''}
          <button class="btn btn-secondary btn-lg" id="fcPause">⏸ Pause</button>
        </div>
        <div class="btn-row center" style="margin-top:10px"><button class="btn btn-ghost" id="fcEnd">I'm done</button></div></div>`;
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
    $('fcFront').innerHTML = `<span class="fc-tag">${fam}s table</span><div class="vert"><div>${fam}</div><div class="op"><b>×</b>${other}</div></div>`;
    $('fcBack').innerHTML = `<div><span class="fc-ans">${fam * other}</span><span class="fc-eq">${fam} × ${other} = ${fam * other}</span></div>`;
    $('fcCard').setAttribute('aria-label', `Flash card: ${fam} times ${other}. Tap to see the answer.`);
    $('fcStatus').textContent = fcStatusText();
    $('fcFlip').textContent = 'Show answer';
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
    $('fcCard').setAttribute('aria-label', on ? `Answer: ${fam} times ${other} equals ${fam * other}` : `Flash card: ${fam} times ${other}. Tap to see the answer.`);
    $('fcFlip').textContent = on ? 'Hide answer' : 'Show answer';
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
    const tables = s.families.length === 1 ? `the ${s.families[0]}s` : 'mixed tables';
    $('fcDone').innerHTML = screenHead('fcDoneTitle', '🃏 Great flying!') +
      `<div class="panel center"><p class="stars" aria-hidden="true">🚀⭐🚀</p>
        <div class="stats" style="margin-top:8px"><div class="stat"><b>${s.seen}</b>cards seen</div><div class="stat"><b>${fmt(seconds)}</b>time practiced</div><div class="stat"><b style="font-size:1.1rem">${esc(tables)}</b>times table</div></div>
        <div class="btn-row center" style="margin-top:16px"><button class="btn btn-go btn-lg" id="fdAgain">Flashcards again</button>
          <button class="btn btn-secondary" data-nav="${MENU}/flashcards">Pick another table</button><button class="btn btn-secondary" data-nav="${MENU}">⬅ Multiplication</button></div></div>`;
    $('fdAgain').onclick = startFlashcards;
    show('fcDone', crumbFor('Flashcards'));
  }

  /* =====================================================================================
     TEST — Show what I know
     ===================================================================================== */
  let testState = null;
  function testTables() { return usableTables(settings.test.families); }
  function renderTestSetup() {
    const t = settings.test;
    $('testSetup').innerHTML = screenHead('testSetupTitle', '⏱️ Test <span class="h-sub">Show what I know</span>') +
      `<div class="panel start-panel center"><p class="lede"><b>${t.count} questions</b> from ${tablesText(t.families)} · ${t.timer ? `${t.timer} seconds for each` : 'no timer'}</p>
        <p class="muted">No hints in a test. Just do your best!</p>
        <button class="btn btn-go btn-lg btn-block" id="tsStart">▶ Start test</button></div>
       <p class="grownup-note">Grown-ups: questions, timer and tables are in <a href="#/multiplication/settings" data-nav="#/multiplication/settings">Parent Settings</a>.</p>`;
    $('tsStart').onclick = () => startTest({ families: testTables(), count: t.count, timer: t.timer, kind: 'test' });
    show('testSetup', crumbFor('Test'));
  }
  function startTest({ families, facts, count, timer, kind }) {
    T.clearAll();
    testState = { qs: M.makeTestSet({ families, facts, count, maxFactor: settings.extension ? 12 : M.CORE_MAX }), i: 0, responses: [], timer, kind,
      families: families || [...new Set(facts.map((f) => f.fam))].sort((a, b) => a - b),
      deadline: 0, shownAt: 0, ticker: null, quitArmed: false, settings: { families, facts, count, timer, kind } };
    $('test').innerHTML = `<h2 class="sr-only" id="testTitle" tabindex="-1">${kind === 'retry' ? 'Retry missed facts' : 'Multiplication test'}</h2>
      <div class="assess"><div class="meta-row"><span id="tCount"></span>
          <span class="btn-row">${timer ? '<span class="timer-pill" id="tTimer" role="timer" aria-live="off"></span>' : '<span class="badge">No timer</span>'}<button class="btn btn-danger" id="tQuit">Quit</button></span></div>
        <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${count}" aria-valuenow="0" aria-label="Test progress" id="tProg"><span id="tBar"></span></div>
        ${timer ? '<div class="timer-bar" aria-hidden="true"><span id="tTimeBar"></span></div>' : ''}
        <div class="assess-grid" style="margin-top:16px">
          <div class="problem" id="tProblem"><span id="tQ" aria-live="polite"></span><span class="answer" id="tAns" aria-label="Your answer"></span></div>
          <div class="stack"><div class="numpad" id="tPad"></div>
            <div class="btn-row center"><button class="btn btn-primary btn-lg" id="tSubmit">Submit</button>${timer ? '' : '<button class="btn btn-secondary" id="tSkip">Skip</button>'}</div>
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
    $('tQ').textContent = `${q.a} × ${q.b} =`;
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
        ${ts.timer ? `<p class="center muted">${sc.avgCorrectMs !== null ? `Speed: ${(sc.avgCorrectMs / 1000).toFixed(1)} s per correct answer (${ts.timer} s timer). Speed is tracked separately from mastery.` : `Timed: ${ts.timer} s per question.`}</p>` : ''}
        ${sc.missed.length ? `<h3 style="margin-top:16px">Missed facts</h3><ul class="missed-list" id="rMissed" style="margin-top:8px">${sc.missed.map((m) =>
          `<li><b>${m.q.a} × ${m.q.b} = ${m.q.answer}</b> <span class="muted">· ${m.result === 'unanswered' ? 'no answer' : `you answered ${esc(m.given)}`}</span></li>`).join('')}</ul>` : '<p class="center" style="margin-top:12px"><b>No missed facts!</b></p>'}
        <h3 style="margin-top:16px">Accuracy by table</h3>
        <div class="table-wrap"><table class="data" id="rFam"><thead><tr><th>Table</th><th>Right</th><th>Accuracy</th>${counts ? '<th>Mastery</th>' : ''}</tr></thead><tbody>${fams.map((f) => {
          const b = sc.byFamily[f], pct = Math.round((b.correct / b.total) * 100);
          const note = b.total < M.MASTERY_MIN_QUESTIONS ? `needs ${M.MASTERY_MIN_QUESTIONS}+ questions` : pct >= 90 ? '✓ counts' : 'below 90%';
          return `<tr><td>${f}s${f > M.CORE_MAX ? ' <span class="badge ext">ext</span>' : ''}</td><td>${b.correct} / ${b.total}</td><td>${pct}%</td>${counts ? `<td>${note}</td>` : ''}</tr>`;
        }).join('')}</tbody></table></div>
        <p class="hint-text">A table is mastered after 90% or better in two separate tests, each with at least ${M.MASTERY_MIN_QUESTIONS} questions from that table.</p>
        <div class="btn-row center" style="margin-top:16px">
          ${sc.missed.length ? '<button class="btn btn-go btn-lg" id="rRetry">Retry missed facts</button>' : ''}
          <button class="btn btn-primary" id="rRetake">Retake test</button><button class="btn btn-secondary" data-nav="${MENU}">⬅ Multiplication menu</button></div>
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
      `<div class="feedback info" style="margin-bottom:12px">For grown-ups. Settings are saved on this device and are <b>not locked</b>, so a child could change them. Changes apply right away.</div>
       <div class="panel settings-section"><h3>Times tables for Practice and the Lab</h3><div class="setup-grid"><div id="stTables"></div>
         <div class="stack"><div id="stExt"></div><p class="hint-text">Third-grade fluency is facts with factors up to 10 (products within 100). Turning the extension on adds the 11s and 12s and facts like 3 × 12.</p></div></div></div>
       <div class="panel settings-section"><h3>Practice</h3><div id="stPracCount"></div></div>
       <div class="panel settings-section"><h3>Math Thinking Lab</h3><div id="stLabTypes"></div>
         <p class="hint-text">“As they learn them” includes a kind of problem once its Teach lesson is finished or it has been tried 3 times in Practice. Starter kinds (facts, equal groups, arrays, repeated addition) are always included.</p></div>
       <div class="panel settings-section"><h3>Flashcards</h3><div class="setup-grid"><div class="stack"><div id="stReveal"></div><div id="stHold"></div></div><div class="stack"><div id="stMin"></div><div id="stOrder"></div></div></div></div>
       <div class="panel settings-section"><h3>Test</h3><div class="setup-grid"><div id="stTestTables"></div><div class="stack"><div id="stTestCount"></div><div id="stTimer"></div>
         <div class="feedback info" id="stMastery" aria-live="polite"></div></div></div></div>
       <div class="btn-row between" style="margin-top:16px"><button class="btn btn-ghost" data-nav="${MENU}">⬅ Multiplication</button><button class="btn btn-ghost" data-nav="${MENU}/progress">📊 Progress</button></div>`;
    const S = settings, save = () => saveSettings();
    familyPicker($('stTables'), 'Tables', S.tables, (v) => { S.tables = v; save(); });
    seg($('stExt'), 'Include 11s and 12s (extension)', [{ v: false, label: 'Off' }, { v: true, label: 'On' }], S.extension, (v) => { S.extension = v; save(); masteryNote(); });
    seg($('stPracCount'), 'Problems in a practice', [{ v: 10, label: '10' }, { v: 20, label: '20' }, { v: 30, label: '30' }], S.practice.count, (v) => { S.practice.count = v; save(); });
    seg($('stLabTypes'), 'Kinds of problems in the Lab', [{ v: false, label: 'As they learn them' }, { v: true, label: 'All 12 kinds now' }], S.lab.allTypes, (v) => { S.lab.allTypes = v; save(); });
    let holdSeg = null;
    seg($('stReveal'), 'Show the answer', [{ v: 0, label: 'On tap' }, { v: 2, label: '2 s' }, { v: 3, label: '3 s' }, { v: 5, label: '5 s' }, { v: 10, label: '10 s' }], S.fc.reveal,
      (v) => { S.fc.reveal = v; save(); holdSeg.disable(v === 0); });
    holdSeg = seg($('stHold'), 'Keep the answer up for', [{ v: 1, label: '1 s' }, { v: 2, label: '2 s' }, { v: 3, label: '3 s' }, { v: 5, label: '5 s' }], S.fc.hold, (v) => { S.fc.hold = v; save(); });
    holdSeg.disable(S.fc.reveal === 0);
    seg($('stMin'), 'Session length', [{ v: 3, label: '3 min' }, { v: 5, label: '5 min' }, { v: 10, label: '10 min' }], S.fc.minutes, (v) => { S.fc.minutes = v; save(); });
    seg($('stOrder'), 'Order', [{ v: 'shuffle', label: 'Shuffled' }, { v: 'order', label: 'In order' }], S.fc.order, (v) => { S.fc.order = v; save(); });
    familyPicker($('stTestTables'), 'Test tables', S.test.families, (v) => { S.test.families = v; save(); masteryNote(); });
    seg($('stTestCount'), 'Questions', [{ v: 10, label: '10' }, { v: 20, label: '20' }, { v: 36, label: '36' }], S.test.count, (v) => { S.test.count = v; save(); masteryNote(); });
    seg($('stTimer'), 'Time for each question', [{ v: 0, label: 'Untimed' }, { v: 2, label: '2 s' }, { v: 3, label: '3 s' }, { v: 5, label: '5 s' }, { v: 10, label: '10 s' }], S.test.timer, (v) => { S.test.timer = v; save(); });
    function masteryNote() {
      const limit = M.masteryTableLimit(S.test.count), n = testTables().length;
      $('stMastery').innerHTML = n <= limit
        ? `<strong>Counts toward mastery:</strong> each table gets at least ${M.MASTERY_MIN_QUESTIONS} questions.`
        : `<strong>Practice test:</strong> with ${n} tables and ${S.test.count} questions, each table gets fewer than ${M.MASTERY_MIN_QUESTIONS} questions, so the test will not count toward mastery. Pick up to ${limit} table${limit === 1 ? '' : 's'} for ${S.test.count} questions to earn mastery.`;
    }
    masteryNote();
    show('settings', '× Multiplication · Parent Settings');
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
    $('progress').innerHTML = screenHead('progressTitle', '📊 Multiplication progress') +
      (store.persistent ? '' : '<div class="feedback info" style="margin-bottom:12px">This browser is not letting Galaxy Math save, so progress lasts only until the page is closed.</div>') +
      `<div class="panel"><div class="stats">
          <div class="stat"><b id="pgLessons">${s.lessonsDone}/${s.lessonsTotal}</b>lessons finished<small>understanding</small></div>
          <div class="stat"><b>${p.questions ? Math.round((p.firstTry / p.questions) * 100) + '%' : '–'}</b>practice right first try<small>${p.questions} problems</small></div>
          <div class="stat"><b id="pgLab">${s.labSessions}</b>Thinking Lab challenges<small>${labAvg === null ? 'none yet' : `average ${labAvg}%`}</small></div>
          <div class="stat"><b id="pgTests">${s.testsTaken}</b>tests taken<small>independent</small></div>
          <div class="stat"><b id="pgCore">${s.coreMastered}/10</b>core tables mastered<small>from tests</small></div></div>
        <p class="hint-text" style="margin-top:10px">Four kinds of evidence are kept apart: <b>understanding</b> (Teach lessons), <b>practice</b> (with hints), <b>reasoning</b> (Thinking Lab, no hints) and <b>independent tests</b>. Memorization speed comes only from timed tests. A table is mastered at 90%+ in two separate tests; a kind of problem is “Strong” only after 10+ problems at 90%+ across at least two sessions.</p></div>
       <div class="panel"><h3>Kinds of problems (Practice and Lab)</h3><div class="table-wrap"><table class="data" id="pgTypes"><thead><tr><th>Kind of problem</th><th>Practice</th><th>Lab</th><th>Status</th></tr></thead><tbody>
         ${s.types.map((t) => `<tr><td>${t.letter}. ${esc(t.name)}</td><td>${pc(t.practice)}</td><td>${pc(t.lab)}</td><td><span class="status st-${t.status.id}">${esc(t.status.label)}</span></td></tr>`).join('')}
       </tbody></table></div></div>
       <div class="panel"><h3>Times tables</h3><div class="table-wrap"><table class="data" id="pgTable"><thead><tr><th>Table</th><th>Accuracy (all activities)</th><th>Test mastery</th><th>Timed speed</th></tr></thead><tbody>
         ${s.families.map((f) => `<tr><td>${f.fam}s${f.extension ? ' <span class="badge ext">extension</span>' : ''}</td><td>${f.accuracy === null ? '–' : `${f.accuracy}% <span class="muted">(${f.correct}/${f.total})</span>`}</td><td class="mastery-dots">${dots(f)}</td><td>${f.avgSeconds === null ? '–' : `${f.avgSeconds} s`}</td></tr>`).join('')}
       </tbody></table></div></div>
       <div class="panel"><h3>Understanding: Teach lessons</h3><ul class="words" style="margin-top:8px">${L.LESSONS.map((l, i) => { const st = s.lessons[l.id];
          return `<li>${i + 1}. ${esc(l.title)}: ${st && st.completed ? '<b>✓ completed</b>' : st ? `tried (best ${st.best} of 3)` : 'not started'}</li>`; }).join('')}</ul></div>
       <div class="panel"><h3>Recent Thinking Lab challenges</h3>${recentLab.length ? `<div class="table-wrap"><table class="data" style="margin-top:8px"><thead><tr><th>Date</th><th>Problems</th><th>Score</th><th>✓ / ✗ / skipped</th></tr></thead><tbody>${recentLab.map((x) =>
          `<tr><td>${date(x.at)}</td><td>${x.total}</td><td>${x.percent}%</td><td>${x.correct} / ${x.incorrect} / ${x.unanswered}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No challenges yet.</p>'}</div>
       <div class="panel"><h3>Recent tests</h3>${recentTests.length ? `<div class="table-wrap"><table class="data" style="margin-top:8px"><thead><tr><th>Date</th><th>Score</th><th>✓ / ✗ / blank</th><th>Type</th></tr></thead><tbody>${recentTests.map((t) =>
          `<tr><td>${date(t.at)}</td><td>${t.percent}%</td><td>${t.correct} / ${t.incorrect} / ${t.unanswered} of ${t.total}</td><td>${t.kind === 'retry' ? 'retry missed' : t.timed ? `${t.timed} s timed` : 'untimed'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No tests yet.</p>'}</div>
       <div class="panel cream"><h3>Problems to practice</h3>${s.missedQuestions.length || s.misses.length ? `<div class="chips-list" style="margin-top:8px" id="pgMissed">${s.missedQuestions.slice(0, 20).map((m) => `<span>${esc(B.TYPE[m.type].name)}: ${m.fam} × ${m.other}</span>`).join('')}${s.misses.filter((f) => !s.missedQuestions.some((m) => m.fam === f.fam && m.other === f.other)).slice(0, 12).map((f) => `<span>Test: ${f.fam} × ${f.other}</span>`).join('')}</div>
          <div class="btn-row" style="margin-top:12px"><button class="btn btn-primary" data-nav="${MENU}/practice">Go to Practice my misses</button></div>` : '<p class="muted">None right now.</p>'}</div>
       <div class="panel"><h3>Milestones</h3>${s.milestones.length ? `<ul class="words" style="margin-top:8px">${s.milestones.map((m) => `<li>⭐ ${esc(m)}</li>`).join('')}</ul>` : '<p class="muted">Milestones appear as lessons are finished, challenges completed and tables mastered.</p>'}
         <p class="muted" style="margin-top:10px">Memory practice: ${s.flash.sessions} flashcard session${s.flash.sessions === 1 ? '' : 's'}, ${fmt(s.flash.seconds)} total, ${s.flash.cards} cards. Flashcards and opening lessons never count as mastery.</p></div>
       <div class="btn-row between" style="margin-top:16px"><button class="btn btn-ghost" data-nav="${MENU}">⬅ Multiplication</button><button class="btn btn-danger" id="pgReset">Reset progress</button></div>`;
    let armed = false;
    $('pgReset').onclick = () => {
      if (!armed) { armed = true; $('pgReset').textContent = 'Tap again to erase all progress'; return; }
      store.reset(); renderProgress();
    };
    show('progress', '× Multiplication · Progress');
  }

  // Read-only view of the running activity for the browser tests.
  window.__galaxy.state = () => ({ lesson: lessonState, practice: practiceState, lab: labState, test: testState && { ...testState, pad: undefined }, fc: fcState, settings });

  route();
})();
