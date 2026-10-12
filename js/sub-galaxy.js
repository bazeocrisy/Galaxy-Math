/* Galaxy Math ↔ SubtractKit adapter: the Subtraction subject (Teach, Practice, Test, Progress).
   Reuses, unchanged, Mathbook's SubtractKit (js/subtractkit/: the math and the vertical workspace) and its teaching
   content (js/subtraction-vendor/content.js: lessons, examples, Your Turn generators, skills and the test blueprint;
   place-value.js: the base-ten block pictures). There is no second subtraction engine here: every problem, answer,
   difficulty, hint, Show me and worked solution comes from SubtractKit.
   The Learn question forms (blocks exchange, decide, mistake, check) and their wording are adapted from Mathbook's
   section adapter (curriculum/supplemental/subtract-regrouping/app.js at 55b51bd), without its shell, router or storage.
   Progress is saved with GalaxySubStore under its own key. Every mounted workspace is destroyed when the screen
   changes (GalaxySubtraction.stop(), called by the Galaxy router). window.GalaxySubtraction. */
(function (root) {
  'use strict';
  const SK = root.SubtractKit, M = SK.math, C = root.Mathbook.subtractRegrouping, pv = root.Mathbook.pv;
  const fmt = M.fmt, P = M.PLACES;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
  const isInt = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
  const blank = (x) => x === undefined || x === null || String(x).trim() === '';
  const newSeed = () => (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  const problemText = (item) => `${fmt(item.top)} − ${fmt(item.bottom)}`;
  /** Escaped problem text that never breaks across lines. */
  const probHTML = (item) => `<span class="sr-nowrap">${esc(problemText(item))}</span>`;
  const LESSON_IDS = C.learn.map((l) => l.id);
  const MENU = '#/subtraction';
  const THEME = { accent: '#6A35D9', focus: '#6A35D9', 'box-line': '#6A35D9', 'btn-line': '#6A35D9', 'primary-bg': '#6A35D9', ink: '#1B1F4B', line: '#1B1F4B', 'btn-ink': '#1B1F4B', 'ui-font': 'var(--font)' };

  function safeStorage() { try { const k = '__gm_sub_test'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return localStorage; } catch (e) { return null; } }
  const store = root.GalaxySubStore.createSubStore(safeStorage(), { lessonIds: LESSON_IDS, math: M });

  /* ---------- mounted workspaces: every instance is kept here and destroyed when the screen changes ---------- */
  let live = [];
  const keep = (inst) => { live.push(inst); return inst; };
  function destroyAll() { live.forEach((i) => { try { i.destroy(); } catch (e) { /* already gone */ } }); live = []; }
  const mount = (el, o) => keep(SK.mount(el, Object.assign({ theme: THEME }, o)));

  let host = null, ctx = null;
  /** Replace the subtraction screen's content (destroying the old workspaces first). */
  function paint(html) { destroyAll(); host.innerHTML = html; }
  function focusHead(sel = 'h2') { const h = host.querySelector(sel); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } root.scrollTo(0, 0); }
  const head = (id, title, back = MENU, backLabel = '⬅ Subtraction') =>
    `<div class="screen-head"><h2 id="${id}" tabindex="-1">${title}</h2><button class="btn btn-ghost" data-nav="${back}">${backLabel}</button></div>`;

  /* =====================================================================================
     Item helpers (adapted from Mathbook's adapter: same rules for saved responses and grading)
     ===================================================================================== */
  function validResponse(item, r) {
    if (!isObj(r)) return false;
    if (r.sd !== undefined && typeof r.sd !== 'boolean') return false;
    if (r.sp !== undefined && !isInt(r.sp, 0, 60)) return false;
    if (r.helped !== undefined && typeof r.helped !== 'boolean') return false;
    if (r.ws !== undefined && r.ws !== null && !SK.validState(r.ws, item.top, item.bottom)) return false;
    if (r.ws2 !== undefined && r.ws2 !== null && !SK.validState(r.ws2, item.top, item.bottom)) return false;
    const okChoice = (v, list) => v === undefined || v === null || v === '' || (typeof v === 'string' && list.includes(v));
    if (item.kind === 'decide') return okChoice(r.c1, ['Yes', 'No']) && okChoice(r.c2, item.placeChoices);
    if (item.kind === 'mistake' || item.kind === 'check') return okChoice(r.c1, item.choices);
    if (item.kind === 'exchange') return (r.t === undefined || typeof r.t === 'string') && (r.o === undefined || typeof r.o === 'string') && (r.q === undefined || isInt(r.q, 0, 2));
    return true;
  }
  /** Anything entered at all (an unanswered test question has nothing). */
  function touched(item, r) {
    if (!r) return false;
    const digits = (ws) => !!ws && (ws.d || []).some((x) => !blank(x));
    if (item.kind === 'steps') return !!(r.ws && Object.keys(r.ws.ann || {}).length);
    return digits(r.ws) || digits(r.ws2) || !blank(r.c1) || !blank(r.c2);
  }
  function answered(item, r) {
    if (!r) return false;
    const done = (ws) => ws && M.readAnswer(ws.d || []).status === 'ok';
    if (item.kind === 'sub') return done(r.ws);
    if (item.kind === 'steps') return !!(r.ws && Object.keys(r.ws.ann || {}).length);
    if (item.kind === 'decide') return !blank(r.c1) && !blank(r.c2);
    if (item.kind === 'mistake') return !blank(r.c1) && done(r.ws2);
    if (item.kind === 'check') return !blank(r.c1) && done(r.ws);
    return false;
  }
  function grade(item, r) {
    r = r || {};
    const fin = (ws) => !!ws && M.gradeFinal(item.top, item.bottom, ws.d || []).correct;
    if (item.kind === 'sub') { const f = fin(r.ws); return { correct: f, parts: { final: f } }; }
    if (item.kind === 'steps') { const s = !!r.ws && M.checkAmounts(item.top, item.bottom, M.amountsFrom(item.top, r.ws.ann, M.lengthOf(item.top))).ok; return { correct: s, parts: { steps: s } }; }
    if (item.kind === 'decide') { const d = r.c1 === item.needs && r.c2 === item.first; return { correct: d, parts: { decide: d } }; }
    if (item.kind === 'mistake') { const m = r.c1 === item.answer, f = fin(r.ws2); return { correct: m && f, parts: { mistake: m, final: f } }; }
    if (item.kind === 'check') { const c = r.c1 === item.answer, f = fin(r.ws); return { correct: c && f, parts: { final: f, check: c } }; }
    return { correct: false, parts: {} };
  }
  const standardAnn = (top, bottom) => {
    const ann = {};
    M.plan(top, bottom).exchanges.forEach((e) => { (ann[e.from] = ann[e.from] || []).push(e.after[e.from]); (ann[e.to] = ann[e.to] || []).push(e.after[e.to]); });
    return ann;
  };
  const answerDigits = (top, bottom) => { const d = M.digitsOf(top - bottom, M.lengthOf(top)).map(String); while (d.length > 1 && d[d.length - 1] === '0') d.pop(); return d; };

  /* ---------- Learn wording (from Mathbook's adapter) ---------- */
  function rightText(item) {
    if (item.kind === 'decide') return item.needs === 'Yes' ? `Right. The ${item.first.toLowerCase()} column needs an exchange first.` : 'Right. Every top digit is enough, so no regrouping is needed.';
    if (item.kind === 'mistake') return `Right. ${problemText(item)} = ${fmt(item.top - item.bottom)}.`;
    if (item.kind === 'check') return `Right. ${fmt(item.top - item.bottom)} + ${fmt(item.bottom)} = ${fmt(item.top)}.`;
    return 'Right.';
  }
  function hintText(item) {
    const p = M.plan(item.top, item.bottom), o = M.digitsOf(item.top, M.lengthOf(item.top)), b = M.digitsOf(item.bottom, M.lengthOf(item.top));
    if (item.kind === 'decide') return `Start with the ones: the top has ${o[0]} and the bottom has ${b[0]}. Is ${o[0]} enough to take away ${b[0]}? If yes, move one column left and ask again.`;
    if (item.kind === 'mistake') {
      const c = p.columns.find((x) => String(x.digit) !== String(item.work.d[x.place])) || p.columns[0];
      return `Look at the ${P[c.place].name} column. ${item.who} wrote ${item.work.d[c.place]} there. Work that column yourself and compare.`;
    }
    if (item.kind === 'check') return `First subtract, one column at a time from the ones. To check: answer + ${fmt(item.bottom)} should make the top number.`;
    return 'Start with the ones column.';
  }
  function showText(item) {
    const p = M.plan(item.top, item.bottom);
    if (item.kind === 'decide') {
      const o = M.digitsOf(item.top, M.lengthOf(item.top)), b = M.digitsOf(item.bottom, M.lengthOf(item.top));
      const c = p.columns.find((x) => x.needs);
      if (!c) return `No regrouping is needed: in every column the top digit is at least the digit under it (ones ${o[0]} and ${b[0]}, tens ${o[1]} and ${b[1]}${o.length > 2 ? `, hundreds ${o[2]} and ${b[2]}` : ''}${o.length > 3 ? `, thousands ${o[3]} and ${b[3]}` : ''}).`;
      const before = []; for (let k = 0; k < c.place; k++) before.push(`${P[k].name}: ${o[k]} is enough for ${b[k]}`);
      return `${before.length ? before.join('. ') + '. ' : ''}${item.first}: ${o[c.place]} is less than ${b[c.place]}, so yes, the ${item.first.toLowerCase()} column needs an exchange first.`;
    }
    if (item.kind === 'mistake') return `${item.who}'s mistake: ${item.answer} The right answer is ${fmt(item.top - item.bottom)}, worked below.`;
    if (item.kind === 'check') return `${problemText(item)} = ${fmt(item.top - item.bottom)}. Check: ${fmt(item.top - item.bottom)} + ${fmt(item.bottom)} = ${fmt(item.top)}, the top number.`;
    return '';
  }
  function wrongText(item, R, g) {
    if (item.kind === 'decide') {
      const o = M.digitsOf(item.top, M.lengthOf(item.top)), b = M.digitsOf(item.bottom, M.lengthOf(item.top));
      if (R.c1 !== item.needs) return `Check each column, starting with the ones (the top has ${o[0]}, the bottom has ${b[0]}). Is any top digit less than the digit under it?`;
      return 'Start at the ones and move left, one column at a time. Which column is the first one whose top digit is too small?';
    }
    if (item.kind === 'mistake') {
      if (!g.parts.mistake) return `Compare ${item.who}'s work with the right method, column by column, starting with the ones.`;
      return 'You found the mistake. Now check your own answer column by column (use your regroup marks).';
    }
    if (item.kind === 'check') {
      if (!g.parts.final) return 'First fix your subtraction answer: work column by column from the ones.';
      return 'To check, add your answer to the number you took away. You should get the top number.';
    }
    return 'Not yet.';
  }

  /* ---------- base-ten blocks (Mathbook's place-value pictures) ---------- */
  const tensW = (k) => `${k} ${k === 1 ? 'ten' : 'tens'}`, onesW = (k) => `${k} ${k === 1 ? 'one' : 'ones'}`;
  function blocks2(tens, ones, o = {}) {
    const col = (pi, count, hi, chip) => { const Q = pv.PLACES[pi];
      return `<div class="blocks-col place-${Q.key}${hi ? ' is-hi' : ''}"><div class="blocks-label">${Q.name}${chip ? ` <span class="sr-chip">${chip}</span>` : ''}</div><div class="blocks-art">${pv.placeSVG(pi, count)}</div>` +
        `<figcaption><b>${count}</b> ${count === 1 ? Q.one : Q.key} = ${fmt(count * Q.value)}</figcaption></div>`; };
    return `<figure class="blocks sr-blocks2" aria-label="${tens} tens and ${ones} ones">${col(2, tens, o.hiT, o.chipT)}${col(3, ones, o.hiO, o.chipO)}</figure>`;
  }
  function blockParts(n) {
    const t = Math.floor(n / 10), o = n % 10;
    return [
      { html: blocks2(t, o), say: `${n} has ${tensW(t)} and ${onesW(o)}.` },
      { html: blocks2(t, o, { hiT: true, chipT: '−1' }) + '<p class="sr-swap"><span>1 ten</span> <span aria-hidden="true">➜</span> <span>10 ones</span></p>', say: 'Exchange 1 ten for 10 ones. Take 1 ten from the tens.' },
      { html: blocks2(t - 1, o + 10, { hiT: true, chipT: '−1', hiO: true, chipO: '+10' }), say: `The tens go from ${t} to ${t - 1}. The ones go from ${o} to ${o + 10}. Now there are ${tensW(t - 1)} and ${onesW(o + 10)}.` },
      { html: blocks2(t - 1, o + 10), say: `${(t - 1) * 10} + ${o + 10} = ${n}. The value is the same: we only changed how it is shown.` }
    ];
  }
  const partNav = (k, n, attr) => `<div class="demo-controls"><button type="button" class="btn btn-secondary" data-${attr}="back"${k === 0 ? ' disabled' : ''}>◀ Back</button>` +
    `<span class="demo-count">Part ${k + 1} of ${n}</span><button type="button" class="btn btn-primary" data-${attr}="next"${k === n - 1 ? ' disabled' : ''}>Next ▶</button></div>`;

  /* =====================================================================================
     Learn questions (Your Turn). o: { onChange(resp), onDone(helped) }
     ===================================================================================== */
  /** Lesson 1's Your Turn: exchange 1 ten for 10 ones (two questions, each with Check, Hint and Show me). */
  function exchangeTry(box, item, resp, o) {
    const R0 = Object.assign({ q: 0 }, resp), n = item.n, t = item.tens, on = item.ones;
    const QS = [
      { key: 't', label: 'How many tens are left?', want: t - 1,
        hint: `Start with the ${t} tens. 1 ten is exchanged, so take 1 away from the tens.`,
        wrong: (v) => `${n} has ${tensW(t)}. When 1 ten is exchanged for 10 ones, there is 1 fewer ten${v === t + 1 ? ', not 1 more' : ''}.`,
        show: `${n} has ${tensW(t)}. Exchange 1 ten for 10 ones: ${t} − 1 = ${t - 1} ${t - 1 === 1 ? 'ten is' : 'tens are'} left.` },
      { key: 'o', label: 'How many ones are there now?', want: on + 10,
        hint: `There were ${on} ones. The ten you exchanged becomes 10 ones. Add them.`,
        wrong: (v) => `There were ${on} ones, and the exchanged ten becomes 10 ones${v === on + 1 ? ' (10 ones, not 1)' : ''}.`,
        show: `There were ${on} ones. 1 ten = 10 ones, so now there are ${on} + 10 = ${on + 10} ones.` }
    ];
    const parts = blockParts(n), last = parts.length - 1;
    let demoK = R0.sp !== undefined && !R0.sd && R0.q < 2 ? Math.min(R0.sp, last) : -1;
    box.innerHTML = '<div class="sr-xt"></div><p class="sk-sr" aria-live="polite"></p>';
    const xt = box.querySelector('.sr-xt'), liveEl = box.querySelector('.sk-sr');
    const announce = (msg) => { liveEl.textContent = ''; setTimeout(() => { liveEl.textContent = msg; }, 50); };
    const draw = (focusSel) => {
      const q = R0.q, showing = demoK >= 0 || !!R0.sd, k = demoK >= 0 ? demoK : last;
      let h = `<p class="q-prompt">Exchange 1 ten for 10 ones in ${n}.</p>${blocks2(t, on)}`;
      QS.forEach((Q, j) => { if (j < q) h += `<p class="sr-done-line"><span aria-hidden="true">✓ </span>${esc(Q.label)} <b>${R0[Q.key]}</b>${R0['h' + j] ? ' <span class="sr-helped-tag">(shown)</span>' : ''}</p>${R0['h' + j] ? `<p class="sr-shown">${esc(Q.show)}</p>` : ''}`; });
      if (showing) h += `<div class="sr-showdemo"><p class="sr-showdemo-h" tabindex="-1"><b>Show me:</b> watch the exchange, one part at a time.</p><div class="sr-blockdemo">${parts[k].html}<p class="sr-say">${esc(parts[k].say)}</p></div>${partNav(k, parts.length, 'x')}</div>`;
      if (q < 2 && !showing) {
        const Q = QS[q];
        h += `<div class="sr-q1"><label class="sr-q1-label" for="srQ1">${esc(Q.label)}</label> <input id="srQ1" class="sr-num" inputmode="numeric" maxlength="2" autocomplete="off" value="${esc(R0[Q.key] || '')}"></div>` +
          '<div class="btn-row sr-helprow"><button type="button" class="btn btn-primary" data-x="check">Check Answer</button><button type="button" class="btn btn-secondary" data-x="hint">💡 Hint</button><button type="button" class="btn btn-secondary" data-x="show">Show me</button></div><div class="sr-fb" aria-live="polite"></div>';
      } else if (q === 2) {
        h += (R0.sd ? '' : `<p class="sr-after-h">After the exchange:</p>${blocks2(t - 1, on + 10, { hiT: true, chipT: '−1', hiO: true, chipO: '+10' })}`) +
          `<div class="feedback ok sr-complete" tabindex="-1"><span aria-hidden="true">✓ </span>${R0.helped ? 'Completed with help. ' : ''}Now there are ${tensW(t - 1)} and ${onesW(on + 10)}. ${(t - 1) * 10} + ${on + 10} = ${n}. The value is the same.</div>`;
      }
      xt.innerHTML = h;
      const inp = box.querySelector('#srQ1');
      if (inp) {
        inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, '').slice(0, 2); R0[QS[R0.q].key] = inp.value; o.onChange(Object.assign({}, R0)); });
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); act('check'); } });
      }
      xt.querySelectorAll('[data-x]').forEach((b) => b.addEventListener('click', () => act(b.dataset.x)));
      if (focusSel) { const f = box.querySelector(focusSel); if (f) f.focus({ preventScroll: true }); }
    };
    const fbArea = () => box.querySelector('.sr-fb') || document.createElement('div');
    const retryRow = '<div class="btn-row sr-helprow sr-retry"><button type="button" class="btn btn-secondary" data-x="retry">Try again</button><button type="button" class="btn btn-secondary" data-x="hint">Get a hint</button><button type="button" class="btn btn-secondary" data-x="show">Show me how</button></div>';
    const next = (helpedNow) => {
      if (helpedNow) { R0['h' + R0.q] = true; R0.helped = true; }
      R0.q += 1; o.onChange(Object.assign({}, R0));
      draw(R0.q < 2 ? '#srQ1' : '.sr-complete');
      if (R0.q === 2) o.onDone(!!R0.helped);
    };
    function act(x) {
      const Q = QS[R0.q], area = fbArea();
      const mainHelp = box.querySelectorAll('.sr-helprow:not(.sr-retry) [data-x="hint"], .sr-helprow:not(.sr-retry) [data-x="show"]');
      mainHelp.forEach((b) => { b.hidden = false; });
      if (x === 'retry') { area.innerHTML = ''; const i = box.querySelector('#srQ1'); if (i) { i.focus(); i.select(); } return; }
      if (x === 'hint') { area.innerHTML = `<div class="feedback info"><span aria-hidden="true">💡 </span>${esc(Q.hint)}</div>`; R0.hints = (R0.hints || 0) + 1; o.onChange(Object.assign({}, R0)); return; }
      if (x === 'show') { demoK = 0; R0.helped = true; R0.sp = 0; o.onChange(Object.assign({}, R0)); draw('.sr-showdemo-h'); announce(parts[0].say); return; }
      if (x === 'back' || x === 'next') {
        const cur = demoK >= 0 ? demoK : last;
        demoK = Math.max(0, Math.min(last, cur + (x === 'next' ? 1 : -1)));
        if (R0.q < 2) { R0.sp = demoK; o.onChange(Object.assign({}, R0)); }
        if (demoK === last && R0.q < 2) {
          for (let j = R0.q; j < 2; j++) { R0[QS[j].key] = String(QS[j].want); R0['h' + j] = true; }
          R0.q = 2; R0.sd = true; o.onChange(Object.assign({}, R0));
          draw('.sr-complete'); announce(`${parts[last].say} Completed with help.`);
          o.onDone(true);
          return;
        }
        draw(demoK === last ? '[data-x="back"]' : demoK === 0 ? '[data-x="next"]' : `[data-x="${x}"]`); announce(parts[demoK].say);
        return;
      }
      const v = String(R0[Q.key] || '').trim();
      if (!/^\d+$/.test(v)) { area.innerHTML = '<div class="feedback info">Type a number, then check.</div>'; return; }
      if (Number(v) === Q.want) { next(false); return; }
      area.innerHTML = `<div class="feedback bad"><span aria-hidden="true">✗ </span>${esc(Q.wrong(Number(v)))}</div>` + retryRow;
      mainHelp.forEach((b) => { b.hidden = true; });
      area.querySelectorAll('[data-x]').forEach((b) => b.addEventListener('click', () => act(b.dataset.x)));
    }
    draw(null);
  }

  /**
   * Decide, mistake, check, steps and sub questions (and the parts around their workspaces).
   * mode 'learn': Check Answer with feedback, Hint and Show me. mode 'test': no Check, hints, feedback or worked answers.
   */
  function formItem(box, item, resp, o) {
    const testing = o.mode === 'test';
    const R = Object.assign({}, resp);
    const fire = () => o.onChange && o.onChange(Object.assign({}, R));
    const uid = 'f' + Math.floor(Math.random() * 1e9);
    const radios = (key, label, list, val) => `<fieldset class="sr-fs"><legend>${esc(label)}</legend><div class="sr-radios${list.some((v) => v.length > 18) ? ' sr-radios-wide' : ''}">${list.map((v) =>
      `<label class="sr-choice"><input type="radio" name="${uid}${key}" data-key="${key}" value="${esc(v)}"${val === v ? ' checked' : ''}> <span>${esc(v)}</span></label>`).join('')}</div></fieldset>`;
    let h = '';
    if (item.kind === 'decide') {
      h = `<p class="q-prompt">Look at ${probHTML(item)} before you subtract.</p><div class="sr-ws" data-ws="view"></div>` +
        radios('c1', 'Does it need regrouping?', ['Yes', 'No'], R.c1) + radios('c2', 'Which column needs an exchange first?', item.placeChoices, R.c2);
    } else if (item.kind === 'mistake') {
      h = `<p class="q-prompt">${esc(item.who)} worked ${probHTML(item)} and got ${fmt(item.wrong)}.</p><div class="sr-ws" data-ws="view"></div>` +
        radios('c1', 'What went wrong?', item.choices, R.c1) + '<p class="q-prompt sr-sub">Now find the right answer:</p><div class="sr-ws" data-ws="answer"></div>';
    } else if (item.kind === 'check') {
      h = '<p class="q-prompt">Subtract. Then choose how to check your answer with addition.</p><div class="sr-ws" data-ws="answer"></div>' + radios('c1', 'How can you check your answer with addition?', item.choices, R.c1);
    } else if (item.kind === 'steps') {
      h = `<p class="q-prompt">Write the regrouped top number for ${probHTML(item)}: above each column, the amount you will subtract from. You do not need to find the answer.</p><div class="sr-ws" data-ws="steps"></div>`;
    } else if (item.kind === 'sub') {
      h = `<p class="q-prompt">Subtract: ${probHTML(item)}</p><div class="sr-ws" data-ws="answer"></div>`;
    }
    const showCheck = !testing && item.kind !== 'sub';
    box.innerHTML = h + (showCheck ? '<div class="btn-row sr-helprow"><button type="button" class="btn btn-primary" data-check>Check Answer</button><button type="button" class="btn btn-secondary" data-help="hint">💡 Hint</button><button type="button" class="btn btn-secondary" data-help="show">Show me</button></div><div class="sr-fb" aria-live="polite"></div><div class="sr-worked"></div>' : '');
    const wsView = box.querySelector('[data-ws="view"]'), wsAns = box.querySelector('[data-ws="answer"]'), wsSteps = box.querySelector('[data-ws="steps"]');
    if (wsView) mount(wsView, item.kind === 'mistake'
      ? { top: item.top, bottom: item.bottom, mode: 'view', work: item.work, caption: `${item.who}'s work`, answerLabel: `${item.who}'s answer` }
      : { top: item.top, bottom: item.bottom, mode: 'view', answer: false, work: { ann: {}, d: [] } });
    const ansKey = item.kind === 'mistake' ? 'ws2' : 'ws';
    let ansInst = null, stepsInst = null;
    if (wsAns) {
      // In a test every workspace is SubtractKit's test mode: no Check, hints, feedback or solution, whatever is asked.
      ansInst = mount(wsAns, { top: item.top, bottom: item.bottom, mode: 'test', state: R[ansKey] || null });
      ansInst.on('change', (d) => { R[ansKey] = d.state; fire(); });
    }
    if (wsSteps) {
      stepsInst = mount(wsSteps, { top: item.top, bottom: item.bottom, mode: 'test', answer: false, state: R.ws || null });
      stepsInst.on('change', (d) => { R.ws = d.state; fire(); });
    }
    box.querySelectorAll('input[type=radio]').forEach((r) => r.addEventListener('change', () => { R[r.dataset.key] = r.value; fire(); }));
    if (!showCheck) return;
    let helped = !!R.helped;
    const area = () => box.querySelector('.sr-fb');
    const mainHelp = () => box.querySelectorAll('.sr-helprow:not(.sr-retry) [data-help]');
    const retryRow = '<div class="btn-row sr-helprow sr-retry"><button type="button" class="btn btn-secondary" data-help="retry">Try again</button><button type="button" class="btn btn-secondary" data-help="hint">Get a hint</button><button type="button" class="btn btn-secondary" data-help="show">Show me how</button></div>';
    function help(kind) {
      mainHelp().forEach((b) => { b.hidden = false; });
      if (kind === 'retry') { area().innerHTML = ''; const f = box.querySelector('input[type=radio]:checked') || box.querySelector('input:not([disabled])'); if (f) f.focus(); return; }
      if (kind === 'hint') { area().innerHTML = `<div class="feedback info"><span aria-hidden="true">💡 </span>${esc(hintText(item))}</div>`; R.hints = (R.hints || 0) + 1; fire(); return; }
      helped = true; R.helped = true; R.sp = 0; fire();
      area().innerHTML = '';
      playWorked(false);
    }
    let shownDone = false;
    function playWorked(atEnd) {
      const worked = box.querySelector('.sr-worked');
      worked.innerHTML = `<p class="sr-shown-h" tabindex="-1"><b>Show me:</b> watch each step of ${probHTML(item)}. Press Next to see each exchange. The answers are filled in at the end.</p><div class="sr-ws" data-ws="worked"></div><div class="sr-shown-end"></div>`;
      const demo = mount(worked.querySelector('[data-ws="worked"]'), { top: item.top, bottom: item.bottom, mode: 'demo', caption: 'Worked answer', demoStep: atEnd === true ? 99 : typeof atEnd === 'number' ? atEnd : 0 });
      demo.on('complete', () => finishShown());
      demo.on('step', (d) => { if (!shownDone) { R.sp = d.index; fire(); } });
      if (atEnd === true) { shownDone = true; worked.querySelector('.sr-shown-end').innerHTML = shownEnd(); return; }
      if (atEnd !== false) return;
      const hh = worked.querySelector('.sr-shown-h'); hh.focus({ preventScroll: true }); if (hh.scrollIntoView) hh.scrollIntoView({ block: 'nearest' });
    }
    const shownEnd = () => { const st = showText(item); return (st ? `<p class="sr-shown"><b>Here is how:</b> ${esc(st)}</p>` : '') + `<ol class="sk-steps">${M.solutionLines(item.top, item.bottom).map((l) => `<li>${esc(l)}</li>`).join('')}</ol>`; };
    function finishShown() {
      if (shownDone) return;
      shownDone = true; R.sd = true;
      if (item.kind === 'decide') { R.c1 = item.needs; R.c2 = item.first; }
      if (item.kind === 'mistake' || item.kind === 'check') R.c1 = item.answer;
      box.querySelectorAll('input[type=radio]').forEach((r) => { r.checked = R[r.dataset.key] === r.value; });
      const ann = standardAnn(item.top, item.bottom);
      if (ansInst) { const st = ansInst.getState(); st.ann = ann; st.d = answerDigits(item.top, item.bottom); ansInst.setState(st); R[ansKey] = ansInst.getState(); }
      if (stepsInst) { const st = stepsInst.getState(); st.ann = ann; stepsInst.setState(st); R.ws = stepsInst.getState(); }
      fire();
      box.querySelector('.sr-shown-end').innerHTML = shownEnd();
      area().innerHTML = '<div class="feedback ok sr-shown-done" tabindex="-1"><span aria-hidden="true">✓ </span>Completed with help. The answers are filled in. Go on, or try a similar problem on your own.</div>';
      const d = area().querySelector('.sr-shown-done'); d.focus({ preventScroll: true }); if (d.scrollIntoView) d.scrollIntoView({ block: 'nearest' });
      if (o.onDone) o.onDone(true);
    }
    if (R.sd) playWorked(true);
    else if (R.helped && R.sp !== undefined) playWorked(R.sp);
    box.querySelectorAll('.sr-helprow [data-help]').forEach((b) => b.addEventListener('click', () => help(b.dataset.help)));
    box.querySelector('[data-check]').addEventListener('click', () => {
      if (!answered(item, R)) { area().innerHTML = '<div class="feedback info">Answer every part, then check.</div>'; return; }
      const g = grade(item, R);
      if (g.correct) {
        area().innerHTML = `<div class="feedback ok"><span aria-hidden="true">✓ </span>${esc(rightText(item))}</div>`;
        if (o.onDone) o.onDone(helped);
      } else {
        area().innerHTML = `<div class="feedback bad"><span aria-hidden="true">✗ </span>${esc(wrongText(item, R, g))}</div>` + retryRow;
        mainHelp().forEach((b) => { b.hidden = true; });
        area().querySelectorAll('[data-help]').forEach((b) => b.addEventListener('click', () => help(b.dataset.help)));
      }
    });
  }

  /* =====================================================================================
     TEACH — the nine Learn steps from Mathbook, in Galaxy's lesson layout
     ===================================================================================== */
  const UNITS = [
    { name: 'How regrouping works', ids: ['value', 'one', 'multi'] },
    { name: 'Bigger numbers and zeros', ids: ['four', 'zero1', 'zeros2'] },
    { name: 'Think like a mathematician', ids: ['decide', 'mistakes', 'check'] }
  ];
  const STEPS = ['Goal', 'See it', 'Your turn', 'Finish'];
  const lessonOf = (id) => C.learn.find((l) => l.id === id);
  const lessonNum = (id) => LESSON_IDS.indexOf(id) + 1;
  let lesson = null;   // { id, step, ex, part, solved, helped }
  let pendingLesson = null;   // a lesson to open when Teach is shown (from the test's recommendations)

  function renderTeach() {
    lesson = null;
    const rec = (id) => store.lesson(id);
    const next = C.learn.find((l) => !rec(l.id)) || null, sum = store.lessonsSummary();
    const status = (id) => { const r = rec(id); return !r ? '' : r.indep ? '<span class="lp-done" aria-label="done">✓</span>' : '<span class="lp-tried">done with help</span>'; };
    paint(head('subTeachTitle', '💡 Teach <span class="h-sub">Show me how</span>') +
      `<div class="teach-layout">
        ${next ? `<div class="panel up-next"><p class="step-label">Up next · Lesson ${lessonNum(next.id)} of ${C.learn.length}</p><h3 class="up-title">${esc(next.title)}</h3>
          <p class="lede">${esc(next.explain)}</p><button class="btn btn-go btn-lg" data-start="${next.id}">▶ Start this lesson</button>
          <p class="muted">${sum.done} of ${sum.total} lessons done${sum.done > sum.indep ? ` (${sum.done - sum.indep} with help)` : ''}</p></div>`
        : '<div class="panel up-next"><h3 class="up-title">All lessons done! ⭐</h3><p class="lede">Pick any lesson to look at it again.</p></div>'}
        <div class="panel lesson-path"><h3>All lessons</h3>${UNITS.map((u, ui) => {
          const open = next ? u.ids.includes(next.id) : ui === 0, n = u.ids.filter((id) => rec(id)).length;
          return `<details class="unit"${open ? ' open' : ''}><summary><span class="unit-name">${ui + 1}. ${esc(u.name)}</span><span class="badge${n === u.ids.length ? ' done' : ''}">${n} of ${u.ids.length}</span></summary>
            <ol class="lp-list">${u.ids.map((id) => `<li><button class="lesson-row${next && id === next.id ? ' next' : ''}${rec(id) ? ' is-done' : ''}" data-lesson="${id}"><span class="lp-num">${lessonNum(id)}</span><span class="lp-title">${esc(lessonOf(id).title)}</span>${status(id)}</button></li>`).join('')}</ol></details>`;
        }).join('')}</div></div>`);
    host.querySelectorAll('[data-lesson],[data-start]').forEach((b) => b.addEventListener('click', () => startLesson(b.dataset.lesson || b.dataset.start)));
  }
  function startLesson(id) { lesson = { id, step: 0, ex: 0, part: 0, solved: !!store.lesson(id), helped: false }; renderLesson(); }

  function exampleHTML(ex) {
    if (ex.kind === 'blocks') {
      const parts = blockParts(ex.n), k = Math.min(lesson.part, parts.length - 1);
      return `<div class="sr-blockdemo">${parts[k].html}<p class="sr-say" aria-live="polite">${esc(parts[k].say)}</p></div>${partNav(k, parts.length, 'part')}`;
    }
    if (ex.kind === 'demo') return `<p class="lede">${probHTML(ex)}: press Next to see each step. Back goes to the step before.</p><div class="sr-ws" id="srExWs"></div>`;
    if (ex.kind === 'mistake') { const w = M.buggyWork(ex.top, ex.bottom, ex.bug); return `<p class="lede"><b>${esc(ex.who)}'s work:</b> ${probHTML(ex)} = ${fmt(w.answer)}?</p><div class="sr-ws" id="srExWs"></div><p class="sr-why">${esc(ex.note)}</p>`; }
    if (ex.kind === 'check') {
      return `<p class="lede">${probHTML(ex)} = ${fmt(ex.top - ex.bottom)}. Check it: add the answer to the number you took away.</p><div class="sr-ws" id="srExWs"></div>` +
        `<p class="sr-why">${fmt(ex.top - ex.bottom)} + ${fmt(ex.bottom)} = ${fmt(ex.top)}. It matches the top number, so the subtraction is right. If it does not match, look for the column that went wrong.</p>`;
    }
    return '';
  }
  function mountExample(ex) {
    const box = host.querySelector('#srExWs');
    if (!box) return;
    if (ex.kind === 'demo') mount(box, { top: ex.top, bottom: ex.bottom, mode: 'demo' });
    else if (ex.kind === 'mistake') mount(box, { top: ex.top, bottom: ex.bottom, mode: 'view', work: M.buggyWork(ex.top, ex.bottom, ex.bug), caption: `${ex.who}'s work`, answerLabel: `${ex.who}'s answer` });
    else if (ex.kind === 'check') mount(box, { top: ex.top, bottom: ex.bottom, mode: 'view', work: { ann: standardAnn(ex.top, ex.bottom), d: answerDigits(ex.top, ex.bottom) } });
  }

  function renderLesson(focusSel) {
    const st = lesson, L = lessonOf(st.id);
    const bar = STEPS.map((name, i) => `<li class="${i < st.step ? 'done' : i === st.step ? 'on' : ''}"><span>${name}</span></li>`).join('');
    let body = '';
    if (st.step === 0) {
      body = `<p class="step-label">Goal</p><p class="objective">${esc(L.title)}</p><p class="lede sr-explain">${esc(L.explain)}</p>`;
    } else if (st.step === 1) {
      const ex = L.examples[st.ex];
      body = `<p class="step-label">See it · Example ${st.ex + 1} of ${L.examples.length}</p>${exampleHTML(ex)}` +
        (L.examples.length > 1 ? `<div class="btn-row sr-exnav"><button class="btn btn-secondary" data-ex="prev"${st.ex === 0 ? ' disabled' : ''}>◀ Previous example</button><button class="btn btn-secondary" data-ex="next"${st.ex === L.examples.length - 1 ? ' disabled' : ''}>Next example ▶</button></div>` : '');
    } else if (st.step === 2) {
      body = '<p class="step-label">Your turn</p><div class="sr-try" id="srTry"></div><div class="sr-again"></div>';
    } else {
      const r = store.lesson(st.id), nextL = C.learn[LESSON_IDS.indexOf(st.id) + 1];
      body = `<h3 class="big-title">${r && !st.helped ? 'Lesson complete! ⭐' : 'Lesson complete with help'}</h3>
        <p class="lede">${st.helped ? 'You finished with help (Show me). That is fine: try a similar problem on your own when you are ready.' : 'You did it on your own.'}</p>
        <div class="btn-row">${nextL ? `<button class="btn btn-go btn-lg" data-start="${nextL.id}">Next lesson: ${esc(nextL.title)} ▶</button>` : ''}<button class="btn btn-secondary" data-lact="list">All lessons</button></div>`;
    }
    const canNext = st.step < 2 || (st.step === 2 && st.solved);
    paint(head('subLessonTitle', `💡 ${esc(L.title)} <span class="h-sub">Lesson ${lessonNum(st.id)} of ${C.learn.length}</span>`, '#/subtraction/teach', '⬅ All lessons') +
      `<div class="panel lesson-panel${st.step === 0 ? ' cream' : ''}"><ol class="stepper" aria-hidden="true">${bar}</ol><p class="sr-only">Step ${st.step + 1} of ${STEPS.length}: ${STEPS[st.step]}</p>
        <div class="lesson-body">${body}</div>
        ${st.step < 3 ? `<div class="btn-row between lesson-nav"><button class="btn btn-secondary" data-lact="back"${st.step === 0 ? ' disabled' : ''}>◀ ${st.step ? STEPS[st.step - 1] : 'Back'}</button>
          <span class="sr-locked muted" ${canNext ? 'hidden' : ''}>Finish your turn to go on.</span>
          <button class="btn btn-primary" data-lact="next"${canNext ? '' : ' disabled'}>${st.step === 2 ? 'Finish ▶' : `Next: ${STEPS[st.step + 1]} ▶`}</button></div>` : ''}</div>`);
    if (st.step === 1) {
      mountExample(L.examples[st.ex]);
      host.querySelectorAll('[data-part]').forEach((b) => b.addEventListener('click', () => { st.part = Math.max(0, Math.min(3, st.part + (b.dataset.part === 'next' ? 1 : -1))); renderLesson(`[data-part="${b.dataset.part}"]:not([disabled])`); }));
      host.querySelectorAll('[data-ex]').forEach((b) => b.addEventListener('click', () => { st.ex += b.dataset.ex === 'next' ? 1 : -1; st.part = 0; renderLesson('.step-label'); }));
    }
    if (st.step === 2) mountTry(L);
    host.querySelectorAll('[data-lact]').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.lact;
      if (a === 'list') { renderTeach(); focusHead(); return; }
      if (a === 'back') { st.step -= 1; st.part = 0; }
      if (a === 'next') st.step += 1;
      renderLesson();
    }));
    host.querySelectorAll('[data-start]').forEach((b) => b.addEventListener('click', () => startLesson(b.dataset.start)));
    if (focusSel) { const f = host.querySelector(focusSel); if (f) { f.setAttribute('tabindex', f.getAttribute('tabindex') || '-1'); f.focus({ preventScroll: true }); return; } }
    focusHead();
  }

  /** Your Turn: one item from the lesson's own generator, rebuilt from a saved seed so a refresh keeps it. */
  function mountTry(L) {
    const st = lesson;
    let w = store.lessonWork(L.id);
    if (!w) { w = { seed: newSeed(), state: null, resp: null }; store.setLessonWork(L.id, w); }
    const item = L.yourTurn(M.rng(w.seed));
    const box = host.querySelector('#srTry');
    const save = () => store.setLessonWork(L.id, w);
    // A hint is help too (the same rule as Practice). It is saved with the work so a reload keeps it (SI-06).
    let hinted = w.hinted === true || !!(w.resp && w.resp.hints);
    const markHint = () => { if (!hinted) { hinted = true; w.hinted = true; save(); } };
    /** restoring: the work was already finished and saved (only show it again; record nothing new). */
    const solved = (helped, restoring) => {
      helped = !!helped || hinted;
      st.solved = true; st.helped = helped;
      if (!restoring) store.completeLesson(L.id, helped);
      const nb = host.querySelector('[data-lact="next"]'); if (nb) nb.disabled = false;
      const note = host.querySelector('.sr-locked'); if (note) note.hidden = true;
      const a = host.querySelector('.sr-again');
      a.innerHTML = (helped ? '<p class="sr-helped">Completed with help. When you are ready, try a similar problem on your own (or go on).</p>' : '') +
        `<button type="button" class="btn btn-secondary" data-new>${helped ? 'Try a similar problem' : 'New problem'}</button>`;
      a.querySelector('[data-new]').addEventListener('click', () => { store.setLessonWork(L.id, { seed: newSeed(), state: null, resp: null }); st.solved = !!store.lesson(L.id); renderLesson('.step-label'); });
    };
    if (item.kind === 'guided') {
      box.innerHTML = `<p class="q-prompt">Work through ${probHTML(item)}, one decision at a time. Use 💡 Hint or Show me if you get stuck.</p><div class="sr-ws" id="srYt"></div>`;
      const ok = w.state && SK.validState(w.state, item.top, item.bottom);
      const inst = mount(box.querySelector('#srYt'), { top: item.top, bottom: item.bottom, mode: 'guided', state: ok ? w.state : null });
      inst.on('change', (d) => { w.state = d.state; save(); });
      inst.on('hint', markHint);
      inst.on('complete', (d) => solved(!!d.helped));
      if (ok && w.state.guided && w.state.guided.stage === 'done') solved(!!w.state.helped, true);
    } else if (item.kind === 'exchange') {
      const resp = w.resp && validResponse(item, w.resp) ? w.resp : {};
      exchangeTry(box, item, resp, { onChange: (r) => { w.resp = r; if (r.hints) markHint(); save(); }, onDone: (helped) => solved(helped) });
      if (resp.q === 2) solved(!!resp.helped, true);
    } else {
      const resp = w.resp && validResponse(item, w.resp) ? w.resp : {};
      formItem(box, item, resp, { mode: 'learn', onChange: (r) => { w.resp = r; if (r.hints) markHint(); save(); }, onDone: (helped) => solved(helped) });
      if (resp.sd) solved(true, true);
    }
  }

  /* =====================================================================================
     PRACTICE — SubtractKit independent mode, with Mathbook's setup and difficulty rules
     ===================================================================================== */
  let setup = { size: C.SETUP.defaults.size, difficulty: C.SETUP.defaults.difficulty, length: C.SETUP.defaults.length };
  const OUT_LABEL = { independent: 'On your own', hinted: 'Right after hints', shown: 'Completed with Show me', incorrect: 'Not right yet', skipped: 'Skipped' };
  const sizeLabel = (s) => (s === 'mixed' ? 'Mixed sizes' : `${s}-digit`);
  const diffLabel = (d) => (C.SETUP.difficulties.find((x) => x.v === d) || { label: d }).label;

  function renderPracticeSetup() {
    const a = store.activePractice();
    const segRow = (key, legend, opts) => `<fieldset class="field"><legend>${legend}</legend><div class="seg" data-key="${key}">${opts.map((o) =>
      `<button type="button" data-v="${o.v}" aria-pressed="${String(String(setup[key]) === String(o.v))}">${esc(o.label)}</button>`).join('')}</div></fieldset>`;
    paint(head('subPracticeTitle', '✏️ Practice <span class="h-sub">Let me try</span>') +
      (a ? `<div class="panel cream"><div class="panel-head"><h3>Keep going</h3><span class="badge">Problem ${Math.min(a.i + 1, a.length)} of ${a.length}</span></div>
          <p class="muted">${esc(sizeLabel(a.size))} · ${esc(diffLabel(a.difficulty))}. Your work is saved.</p>
          <div class="btn-row" style="margin-top:12px"><button class="btn btn-go btn-lg" id="spContinue">▶ Continue practice</button><button class="btn btn-secondary" id="spDrop">Start over</button></div></div>` : '') +
      `<div class="panel workspace sr-setup"><h3>Choose your practice</h3>
        ${segRow('size', 'Number size', C.SETUP.sizes)}
        ${segRow('difficulty', 'Difficulty', C.SETUP.difficulties)}
        <p class="sr-diff-desc muted" id="spDiffDesc"></p>
        ${segRow('length', 'How many problems', C.SETUP.lengths.map((n) => ({ v: n, label: String(n) })))}
        <p class="feedback info" id="spWhy" role="status" hidden></p>
        <div class="btn-row" style="margin-top:16px"><button class="btn btn-go btn-lg" id="spStart">▶ Start practice</button></div>
        <p class="muted" style="margin-top:8px">No timer. Use 💡 Hint or Show me whenever you need help: help is always fine, and it is recorded as help.</p></div>`);
    const refresh = () => {
      host.querySelectorAll('.seg[data-key]').forEach((s) => s.querySelectorAll('[data-v]').forEach((b) => b.setAttribute('aria-pressed', String(String(setup[s.dataset.key]) === b.dataset.v))));
      const why = M.unavailableReason(setup.size, setup.difficulty);
      host.querySelector('#spWhy').hidden = !why; host.querySelector('#spWhy').textContent = why;
      host.querySelector('#spStart').disabled = !!why;
      host.querySelector('#spDiffDesc').textContent = (C.SETUP.difficulties.find((d) => d.v === setup.difficulty) || {}).desc || '';
    };
    host.querySelectorAll('.seg[data-key]').forEach((s) => s.addEventListener('click', (e) => {
      const b = e.target.closest('[data-v]'); if (!b) return;
      const v = b.dataset.v, key = s.dataset.key;
      setup[key] = key === 'length' ? Number(v) : /^\d$/.test(v) ? Number(v) : v;
      refresh();
    }));
    refresh();
    host.querySelector('#spStart').addEventListener('click', () => { store.startPractice(setup, newSeed()); renderPracticeQ(); });
    if (a) {
      host.querySelector('#spContinue').addEventListener('click', () => renderPracticeQ());
      host.querySelector('#spDrop').addEventListener('click', () => { store.quitPractice(); renderPracticeSetup(); focusHead(); });
    }
  }
  const sessionItems = (a) => M.generateSession({ size: a.size, difficulty: a.difficulty, length: a.length, seed: a.seed }).items;

  function renderPracticeQ() {
    const a = store.activePractice();
    if (!a) { renderPracticeSetup(); focusHead(); return; }
    const items = sessionItems(a), q = items[a.i];
    if (!q) { store.quitPractice(); renderPracticeSetup(); return; }
    const recorded = a.results[a.i];
    const cur = a.cur || { hints: 0, tries: 0, wrong: 0, helped: false, state: null };
    paint(`<div class="panel workspace sr-run"><div class="act-head"><button class="btn btn-ghost-light btn-sm" data-nav="#/subtraction/practice">✕ Exit</button>
        <div class="act-title"><h2 id="subPracticeQ" tabindex="-1">Practice</h2><span class="act-count">Problem ${a.i + 1} of ${a.length}</span></div>
        <div class="act-right"><span class="badge">${esc(sizeLabel(a.size))} · ${esc(diffLabel(a.difficulty))}</span></div></div>
        <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${a.length}" aria-valuenow="${a.i}" aria-label="Practice progress"><span style="width:${(a.i / a.length) * 100}%"></span></div>
        <p class="q-prompt">Subtract: ${probHTML(q)}</p>
        <div class="sr-ws" id="spWs"></div>
        <div class="sr-outcome" id="spOutcome" role="status">${recorded ? outcomeNote(recorded.outcome) : ''}</div>
        <div class="btn-row between sr-runnav"><button class="btn btn-secondary" id="spSkip"${recorded ? ' hidden' : ''}>Skip this one</button>
          <button class="btn btn-primary btn-lg" id="spNext"${recorded ? '' : ' hidden'}>${a.i + 1 < a.length ? 'Next problem ▶' : 'See my results ▶'}</button></div></div>`);
    // A tap that lands on this screen's Skip/Next as part of a double tap on the previous screen is ignored (SI-02).
    const shownAt = Date.now(), fresh = (e) => e.detail > 1 || Date.now() - shownAt < 400;
    let moving = false;
    function goNext(e) {
      if (moving || (e && fresh(e))) return;
      moving = true;
      const session = store.nextProblem();
      if (session) renderPracticeDone(session); else renderPracticeQ();
      focusHead();
    }
    host.querySelector('#spNext').addEventListener('click', goNext);
    if (recorded) {
      // Already finished (e.g. after a reload): show the worked answer read-only, never a live workspace (SI-01, SI-04).
      mount(host.querySelector('#spWs'), { top: q.top, bottom: q.bottom, mode: 'view', work: { ann: standardAnn(q.top, q.bottom), d: answerDigits(q.top, q.bottom) }, caption: 'Worked answer' });
      return;
    }
    const ok = cur.state && SK.validState(cur.state, q.top, q.bottom);
    const ws = mount(host.querySelector('#spWs'), { top: q.top, bottom: q.bottom, mode: 'independent', hints: true, feedback: true, solution: true, state: ok ? cur.state : null });
    // Help is tracked as it happens and saved, so it stays recorded even if the right answer comes later or after a refresh.
    const track = () => store.updateCurrent(cur);
    ws.on('change', (d) => { cur.state = d.state; track(); });
    ws.on('hint', (d) => { if (d.solution || d.shown) cur.helped = true; else cur.hints += 1; track(); });   // Show me is help, not a hint (SI-05)
    ws.on('answer', (d) => {
      if (d.status === 'correct' || d.status === 'wrong') { cur.tries += 1; if (d.status === 'wrong') cur.wrong += 1; }
      if (d.helped) cur.helped = true;
      track();
    });
    ws.on('complete', (d) => finish({ correct: true, helped: cur.helped || !!d.helped || !!d.shown }));
    function finish(r) {
      const outcome = store.recordProblem(a.i, { correct: r.correct, helped: r.helped, hints: cur.hints, wrong: cur.wrong, tries: cur.tries });
      if (!outcome) return;   // already recorded: no duplicate result
      host.querySelector('#spOutcome').innerHTML = outcomeNote(outcome);
      host.querySelector('#spSkip').hidden = true;
      const nb = host.querySelector('#spNext'); nb.hidden = false;
    }
    host.querySelector('#spSkip').addEventListener('click', (e) => { if (moving || fresh(e)) return; finish({ correct: false, helped: cur.helped }); goNext(); });
  }
  /** Shown under the workspace once a problem's outcome is recorded. */
  function outcomeNote(o) {
    const txt = { independent: '⭐ You solved it on your own!', hinted: '✓ You solved it with hints. Next time, try it with fewer hints.',
      shown: '✓ Completed with Show me. That counts as help. Try a similar one on your own when you are ready.', incorrect: 'This one is not right yet. It is saved for you to practice again.', skipped: 'Skipped.' }[o];
    return `<p class="sr-outcome-note sr-o-${o}">${esc(txt)}</p>`;
  }
  function renderPracticeDone(session) {
    const items = M.generateSession({ size: session.size, difficulty: session.difficulty, length: session.length, seed: session.seed }).items;
    const c = session.counts;
    paint(head('subPracticeDoneTitle', '✏️ Practice results') +
      `<div class="panel workspace"><h3 class="big-title">${c.independent === session.total ? 'All on your own! ⭐' : 'Practice complete!'}</h3>
        <div class="stats sr-outcomes">${root.GalaxySubStore.OUTCOMES.map((o) => `<div class="stat sr-o-${o}"><b id="spc-${o}">${c[o]}</b>${esc(OUT_LABEL[o])}</div>`).join('')}</div>
        <p class="muted" style="margin-top:10px">Only problems solved without hints or Show me count as “on your own”.</p>
        <div class="table-wrap"><table class="data" id="spList"><thead><tr><th>#</th><th>Problem</th><th>How it went</th></tr></thead><tbody>${items.map((q, i) => {
          const r = session.results[i];
          return `<tr><td>${i + 1}</td><td class="sr-nowrap">${probHTML(q)} = ${fmt(q.top - q.bottom)}</td><td>${esc(OUT_LABEL[r ? r.outcome : 'skipped'])}${r && r.helped && r.outcome !== 'shown' ? ' (after Show me)' : ''}${r && r.hints ? ` (${r.hints} hint${r.hints === 1 ? '' : 's'})` : ''}</td></tr>`;
        }).join('')}</tbody></table></div>
        <div class="btn-row" style="margin-top:16px"><button class="btn btn-go btn-lg" id="spAgain">▶ Practice again</button><button class="btn btn-secondary" data-nav="#/subtraction/practice">Change practice</button><button class="btn btn-secondary" data-nav="${MENU}">Subtraction menu</button></div></div>`);
    host.querySelector('#spAgain').addEventListener('click', () => { store.startPractice({ size: session.size, difficulty: session.difficulty, length: session.length }, newSeed()); renderPracticeQ(); focusHead(); });
  }

  /* =====================================================================================
     TEST — Mathbook's 15-question blueprint, SubtractKit test mode, graded only at the end
     ===================================================================================== */
  const CAT_LABEL = { final: 'Final answers', steps: 'Regrouping steps', decide: 'Deciding whether to regroup', mistake: 'Finding mistakes' };
  const DIFF_LABEL = { none: 'No regrouping', easy: 'Easy (one exchange)', medium: 'Medium (two or more)', hard: 'Hard (across zeros)' };
  const SKILL = Object.fromEntries(C.skills.map((s) => [s.id, s]));
  const PRACTICE_FOR = { one: { size: 3, difficulty: 'easy' }, multi: { size: 4, difficulty: 'medium' }, zero1: { size: 4, difficulty: 'hard' }, zeros2: { size: 4, difficulty: 'hard' }, four: { size: 4, difficulty: 'mixed' } };
  const mastery = (pct) => (pct >= 90 ? { label: 'Mastered', advice: 'Ready to move on. Keep it fresh with Mixed practice.' }
    : pct >= 70 ? { label: 'Review missed skills', advice: 'Practice the skills listed below, then take the test again.' }
    : { label: 'Reteach and reassess', advice: 'Go back through the lessons for the skills below, practice them, then take a new test. Every new test uses new numbers.' });
  let testItemsCache = null;
  const itemsFor = (seed) => { if (!testItemsCache || testItemsCache.seed !== seed) testItemsCache = { seed, items: C.testItems(seed) }; return testItemsCache.items; };
  /** The draft's responses, each checked against its own question (a bad one is dropped by itself). */
  function cleanResponses(draft, items) {
    const out = {};
    items.forEach((it) => { const r = draft.resp[it.id]; if (r && validResponse(it, r)) out[it.id] = r; });
    return out;
  }

  function renderTestSetup() {
    const d = store.testDraft(), items = d ? itemsFor(d.seed) : null;
    const n = d ? items.filter((it) => touched(it, cleanResponses(d, items)[it.id])).length : 0;
    paint(head('subTestTitle', '⏱️ Test <span class="h-sub">Show what I know</span>') +
      `<div class="panel workspace start-hero"><div class="hero-icon" aria-hidden="true">⏱️</div><div class="hero-body">
        <h3 class="hero-title">Regrouping Test</h3>
        <div class="chips-big"><span>${C.BLUEPRINT.length} questions</span><span>2-, 3- and 4-digit</span><span>No timer</span></div>
        <p class="lede">No hints, no Check and no Show me. Do your best on each question, then press Finish. You will see what you got right and how to work the others.</p>
        <div class="btn-row">${d ? `<button class="btn btn-go btn-lg" id="stContinue">▶ Continue the test (${n} of ${items.length} answered)</button><button class="btn btn-secondary" id="stNew">Start a new test</button>` : '<button class="btn btn-go btn-lg" id="stStart">▶ Start the test</button>'}</div></div></div>`);
    const start = () => { store.startTest(newSeed()); renderTestQ(); };
    if (d) { host.querySelector('#stContinue').addEventListener('click', () => renderTestQ()); host.querySelector('#stNew').addEventListener('click', start); }
    else host.querySelector('#stStart').addEventListener('click', start);
  }
  function renderTestQ(focusSel) {
    const d = store.testDraft();
    if (!d) { renderTestSetup(); return; }
    const items = itemsFor(d.seed), resp = cleanResponses(d, items), i = Math.min(d.i, items.length - 1), it = items[i];
    const done = items.filter((x) => touched(x, resp[x.id])).length;
    paint(`<div class="panel workspace test-sheet sr-test"><div class="act-head"><button class="btn btn-ghost-light btn-sm" data-nav="#/subtraction/test">✕ Exit</button>
        <div class="act-title"><h2 id="subTestQ" tabindex="-1">Regrouping Test</h2><span class="act-count">Question ${i + 1} of ${items.length}</span></div>
        <div class="act-right"><span class="badge" id="stAnswered">${done} answered</span></div></div>
        <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${items.length}" aria-valuenow="${i + 1}" aria-label="Test progress"><span style="width:${((i + 1) / items.length) * 100}%"></span></div>
        <div class="sr-item" id="stItem"></div>
        <div class="btn-row between sr-runnav"><button class="btn btn-secondary" id="stPrev"${i === 0 ? ' disabled' : ''}>◀ Previous</button>
          ${i + 1 < items.length ? '<button class="btn btn-primary btn-lg" id="stNext">Next ▶</button>' : '<button class="btn btn-go btn-lg" id="stFinish">Finish the test</button>'}</div>
        <nav class="sr-qnav" aria-label="Questions">${items.map((x, k) => `<button class="sr-qdot${k === i ? ' on' : ''}${touched(x, resp[x.id]) ? ' has' : ''}" data-q="${k}" aria-label="Question ${k + 1}${touched(x, resp[x.id]) ? ', answered' : ''}"${k === i ? ' aria-current="step"' : ''}>${k + 1}</button>`).join('')}</nav>
        <div id="stConfirm"></div></div>`);
    formItem(host.querySelector('#stItem'), it, resp[it.id] || {}, { mode: 'test', onChange: (r) => {
      const cur = store.testDraft(); if (!cur) return;
      cur.resp[it.id] = r; store.saveTestDraft(cur);
      const has = touched(it, r), dot = host.querySelector(`[data-q="${i}"]`); dot.classList.toggle('has', has);
      host.querySelector('#stAnswered').textContent = `${items.filter((x) => touched(x, x.id === it.id ? r : resp[x.id])).length} answered`;
      resp[it.id] = r;
    } });
    const go = (k) => { const cur = store.testDraft(); cur.i = k; store.saveTestDraft(cur); renderTestQ(); };
    host.querySelector('#stPrev').addEventListener('click', () => go(i - 1));
    if (host.querySelector('#stNext')) host.querySelector('#stNext').addEventListener('click', () => go(i + 1));
    host.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => go(Number(b.dataset.q))));
    const fin = host.querySelector('#stFinish');
    if (fin) fin.addEventListener('click', () => {
      const left = items.filter((x) => !touched(x, store.testDraft().resp[x.id])).length;
      if (!left) { finishTest(); return; }
      host.querySelector('#stConfirm').innerHTML = `<div class="feedback info sr-confirm" tabindex="-1">${left} question${left === 1 ? ' has' : 's have'} no answer yet. Unanswered questions count as not right.
        <div class="btn-row" style="margin-top:10px"><button class="btn btn-go" id="stFinishAnyway">Finish anyway</button><button class="btn btn-secondary" id="stGoBack">Go back</button></div></div>`;
      host.querySelector('#stFinishAnyway').addEventListener('click', finishTest);
      host.querySelector('#stGoBack').addEventListener('click', () => go(items.findIndex((x) => !touched(x, store.testDraft().resp[x.id]))));
      host.querySelector('.sr-confirm').focus();
    });
    focusHead(focusSel);
  }
  /** Grade every question once, record the result (once per test), then show the report. */
  function finishTest() {
    const d = store.testDraft();
    if (!d) return;
    const items = itemsFor(d.seed), resp = cleanResponses(d, items);
    const rows = items.map((it) => {
      const r = resp[it.id], g = grade(it, r);
      return { it, r, correct: g.correct, unanswered: !touched(it, r), diff: M.classify(it.top, it.bottom).difficulty };
    });
    const tally = (keyOf) => { const t = {}; rows.forEach((x) => { const k = keyOf(x); t[k] = t[k] || { c: 0, t: 0 }; t[k].t += 1; if (x.correct) t[k].c += 1; }); return t; };
    const correct = rows.filter((x) => x.correct).length, unanswered = rows.filter((x) => !x.correct && x.unanswered).length;
    const missedSkills = [...new Set(rows.filter((x) => !x.correct).map((x) => x.it.skill))];
    const result = { seed: d.seed, total: rows.length, correct, incorrect: rows.length - correct - unanswered, unanswered, byCat: tally((x) => x.it.cat), byDiff: tally((x) => x.diff), missedSkills };
    try { store.recordTest(result); } catch (e) { /* the report still shows; nothing invalid is saved */ }
    renderTestResults(Object.assign({ pct: Math.round((100 * correct) / rows.length) }, result), rows);
  }
  const yourAnswer = (it, r) => {
    if (!r) return 'no answer';
    const val = (ws) => { const a = ws ? M.readAnswer(ws.d || []) : { status: 'empty' }; return a.status === 'ok' ? fmt(a.value) : a.status === 'empty' ? '—' : 'incomplete'; };
    if (it.kind === 'sub') return val(r.ws);
    if (it.kind === 'steps') return r.ws && Object.keys(r.ws.ann || {}).length ? 'regroup marks written' : 'no marks';
    if (it.kind === 'decide') return `regrouping needed: ${r.c1 || '—'} · first column: ${r.c2 || '—'}`;
    if (it.kind === 'mistake') return `the mistake was: ${r.c1 ? r.c1.replace(/\.$/, '') : '—'}; the answer is ${val(r.ws2)}`;
    return '—';
  };
  const rightAnswer = (it) => it.kind === 'decide' ? `regrouping needed: ${it.needs} · first column: ${it.first}` : it.kind === 'steps' ? 'the regrouped top number (see the worked answer)' : it.kind === 'mistake' ? `the mistake was: ${it.answer.replace(/\.$/, '')}; the answer is ${fmt(it.top - it.bottom)}` : fmt(it.top - it.bottom);
  function renderTestResults(res, rows) {
    const m = mastery(res.pct);
    const recs = res.missedSkills.filter((s) => SKILL[s]);
    paint(head('subTestDoneTitle', '⏱️ Test results') +
      `<div class="panel workspace test-sheet"><div class="score-row"><span class="big-score" id="stPct">${res.pct}%</span><span class="badge">${esc(m.label)}</span></div>
        <div class="stats"><div class="stat"><b id="stC">${res.correct}</b>correct</div><div class="stat"><b id="stI">${res.incorrect}</b>not right</div><div class="stat"><b id="stU">${res.unanswered}</b>unanswered</div><div class="stat"><b>${res.total}</b>questions</div></div>
        <p class="lede" style="margin-top:12px">${esc(m.advice)}</p>
        <div class="sr-results-grid">
          <div><h3>By kind of question</h3><table class="data" id="stCats"><thead><tr><th>Kind</th><th>Right</th></tr></thead><tbody>${Object.entries(res.byCat).map(([k, v]) => `<tr><td>${esc(CAT_LABEL[k] || k)}</td><td>${v.c} of ${v.t}</td></tr>`).join('')}</tbody></table></div>
          <div><h3>By difficulty</h3><table class="data" id="stDiffs"><thead><tr><th>Difficulty</th><th>Right</th></tr></thead><tbody>${['none', 'easy', 'medium', 'hard'].filter((k) => res.byDiff[k]).map((k) => `<tr><td>${esc(DIFF_LABEL[k])}</td><td>${res.byDiff[k].c} of ${res.byDiff[k].t}</td></tr>`).join('')}</tbody></table></div>
        </div>
        <h3 style="margin-top:16px">Recommended next</h3>
        ${recs.length ? `<ul class="sr-recs" id="stRecs">${recs.map((s) => `<li><b>${esc(SKILL[s].title)}</b>: ${esc(SKILL[s].desc)} <span class="btn-row"><button class="btn btn-secondary btn-sm" data-rec-lesson="${s}">Review the lesson</button>${PRACTICE_FOR[s] ? `<button class="btn btn-secondary btn-sm" data-rec-practice="${s}">Practice: ${esc(sizeLabel(PRACTICE_FOR[s].size))} ${esc(diffLabel(PRACTICE_FOR[s].difficulty))}</button>` : ''}</span></li>`).join('')}</ul>`
          : '<p class="muted" id="stRecs">Nothing missed. Keep it fresh with Mixed practice.</p>'}
        <h3 style="margin-top:16px">Every question</h3>
        <ol class="sr-review" id="stReview">${rows.map((x, k) => `<li class="${x.correct ? 'ok' : 'bad'}"><details data-k="${k}"><summary><span aria-hidden="true">${x.correct ? '✓' : x.unanswered ? '–' : '✗'}</span> ${probHTML(x.it)} <span class="badge">${esc(CAT_LABEL[x.it.cat])}</span> <span class="sr-sum-txt">${x.correct ? 'right' : x.unanswered ? 'unanswered' : 'not right'}</span></summary>
          <p>Your answer: <b>${esc(yourAnswer(x.it, x.r))}</b>.</p><p>Right answer: <b>${esc(rightAnswer(x.it))}</b>.</p><div class="sr-ws" data-review="${k}"></div></details></li>`).join('')}</ol>
        <div class="btn-row" style="margin-top:16px"><button class="btn btn-go" id="stAgain">Take a new test</button><button class="btn btn-secondary" data-nav="${MENU}">Subtraction menu</button></div></div>`);
    // Worked answers appear only now, after the test is finished: one demo workspace per opened question.
    host.querySelectorAll('details[data-k]').forEach((det) => det.addEventListener('toggle', () => {
      const box = det.querySelector('[data-review]');
      if (!det.open || box.childElementCount) return;
      const it = rows[Number(det.dataset.k)].it;
      mount(box, { top: it.top, bottom: it.bottom, mode: 'demo', caption: 'Worked answer' });
    }));
    host.querySelectorAll('[data-rec-lesson]').forEach((b) => b.addEventListener('click', () => { pendingLesson = b.dataset.recLesson; ctx.nav('#/subtraction/teach'); }));
    host.querySelectorAll('[data-rec-practice]').forEach((b) => b.addEventListener('click', () => { Object.assign(setup, PRACTICE_FOR[b.dataset.recPractice]); ctx.nav('#/subtraction/practice'); }));
    host.querySelector('#stAgain').addEventListener('click', () => { store.startTest(newSeed()); renderTestQ(); });
    focusHead();
  }

  /* =====================================================================================
     PROGRESS (grown-ups)
     ===================================================================================== */
  function renderProgress() {
    const ls = store.lessonsSummary(), tot = store.practiceTotals(), sessions = store.sessions().slice(-8).reverse(), tests = store.tests().slice(-8).reverse();
    const date = (s) => new Date(s).toLocaleDateString();
    const all = Object.values(tot).reduce((a, b) => a + b, 0);
    paint(head('subProgressTitle', '📊 Subtraction progress') +
      `<div class="panel"><h3>Lessons</h3><p class="lede"><b id="sgLessons">${ls.done}/${ls.total}</b> lessons done${ls.done > ls.indep ? ` · ${ls.done - ls.indep} only with help so far` : ''}.</p>
        <ol class="sr-list">${C.learn.map((l) => { const r = store.lesson(l.id); return `<li>${esc(l.title)}: ${r ? (r.indep ? '✓ done on own' : 'done with help') : 'not yet'}</li>`; }).join('')}</ol></div>
       <div class="panel"><h3>Practice (${all} problems)</h3><div class="stats" id="sgPractice">${root.GalaxySubStore.OUTCOMES.map((o) => `<div class="stat"><b data-o="${o}">${tot[o]}</b>${esc(OUT_LABEL[o])}</div>`).join('')}</div>
        <p class="muted" style="margin-top:8px">Show me and hints are recorded as help and never counted as “on your own”.</p>
        ${sessions.length ? `<div class="table-wrap"><table class="data" style="margin-top:8px"><thead><tr><th>Date</th><th>Practice</th><th>On own</th><th>With hints</th><th>Show me</th><th>Not right / skipped</th></tr></thead><tbody>${sessions.map((s) =>
          `<tr><td>${date(s.at)}</td><td>${esc(sizeLabel(s.size))} · ${esc(diffLabel(s.difficulty))}</td><td>${s.counts.independent}/${s.total}</td><td>${s.counts.hinted}</td><td>${s.counts.shown}</td><td>${s.counts.incorrect} / ${s.counts.skipped}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No practice sessions yet.</p>'}</div>
       <div class="panel"><h3>Tests</h3>${tests.length ? `<div class="table-wrap"><table class="data" id="sgTests"><thead><tr><th>Date</th><th>Score</th><th>✓ / ✗ / blank</th></tr></thead><tbody>${tests.map((t) =>
          `<tr><td>${date(t.at)}</td><td>${t.pct}%</td><td>${t.correct} / ${t.incorrect} / ${t.unanswered} of ${t.total}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted" id="sgTests">No tests yet.</p>'}</div>
       <div class="panel"><h3>Start over</h3><p class="muted">Erases Subtraction progress on this device. Multiplication and Division progress are kept.</p>
        <div class="btn-row" style="margin-top:8px"><button class="btn btn-danger" id="sgReset">Reset Subtraction progress</button></div></div>`);
    const rb = host.querySelector('#sgReset');
    rb.addEventListener('click', () => {
      if (rb.dataset.armed) { store.reset(); renderProgress(); focusHead(); return; }
      rb.dataset.armed = '1'; rb.textContent = 'Tap again to erase Subtraction progress';
    });
  }

  /* =====================================================================================
     Public API used by the Galaxy router
     ===================================================================================== */
  const api = {
    /** Render a subtraction route into hostEl. r: the resolved route. c: { nav(hash) }. Returns the breadcrumb label. */
    render(r, hostEl, c) {
      host = hostEl; ctx = c;
      if (r.view === 'progress') { renderProgress(); return 'Progress'; }
      if (r.activity === 'teach') { renderTeach(); if (pendingLesson && LESSON_IDS.includes(pendingLesson)) startLesson(pendingLesson); pendingLesson = null; return 'Teach'; }
      if (r.activity === 'practice') { renderPracticeSetup(); return 'Practice'; }
      if (r.activity === 'test') { renderTestSetup(); return 'Test'; }
      return '';
    },
    /** Leave the subtraction screen: destroy every workspace (their listeners go with them). */
    stop() { destroyAll(); lesson = null; },
    menuMeta: () => { const s = store.lessonsSummary(); return { lessonsDone: s.done, lessonsTotal: s.total }; },
    store,
    get liveCount() { return live.length; },
    /** Review hooks for the browser tests and screenshots. */
    _test: { startLesson: (id, step) => { startLesson(id); if (step) { lesson.step = step; renderLesson(); } } }
  };
  root.GalaxySubtraction = api;
})(window);
