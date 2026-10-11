/* Galaxy Math app: router, shared UI components and the Multiplication activities
   (Teach, Practice, Flashcards, Test, Progress). Depends on registry.js, mult-math.js, visuals.js, mult-lessons.js, progress.js. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const GM = window.GalaxyMathRegistry, M = window.GalaxyMult, V = window.GalaxyVisuals, L = window.GalaxyMultLessons, P = window.GalaxyProgress;
  const store = P.createStore(P.browserStorage());
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const viz = (spec) => (spec ? `<div class="viz-wrap">${V.render(spec)}</div>` : '');
  /** A question's own picture: number lines drop their landing numbers so the total is not given away. */
  const hideTotals = (spec) => !spec ? spec : spec.kind === 'jumps' ? { ...spec, labels: false }
    : spec.kind === 'set' ? { ...spec, items: spec.items.map((it) => ({ ...it, visual: hideTotals(it.visual) })) } : spec;
  const fmt = (sec) => `${Math.floor(sec / 60)}:${String(Math.max(0, sec) % 60).padStart(2, '0')}`;
  const SUBJ = 'multiplication', MENU = '#/multiplication';

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

  /* ---------- settings (separate for each activity, so Flashcard timers never change Test timers) ---------- */
  const SKEY = 'galaxy-math.settings';
  const ALL = [...M.FAMILIES];
  const pickOne = (v, allowed, d) => (allowed.includes(v) ? v : d);
  function loadSettings() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(SKEY)) || {}; } catch (e) { s = {}; }
    if (!s || typeof s !== 'object') s = {};
    const fam = (v) => (Array.isArray(v) ? M.cleanFamilies(v) : ALL.slice());
    const fc = s.fc || {}, te = s.test || {}, pr = s.practice || {};
    const out = {
      fc: { families: fam(fc.families), reveal: pickOne(fc.reveal, [0, 2, 3, 5, 10], 3), hold: pickOne(fc.hold, [1, 2, 3, 5], 2), minutes: pickOne(fc.minutes, [3, 5, 10], 5), order: pickOne(fc.order, ['shuffle', 'order'], 'shuffle') },
      test: { families: fam(te.families), count: pickOne(te.count, [10, 20, 36], 10), timer: pickOne(te.timer, [0, 2, 3, 5, 10], 5) },
      practice: { families: fam(pr.families), count: pickOne(pr.count, [10, 20, 30], 10) }
    };
    if (!s.fc) {  // carry over the original prototype's flashcard choices once
      try {
        const t = JSON.parse(localStorage.getItem('fc-tables')); if (Array.isArray(t)) out.fc.families = M.cleanFamilies(t);
        const sp = localStorage.getItem('fc-speed'); if (sp !== null) out.fc.reveal = pickOne(+sp, [0, 2, 3, 5, 10], 3);
        const mn = +localStorage.getItem('fc-min'); out.fc.minutes = pickOne(mn, [3, 5, 10], out.fc.minutes);
      } catch (e) { /* storage unavailable */ }
    }
    return out;
  }
  const settings = loadSettings();
  function saveSettings() { try { localStorage.setItem(SKEY, JSON.stringify(settings)); } catch (e) { /* in-memory only */ } }

  /* ---------- screens and routing ---------- */
  const SCREENS = ['landing', 'menu', 'teach', 'lesson', 'practiceSetup', 'practice', 'practiceDone', 'fcSetup', 'fc', 'fcDone', 'testSetup', 'test', 'testDone', 'progress'];
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
    T.clearAll(); onKey = null; fcState = null; testState = null; practiceState = null; lessonState = null; }
  function route() {
    stopAll();
    const r = GM.resolveRoute(location.hash);
    if (r.hash !== location.hash && !(location.hash === '' && r.hash === '#/')) history.replaceState(null, '', r.hash);
    const s = r.subject && GM.getSubject(r.subject);
    if (r.view === 'landing') { $('landingNote').textContent = ''; document.title = 'Galaxy Math'; show('landing'); return; }
    if (r.view === 'menu') { renderMenu(r.subject); document.title = `${s.name} · Galaxy Math`; show('menu', `${s.symbol} ${s.name}`); return; }
    if (r.view === 'progress') { renderProgress(); document.title = `${s.name} progress · Galaxy Math`; return; }
    document.title = `${s.name} ${GM.getActivity(r.activity).name} · Galaxy Math`;
    ({ teach: renderTeach, practice: renderPracticeSetup, flashcards: renderFcSetup, test: renderTestSetup })[r.activity]();
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
  /** Times-table chooser. Tapping one table while all are selected picks just that table (as in the original app). */
  function familyPicker(el, initial, onChange) {
    let sel = new Set(M.cleanFamilies(initial));
    el.innerHTML = `<fieldset class="field"><legend>Times tables <span class="muted">(fact families)</span></legend>
      <div class="fam-picker">${ALL.map((n) => `<button type="button" data-fam="${n}" class="${n > M.CORE_MAX ? 'ext' : ''}" aria-label="${n}s table${n > M.CORE_MAX ? ' (extension)' : ''}">${n}</button>`).join('')}</div>
      <div class="fam-quick"><button type="button" data-quick="all">All 1–12</button><button type="button" data-quick="core">Core 1–10</button></div>
      <p class="hint-text">Dashed tables (11 and 12) are an extension beyond the third-grade goal.</p></fieldset>`;
    const sync = () => {
      const all = sel.size === 12, core = sel.size === 10 && [...sel].every((n) => n <= 10);
      el.querySelectorAll('[data-fam]').forEach((b) => b.setAttribute('aria-pressed', String(!all && sel.has(+b.dataset.fam))));
      el.querySelector('[data-quick=all]').setAttribute('aria-pressed', String(all));
      el.querySelector('[data-quick=core]').setAttribute('aria-pressed', String(core));
      onChange([...sel].sort((a, b) => a - b));
    };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.fam) {
        const n = +b.dataset.fam;
        if (sel.size === 12) sel = new Set([n]);
        else { sel.has(n) ? sel.delete(n) : sel.add(n); if (!sel.size) sel = new Set(ALL); }
      } else if (b.dataset.quick === 'all') sel = new Set(ALL);
      else if (b.dataset.quick === 'core') sel = new Set(ALL.filter((n) => n <= 10));
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

  /** One question with answer entry, optional hint and feedback. Used by Teach (guided + check) and Practice.
      q: { type: 'number'|'choice', prompt, answer, options?, visual?, hint?, hintVisual?, explain, explainVisual?, correctText?, big? }
      opts: { tries: 1|2, allowHint, onDone({ firstTry, hinted, given }), nextLabel, onNext } */
  function askQuestion(el, q, opts) {
    const tries = opts.tries || 1;
    el.innerHTML = `<div class="work">
        <div class="stack"><p class="q-prompt${q.big ? ' big' : ''}" id="qPrompt">${rich(q.prompt)}</p>${viz(hideTotals(q.visual))}
          <div class="feedback-area" id="qHintBox"></div><div class="feedback" id="qFeedback" role="status" aria-live="polite"></div></div>
        <div class="answer-col">
          ${q.type === 'choice'
            ? `<div class="choices" role="group" aria-labelledby="qPrompt">${q.options.map((o) => `<button type="button" data-opt="${esc(o)}" aria-pressed="false">${esc(o)}</button>`).join('')}</div>`
            : '<div class="answer" id="qAnswer" aria-label="Your answer"></div><div class="numpad" id="qPad"></div>'}
          <div class="btn-row center" id="qButtons">
            ${opts.allowHint ? '<button type="button" class="btn btn-secondary" id="qHint">💡 Hint</button>' : ''}
            <button type="button" class="btn btn-primary btn-lg" id="qCheck">Check</button>
          </div>
        </div></div>`;
    let attempts = 0, hinted = false, done = false, choice = null, firstTry = null;
    const fb = el.querySelector('#qFeedback');
    const pad = q.type === 'number' ? numPad(el.querySelector('#qPad'), el.querySelector('#qAnswer')) : null;
    const value = () => (pad ? pad.value : choice);
    if (q.type === 'choice') el.querySelector('.choices').addEventListener('click', (e) => {
      const b = e.target.closest('[data-opt]'); if (!b || done) return;
      choice = b.dataset.opt;
      el.querySelectorAll('[data-opt]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });
    const showHint = () => {
      if (hinted || done) return;
      hinted = true;
      el.querySelector('#qHintBox').innerHTML = `<div class="feedback info"><strong>Hint:</strong> ${rich(q.hint)}${viz(hideTotals(q.hintVisual))}</div>`;
      const hb = el.querySelector('#qHint'); if (hb) hb.disabled = true;
    };
    if (opts.allowHint) el.querySelector('#qHint').addEventListener('click', showHint);
    function finish(ok, given) {
      done = true;
      if (pad) pad.disable(true);
      el.querySelectorAll('[data-opt]').forEach((b) => { b.disabled = true; if (b.dataset.opt === String(q.answer)) b.classList.add('right'); else if (b.dataset.opt === given) b.classList.add('wrong'); });
      const btns = el.querySelector('#qButtons');
      btns.innerHTML = `<button type="button" class="btn btn-go btn-lg" id="qNext">${opts.nextLabel || 'Next →'}</button>`;
      btns.querySelector('#qNext').addEventListener('click', () => opts.onNext());
      opts.onDone({ firstTry, hinted, given });
      setTimeout(() => { const n = el.querySelector('#qNext'); if (n) n.focus({ preventScroll: true }); }, 30);
    }
    function check() {
      if (done) return;
      const given = value();
      if (given === null || given === '') { fb.className = 'feedback info'; fb.innerHTML = q.type === 'choice' ? 'Choose an answer first.' : 'Type your answer first.'; return; }
      attempts++;
      const ok = L.checkLessonAnswer(q, given);
      if (firstTry === null) firstTry = ok;
      if (ok) {
        fb.className = 'feedback ok';
        fb.innerHTML = `<strong>✓ ${attempts === 1 ? 'Correct!' : 'You got it!'}</strong> ${rich(q.correctText || q.explain)}`;
        return finish(true, given);
      }
      if (attempts < tries) {
        fb.className = 'feedback bad';
        fb.innerHTML = `<strong>Not quite — try again.</strong> ${q.hint ? rich(q.hint) : ''}${viz(q.hintVisual && !hinted ? hideTotals(q.hintVisual) : null)}`;
        const hb = el.querySelector('#qHint'); if (hb) hb.disabled = true;   // the hint is already on screen
        if (pad) pad.clear(); else { choice = null; el.querySelectorAll('[data-opt]').forEach((x) => x.setAttribute('aria-pressed', 'false')); }
        return;
      }
      fb.className = 'feedback bad';
      fb.innerHTML = `<strong>The answer is ${esc(q.answer)}.</strong> ${rich(q.explain)}${q.explainVisual ? viz(q.explainVisual) : ''}`;
      finish(false, given);
    }
    el.querySelector('#qCheck').addEventListener('click', check);
    onKey = (e) => {
      if (done) { if (e.key === 'Enter' && !onButton(e)) { e.preventDefault(); opts.onNext(); } return; }
      if (pad && pad.key(e)) { e.preventDefault(); return; }
      if (e.key === 'Enter' && !onButton(e)) { e.preventDefault(); check(); }
    };
    return { check, showHint };
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

  /* ---------- landing ---------- */
  GM.SUBJECTS.forEach((s) => {
    const b = document.createElement('button');
    const open = s.status === 'open';
    b.className = `subject s-${s.id} ${open ? 'open' : 'soon'}`;
    b.dataset.subject = s.id;
    const label = !open ? 'Coming Soon' : GM.readyCount(s.id) === GM.ACTIVITIES.length ? 'Learn · Practice · Flash · Test' : 'Lessons on the way';
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
    $('menuSub').textContent = ready.length === GM.ACTIVITIES.length ? 'Learn it, practice it, flash it, then test yourself.'
      : ready.length ? `${ready.map((a) => a.name).join(' and ')} ${ready.length > 1 ? 'are' : 'is'} ready. The others are coming soon.` : `${s.name} lessons and cards are being built. Check back soon!`;
    $('menuNote').textContent = '';
    const done = sid === SUBJ ? store.summary().lessonsDone : 0;
    const blurb = (a) => (a.id === 'teach' && sid === SUBJ ? `${done} of ${L.LESSONS.length} lessons done` : a.blurb);
    const box = $('modes'); box.innerHTML = '';
    GM.ACTIVITIES.forEach((a) => {
      const ok = GM.isActivityReady(sid, a.id), b = document.createElement('button');
      b.className = `mode m-${a.id} ${ok ? 'ready' : 'soon'}`; b.dataset.activity = a.id;
      b.innerHTML = `<span class="mIcon" aria-hidden="true">${a.icon}</span><span>${a.name}</span>` + (ok ? `<span class="mBlurb">${blurb(a)}</span>` : '<span class="badge soon">Coming soon</span>');
      if (ok) b.onclick = () => nav(`#/${sid}/${a.id}`);
      else { b.setAttribute('aria-disabled', 'true'); b.setAttribute('aria-label', `${a.name}. Coming soon`); b.onclick = () => { $('menuNote').textContent = `${s.name} ${a.name} is coming soon!`; }; }
      box.appendChild(b);
    });
    $('menuExtra').innerHTML = (GM.hasView(sid, 'progress') ? `<button class="btn btn-ghost" data-nav="#/${sid}/progress">📊 Progress (for grown-ups)</button>` : '') +
      '<button class="btn btn-ghost" data-nav="#/">⬅ All subjects</button>';
  }

  /* =====================================================================================
     TEACH
     ===================================================================================== */
  let lessonState = null;
  function renderTeach() {
    const sum = store.summary();
    $('teach').innerHTML = screenHead('teachTitle', '💡 Teach') +
      `<div class="panel"><div class="panel-head"><p class="lede">Ten short lessons about what multiplication <b>means</b>. Finish a lesson by getting at least ${L.PASS} of the 3 check questions right.</p>
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
    lessonState = { lesson: L.getLesson(id), idx: L.LESSONS.findIndex((l) => l.id === id), step: 0, ex: 1, guidedDone: false, checkI: 0, checkRes: [], checkDone: false, recorded: false };
    renderLesson(true);
  }
  function renderLesson(first) {
    const st = lessonState, l = st.lesson;
    onKey = null;
    const stepsBar = L.STEPS.map((_, i) => `<span class="${i < st.step ? 'done' : i === st.step ? 'on' : ''}"></span>`).join('');
    let body = '', nextOk = true, nextLabel = `Next: ${L.STEPS[st.step + 1] || ''} →`;
    if (st.step === 0) {
      body = `<p class="step-label">Goal</p><p class="objective">${esc(l.objective)}</p><h3>Key words</h3>
        <ul class="words">${l.words.map((w) => `<li><b>${esc(w.term)}</b>: ${esc(w.meaning)}</li>`).join('')}</ul>`;
    } else if (st.step === 1) {
      body = `<div class="explain">${l.explain.text.map((t) => `<p>${rich(t)}</p>`).join('')}</div>${viz(l.explain.visual)}`;
    } else if (st.step === 2) {
      const all = st.ex >= l.example.steps.length;
      body = `<h3>${rich(l.example.title)}</h3>${viz(l.example.visual)}
        <ol class="ex-steps">${l.example.steps.map((s, i) => `<li${i < st.ex ? '' : ' hidden'}>${rich(s)}</li>`).join('')}</ol>
        ${all ? '' : '<div class="btn-row"><button class="btn btn-secondary" id="exMore">Show the next step</button></div>'}`;
      nextOk = all;
    } else if (st.step === 3) {
      body = '<p class="step-label">Solve this one together. Ask for a hint if you need it.</p><div id="lessonQ"></div>';
      nextOk = st.guidedDone;
    } else if (st.step === 4) {
      body = `<p class="step-label">Question ${st.checkI + 1} of 3 · On your own: no hints this time.</p><div id="lessonQ"></div>`;
      nextOk = false;
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
    const nav2 = st.step >= 4 ? '' : `<div class="btn-row between" style="margin-top:20px">
        <button class="btn btn-secondary" id="lessonBack" ${st.step === 0 ? 'disabled' : ''}>← Back</button>
        ${st.step === 3 ? '' : `<button class="btn btn-primary btn-lg" id="lessonNext" ${nextOk ? '' : 'disabled'}>${nextLabel}</button>`}</div>`;
    $('lesson').innerHTML = screenHead('lessonTitle', `Lesson ${st.idx + 1}: ${esc(l.title)}`, `${MENU}/teach`, '⬅ All lessons') +
      `<div class="panel ${st.step === 0 ? 'cream' : ''}"><div class="steps" aria-hidden="true">${stepsBar}</div>
        <p class="step-label" id="stepLabel">Step ${st.step + 1} of ${L.STEPS.length} · ${L.STEPS[st.step]}</p>
        <div class="stack" style="margin-top:12px">${body}</div>${nav2}</div>`;
    const go = (d) => { st.step += d; renderLesson(); };
    if ($('lessonBack')) $('lessonBack').onclick = () => go(-1);
    if ($('lessonNext')) $('lessonNext').onclick = () => go(1);
    if ($('exMore')) $('exMore').onclick = () => { st.ex++; renderLesson(); const n = $(st.ex >= l.example.steps.length ? 'lessonNext' : 'exMore'); if (n) n.focus(); };
    if ($('retryCheck')) $('retryCheck').onclick = () => { Object.assign(st, { step: 4, checkI: 0, checkRes: [], recorded: false }); renderLesson(); };
    if ($('reviewLesson')) $('reviewLesson').onclick = () => { Object.assign(st, { step: 1, checkI: 0, checkRes: [], recorded: false }); renderLesson(); };
    if ($('nextLesson')) $('nextLesson').onclick = () => startLesson(L.LESSONS[st.idx + 1].id);
    if (st.step === 3) {
      askQuestion($('lessonQ'), { ...l.guided }, { tries: 2, allowHint: true, nextLabel: 'Next: Check yourself →',
        onDone: () => { st.guidedDone = true; }, onNext: () => go(1) });
    }
    if (st.step === 4) {
      const q = l.check[st.checkI], last = st.checkI === l.check.length - 1;
      askQuestion($('lessonQ'), { ...q }, { tries: 1, allowHint: false, nextLabel: last ? 'See my result →' : 'Next question →',
        onDone: (r) => { st.checkRes[st.checkI] = r.firstTry; },
        onNext: () => { if (last) st.step = 5; else st.checkI++; renderLesson(); } });
    }
    if (first) show('lesson', crumbFor('Teach'));
    else { const h = $('lessonTitle'); if (h) h.focus({ preventScroll: true }); window.scrollTo(0, 0); }
  }

  /* =====================================================================================
     PRACTICE
     ===================================================================================== */
  let practiceState = null;
  function renderPracticeSetup() {
    const misses = store.missedFacts();
    $('practiceSetup').innerHTML = screenHead('practiceSetupTitle', '✏️ Practice') +
      `<div class="panel"><div class="setup-grid">
          <div id="psFam"></div>
          <div class="stack"><div id="psCount"></div>
            <p class="hint-text">No timer. Each question can be equal groups, an array, repeated addition, a missing factor, a word problem or a fact. Ask for a hint any time.</p>
            <button class="btn btn-go btn-lg btn-block" id="psStart">▶ Start practice</button></div>
        </div></div>
       <div class="panel ice"><div class="panel-head"><h3>Practice my misses</h3><span class="badge">${misses.length} fact${misses.length === 1 ? '' : 's'}</span></div>
         ${misses.length ? `<div class="chips-list">${misses.slice(0, 24).map((f) => `<span>${f.fam} × ${f.other}</span>`).join('')}</div>
           <div class="btn-row" style="margin-top:12px"><button class="btn btn-primary" id="psMisses">Practice my misses</button></div>`
          : '<p class="muted">Nothing here yet. Facts you miss in Practice or Test show up here until you get them right.</p>'}</div>`;
    familyPicker($('psFam'), settings.practice.families, (f) => { settings.practice.families = f; saveSettings(); });
    seg($('psCount'), 'How many questions', [{ v: 10, label: '10' }, { v: 20, label: '20' }, { v: 30, label: '30' }], settings.practice.count, (v) => { settings.practice.count = v; saveSettings(); });
    $('psStart').onclick = () => startPractice({ families: settings.practice.families, count: settings.practice.count });
    if ($('psMisses')) $('psMisses').onclick = () => { const f = store.missedFacts().map(({ fam, other }) => ({ fam, other })); startPractice({ facts: f, count: M.missPracticeCount(f.length) }); };
    show('practiceSetup', crumbFor('Practice'));
  }
  /** Turn an engine question into the shape askQuestion() shows. */
  function practiceView(q) {
    const h = M.hintFor(q), e = M.explainFor(q);
    const sameVisual = q.visual && e.visual && q.visual.kind === e.visual.kind;
    return { type: 'number', prompt: q.prompt, answer: q.answer, visual: q.visual || null, big: ['fact', 'missing', 'repeated'].includes(q.type),
      hint: h.text, hintVisual: h.visual && !q.visual ? h.visual : null, explain: e.text, explainVisual: sameVisual ? null : e.visual, correctText: q.equation };
  }
  function startPractice({ families, facts, count }) {
    T.clearAll();
    practiceState = { qs: M.makePracticeSet({ families, facts, count }), i: 0, results: [], families, fromMisses: !!facts };
    renderPracticeQ(true);
  }
  function renderPracticeQ(first) {
    const ps = practiceState, q = ps.qs[ps.i], n = ps.qs.length, last = ps.i === n - 1;
    $('practice').innerHTML = screenHead('practiceTitle', `✏️ Practice${ps.fromMisses ? ': my misses' : ''}`, MENU, '✕ Exit') +
      `<div class="panel"><div class="meta-row"><span id="pCount">Question ${ps.i + 1} of ${n}</span><span class="badge type">${M.TYPE_NAMES[q.type]}${q.extension ? ' · extension' : ''}</span></div>
        <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${ps.i}" aria-label="Practice progress"><span style="width:${(ps.i / n) * 100}%"></span></div>
        <div id="pQ" style="margin-top:16px"></div></div>`;
    askQuestion($('pQ'), practiceView(q), { tries: 2, allowHint: true, nextLabel: last ? 'See my results →' : 'Next question →',
      onDone: (r) => { ps.results.push({ q, firstTry: r.firstTry, hinted: r.hinted }); store.recordPracticeAnswer(q, r.firstTry, r.hinted); },
      onNext: () => { if (last) finishPractice(); else { ps.i++; renderPracticeQ(); } } });
    if (first) show('practice', crumbFor('Practice'));
    else { $('practiceTitle').focus({ preventScroll: true }); window.scrollTo(0, 0); }
  }
  function finishPractice() {
    const ps = practiceState; onKey = null;
    store.recordPracticeSession();
    const right = ps.results.filter((r) => r.firstTry).length, hints = ps.results.filter((r) => r.hinted).length;
    const missed = ps.results.filter((r) => !r.firstTry);
    $('practiceDone').innerHTML = screenHead('practiceDoneTitle', '✏️ Practice complete!') +
      `<div class="panel"><div class="results-top"><div class="pct">${right}/${ps.results.length}</div>
          <div><p class="lede"><b>${right} of ${ps.results.length}</b> right on the first try${hints ? ` · ${hints} hint${hints === 1 ? '' : 's'} used` : ''}.</p>
          <p class="muted">${right === ps.results.length ? 'Every one on the first try. Stellar!' : 'Mistakes help your brain grow. Review the ones below, then practice them again.'}</p></div></div></div>
       ${missed.length ? `<div class="panel cream"><h3>Review</h3><ul class="missed-list" style="margin-top:10px">${missed.map((r) => {
          const e = M.explainFor(r.q);
          return `<li><details><summary>${esc(r.q.prompt)} → ${r.q.answer}</summary><p style="margin-top:6px">${esc(e.text)}</p>${viz(e.visual)}</details></li>`;
        }).join('')}</ul></div>` : ''}
       <div class="btn-row center" style="margin-top:16px">
         ${missed.length ? '<button class="btn btn-go btn-lg" id="pdAgain">Practice these again</button>' : ''}
         <button class="btn btn-primary" id="pdNew">New practice</button>
         <button class="btn btn-ghost" data-nav="${MENU}">⬅ Multiplication</button></div>`;
    if ($('pdAgain')) $('pdAgain').onclick = () => startPractice({ facts: missed.map((r) => ({ fam: r.q.fam, other: r.q.other })), count: M.missPracticeCount(missed.length) });
    $('pdNew').onclick = () => nav(`${MENU}/practice`);
    show('practiceDone', crumbFor('Practice'));
  }

  /* =====================================================================================
     FLASHCARDS
     ===================================================================================== */
  let fcState = null;
  function renderFcSetup() {
    $('fcSetup').innerHTML = screenHead('fcSetupTitle', '🃏 Flashcards') +
      `<div class="panel"><div class="setup-grid">
          <div id="fsFam"></div>
          <div class="stack"><div id="fsReveal"></div><div id="fsHold"></div><div id="fsMin"></div><div id="fsOrder"></div>
            <button class="btn btn-go btn-lg btn-block" id="fsStart">▶ Start flashcards</button></div>
        </div><p class="hint-text" style="margin-top:12px">Flashcards are for remembering. They never start a test, and they don't change Test settings.</p></div>`;
    const f = settings.fc;
    familyPicker($('fsFam'), f.families, (v) => { f.families = v; saveSettings(); });
    let holdSeg = null;
    seg($('fsReveal'), 'Show the answer', [{ v: 0, label: 'When I tap' }, { v: 2, label: '2 s' }, { v: 3, label: '3 s' }, { v: 5, label: '5 s' }, { v: 10, label: '10 s' }], f.reveal,
      (v) => { f.reveal = v; saveSettings(); holdSeg.disable(v === 0); });
    holdSeg = seg($('fsHold'), 'Keep the answer up for', [{ v: 1, label: '1 s' }, { v: 2, label: '2 s' }, { v: 3, label: '3 s' }, { v: 5, label: '5 s' }], f.hold, (v) => { f.hold = v; saveSettings(); });
    holdSeg.disable(f.reveal === 0);
    seg($('fsMin'), 'Session length', [{ v: 3, label: '3 min' }, { v: 5, label: '5 min' }, { v: 10, label: '10 min' }], f.minutes, (v) => { f.minutes = v; saveSettings(); });
    seg($('fsOrder'), 'Order', [{ v: 'shuffle', label: 'Shuffled' }, { v: 'order', label: 'In order' }], f.order, (v) => { f.order = v; saveSettings(); });
    $('fsStart').onclick = startFlashcards;
    show('fcSetup', crumbFor('Flashcards'));
  }
  function startFlashcards() {
    T.clearAll();
    const f = settings.fc, facts = M.factsFor(f.families);
    fcState = { deck: f.order === 'shuffle' ? M.shuffle(facts.slice()) : facts, idx: 0, seen: 1, reveal: f.reveal, hold: f.hold, totalMs: f.minutes * 60000,
      activeMs: 0, resumedAt: Date.now(), paused: false, flipped: false, phase: null, families: f.families.slice() };
    $('fc').innerHTML = screenHead('fcTitle', '🃏 Flashcards', MENU, '✕ Exit') +
      `<div class="fc-wrap"><div class="meta-row on-dark"><span id="fcClock"></span><span id="fcSeen"></span></div>
        <div class="bar dark"><span id="fcBar" style="width:100%"></span></div>
        <div class="fc-stage"><button class="fc" id="fcCard" aria-label="Flash card. Tap to flip."><div class="fc-face fc-front" id="fcFront"></div><div class="fc-face fc-back" id="fcBack"></div></button></div>
        <p class="fc-status on-dark" id="fcStatus" aria-live="polite"></p>
        <div class="panel" style="padding:14px">
          <div class="fc-controls"><button class="btn btn-secondary" id="fcPrev">← Previous</button><button class="btn btn-primary" id="fcFlip">Flip</button><button class="btn btn-secondary" id="fcNext">Next →</button></div>
          <div class="fc-controls" style="margin-top:8px"><button class="btn btn-secondary" id="fcPause">⏸ Pause</button><button class="btn btn-secondary" id="fcShuffle">🔀 Shuffle</button><button class="btn btn-go" id="fcEnd">Finish</button></div>
        </div></div>`;
    $('fcCard').onclick = () => fcFlip();
    $('fcFlip').onclick = () => fcFlip();
    $('fcNext').onclick = () => fcMove(1);
    $('fcPrev').onclick = () => fcMove(-1);
    $('fcPause').onclick = fcTogglePause;
    $('fcShuffle').onclick = () => { const s = fcState; const cur = s.deck[s.idx]; M.shuffle(s.deck); s.deck.splice(s.deck.indexOf(cur), 1); s.deck.unshift(cur); s.idx = 0; $('fcStatus').textContent = 'Shuffled!'; };
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
    return s.reveal === 0 ? 'Tap the card (or press Space) to flip it.' : `The answer shows after ${s.reveal} s and stays for ${s.hold} s.`;
  }
  function fcShowCard() {
    const s = fcState, { fam, other } = s.deck[s.idx];
    s.flipped = false;
    $('fcCard').classList.remove('flip');
    $('fcFront').innerHTML = `<span class="fc-tag">${fam}s table</span><div class="vert"><div>${fam}</div><div class="op"><b>×</b>${other}</div></div>`;
    $('fcBack').innerHTML = `<div><span class="fc-ans">${fam * other}</span><span class="fc-eq">${fam} × ${other} = ${fam * other}</span></div>`;
    $('fcCard').setAttribute('aria-label', `Flash card: ${fam} times ${other}. Tap to flip.`);
    $('fcStatus').textContent = fcStatusText();
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
    $('fcCard').setAttribute('aria-label', on ? `Answer: ${fam} times ${other} equals ${fam * other}` : `Flash card: ${fam} times ${other}. Tap to flip.`);
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
    ['fcPrev', 'fcFlip', 'fcNext', 'fcShuffle'].forEach((id) => { $(id).disabled = s.paused; });
    $('fcStatus').textContent = fcStatusText();
  }
  function fcFinish() {
    const s = fcState; if (!s) return;
    const seconds = Math.round(Math.min(fcElapsed(), s.totalMs) / 1000);
    T.clearAll(); onKey = null; fcState = null;
    $('fc').classList.remove('paused');
    store.recordFlash(seconds, s.seen);
    const tables = s.families.length === 12 ? 'all tables' : s.families.length === 10 && s.families.every((n) => n <= 10) ? 'core tables 1–10' : s.families.map((n) => `${n}s`).join(', ');
    $('fcDone').innerHTML = screenHead('fcDoneTitle', '🃏 Great flying!') +
      `<div class="panel center"><p class="stars" aria-hidden="true">🚀⭐🚀</p>
        <div class="stats" style="margin-top:8px"><div class="stat"><b>${s.seen}</b>cards seen</div><div class="stat"><b>${fmt(seconds)}</b>time practiced</div><div class="stat"><b style="font-size:1.1rem">${esc(tables)}</b>tables</div></div>
        <p class="muted" style="margin-top:12px">Flashcards help you remember. Mastery comes from tests, so a test is up to you.</p>
        <div class="btn-row center" style="margin-top:16px"><button class="btn btn-go btn-lg" id="fdAgain">Flashcards again</button>
          <button class="btn btn-primary" data-nav="${MENU}/test">Take a test (optional)</button><button class="btn btn-secondary" data-nav="${MENU}">⬅ Multiplication</button></div></div>`;
    $('fdAgain').onclick = startFlashcards;
    show('fcDone', crumbFor('Flashcards'));
  }

  /* =====================================================================================
     TEST
     ===================================================================================== */
  let testState = null;
  function renderTestSetup() {
    $('testSetup').innerHTML = screenHead('testSetupTitle', '⏱️ Test') +
      `<div class="panel"><div class="setup-grid"><div id="tsFam"></div>
          <div class="stack"><div id="tsCount"></div><div id="tsTimer"></div>
            <p class="hint-text">No hints during a test. A question left blank counts as unanswered, and every question counts toward your score.</p>
            <div class="feedback info" id="tsMastery" aria-live="polite"></div>
            <button class="btn btn-go btn-lg btn-block" id="tsStart">▶ Start test</button></div></div></div>`;
    const t = settings.test;
    familyPicker($('tsFam'), t.families, (v) => { t.families = v; saveSettings(); });
    seg($('tsCount'), 'Questions', [{ v: 10, label: '10' }, { v: 20, label: '20' }, { v: 36, label: '36' }], t.count, (v) => { t.count = v; saveSettings(); });
    seg($('tsTimer'), 'Time for each question', [{ v: 0, label: 'Untimed' }, { v: 2, label: '2 s' }, { v: 3, label: '3 s' }, { v: 5, label: '5 s' }, { v: 10, label: '10 s' }], t.timer, (v) => { t.timer = v; saveSettings(); });
    $('tsStart').onclick = () => startTest({ families: t.families, count: t.count, timer: t.timer, kind: 'test' });
    const masteryNote = () => {
      const limit = M.masteryTableLimit(t.count), n = t.families.length;
      $('tsMastery').innerHTML = n <= limit
        ? `<strong>Counts toward mastery:</strong> each table gets at least ${M.MASTERY_MIN_QUESTIONS} questions.`
        : `<strong>Practice test:</strong> with ${n} tables and ${t.count} questions, each table gets fewer than ${M.MASTERY_MIN_QUESTIONS} questions, so this test will not count toward mastery. To earn mastery, pick up to ${limit} table${limit === 1 ? '' : 's'} for ${t.count} questions.`;
    };
    $('tsFam').addEventListener('click', masteryNote); $('tsCount').addEventListener('click', masteryNote);
    masteryNote();
    show('testSetup', crumbFor('Test'));
  }
  function startTest({ families, facts, count, timer, kind }) {
    T.clearAll();
    testState = { qs: M.makeTestSet({ families, facts, count }), i: 0, responses: [], timer, kind, families: families || [...new Set(facts.map((f) => f.fam))].sort((a, b) => a - b),
      deadline: 0, shownAt: 0, ticker: null, quitArmed: false, settings: { families, facts, count, timer, kind } };
    $('test').innerHTML = `<h2 class="sr-only" id="testTitle" tabindex="-1">${kind === 'retry' ? 'Retry missed facts' : 'Multiplication test'}</h2>
      <div class="assess"><div class="meta-row"><span id="tCount"></span>
          <span class="btn-row">${timer ? '<span class="timer-pill" id="tTimer" role="timer" aria-live="off"></span>' : '<span class="badge">Untimed</span>'}<button class="btn btn-danger" id="tQuit">Quit</button></span></div>
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
        <table class="data" id="rFam"><thead><tr><th>Table</th><th>Right</th><th>Accuracy</th>${counts ? '<th>Mastery</th>' : ''}</tr></thead><tbody>${fams.map((f) => {
          const b = sc.byFamily[f], pct = Math.round((b.correct / b.total) * 100);
          const note = b.total < M.MASTERY_MIN_QUESTIONS ? `needs ${M.MASTERY_MIN_QUESTIONS}+ questions` : pct >= 90 ? '✓ counts' : 'below 90%';
          return `<tr><td>${f}s${f > M.CORE_MAX ? ' <span class="badge ext">ext</span>' : ''}</td><td>${b.correct} / ${b.total}</td><td>${pct}%</td>${counts ? `<td>${note}</td>` : ''}</tr>`;
        }).join('')}</tbody></table>
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

  /* =====================================================================================
     PROGRESS (for grown-ups)
     ===================================================================================== */
  function renderProgress() {
    const s = store.summary(), p = s.practice;
    const recent = s.tests.slice(-6).reverse();
    const dots = (f) => (f.mastered ? '⭐ Mastered' : `${'●'.repeat(f.passes)}${'○'.repeat(f.needed - f.passes)} ${f.passes}/${f.needed}`);
    $('progress').innerHTML = screenHead('progressTitle', '📊 Multiplication progress') +
      (store.persistent ? '' : '<div class="feedback info" style="margin-bottom:12px">This browser is not letting Galaxy Math save, so progress lasts only until the page is closed.</div>') +
      `<div class="panel"><div class="stats">
          <div class="stat"><b id="pgLessons">${s.lessonsDone}/${L.LESSONS.length}</b>lessons finished</div>
          <div class="stat"><b>${p.questions ? Math.round((p.firstTry / p.questions) * 100) + '%' : '–'}</b>practice right first try (${p.questions} questions)</div>
          <div class="stat"><b id="pgTests">${s.testsTaken}</b>tests taken</div>
          <div class="stat"><b id="pgCore">${s.coreMastered}/10</b>core tables mastered</div></div>
        <p class="hint-text" style="margin-top:10px">Mastery = 90% or better on a table in two separate tests (at least ${M.MASTERY_MIN_QUESTIONS} questions from that table each time). Speed is shown separately and only comes from timed tests. Opening lessons or flashcards never counts as mastery.</p></div>
       <div class="panel"><h3>Times tables</h3><div style="overflow-x:auto"><table class="data" id="pgTable"><thead><tr><th>Table</th><th>Accuracy</th><th>Mastery</th><th>Speed</th></tr></thead><tbody>
         ${s.families.map((f) => `<tr><td>${f.fam}s${f.extension ? ' <span class="badge ext">extension</span>' : ''}</td><td>${f.accuracy === null ? '–' : `${f.accuracy}% <span class="muted">(${f.correct}/${f.total})</span>`}</td><td class="mastery-dots">${dots(f)}</td><td>${f.avgSeconds === null ? '–' : `${f.avgSeconds} s`}</td></tr>`).join('')}
       </tbody></table></div></div>
       <div class="panel"><h3>Lessons</h3><ul class="words" style="margin-top:8px">${L.LESSONS.map((l, i) => { const st = s.lessons[l.id];
          return `<li>${i + 1}. ${esc(l.title)}: ${st && st.completed ? '<b>✓ completed</b>' : st ? `tried (best ${st.best} of 3)` : 'not started'}</li>`; }).join('')}</ul></div>
       <div class="panel"><h3>Recent tests</h3>${recent.length ? `<table class="data" style="margin-top:8px"><thead><tr><th>Date</th><th>Score</th><th>✓ / ✗ / blank</th><th>Type</th></tr></thead><tbody>${recent.map((t) =>
          `<tr><td>${t.at ? new Date(t.at).toLocaleDateString() : ''}</td><td>${t.percent}%</td><td>${t.correct} / ${t.incorrect} / ${t.unanswered} of ${t.total}</td><td>${t.kind === 'retry' ? 'retry missed' : t.timed ? `${t.timed} s timed` : 'untimed'}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">No tests yet.</p>'}</div>
       <div class="panel cream"><h3>Facts to practice</h3>${s.misses.length ? `<div class="chips-list" style="margin-top:8px">${s.misses.map((f) => `<span>${f.fam} × ${f.other}</span>`).join('')}</div>
          <div class="btn-row" style="margin-top:12px"><button class="btn btn-primary" data-nav="${MENU}/practice">Go to Practice my misses</button></div>` : '<p class="muted">None right now.</p>'}</div>
       <div class="panel"><h3>Milestones</h3>${s.milestones.length ? `<ul class="words" style="margin-top:8px">${s.milestones.map((m) => `<li>⭐ ${esc(m)}</li>`).join('')}</ul>` : '<p class="muted">Milestones appear as lessons are finished and tables are mastered.</p>'}
         <p class="muted" style="margin-top:10px">Flashcards: ${s.flash.sessions} session${s.flash.sessions === 1 ? '' : 's'}, ${fmt(s.flash.seconds)} total, ${s.flash.cards} cards.</p></div>
       <div class="btn-row between" style="margin-top:16px"><button class="btn btn-ghost" data-nav="${MENU}">⬅ Multiplication</button><button class="btn btn-danger" id="pgReset">Reset progress</button></div>`;
    let armed = false;
    $('pgReset').onclick = () => {
      if (!armed) { armed = true; $('pgReset').textContent = 'Tap again to erase all progress'; return; }
      store.reset(); renderProgress();
    };
    show('progress', '× Multiplication · Progress');
  }

  // Read-only view of the running activity for the browser tests.
  window.__galaxy.state = () => ({ lesson: lessonState, practice: practiceState, test: testState && { ...testState, pad: undefined }, fc: fcState, settings });

  route();
})();
