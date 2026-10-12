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
  const SB = root.GalaxySubBank, UI = () => root.GalaxyUI;
  const store = root.GalaxySubStore.createSubStore(safeStorage(), { lessonIds: LESSON_IDS, math: M, labTypes: SB.TYPES.map((t) => t.id) });

  /* ---------- mounted workspaces: every instance is kept here and destroyed when the screen changes ---------- */
  let live = [];
  const keep = (inst) => { live.push(inst); return inst; };
  function destroyAll() { live.forEach((i) => { try { i.destroy(); } catch (e) { /* already gone */ } }); live = []; }
  const mount = (el, o) => keep(SK.mount(el, Object.assign({ theme: THEME }, o)));
  /** Destroy one workspace now (when it is replaced on the same screen). */
  const unmount = (inst) => { if (!inst) return; try { inst.destroy(); } catch (e) { /* already gone */ } live = live.filter((x) => x !== inst); };

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

  /** An addition written in columns (the check for a subtraction). */
  const addStack = (a, b, sum) => `<div class="sr-addstack" role="img" aria-label="${fmt(a)} plus ${fmt(b)} equals ${fmt(sum)}"><span>${fmt(a)}</span><span><b aria-hidden="true">+</b> ${fmt(b)}</span><span class="sum">${fmt(sum)}</span></div>`;
  function exampleHTML(ex) {
    if (ex.kind === 'blocks') {
      const parts = blockParts(ex.n), k = Math.min(lesson.part, parts.length - 1);
      return `<div class="sr-blockdemo">${parts[k].html}<p class="sr-say" aria-live="polite">${esc(parts[k].say)}</p></div>${partNav(k, parts.length, 'part')}`;
    }
    if (ex.kind === 'demo') return `<p class="lede">${probHTML(ex)}: press Next to see each step. Back goes to the step before.</p><div class="sr-ws" id="srExWs"></div>`;
    if (ex.kind === 'mistake') { const w = M.buggyWork(ex.top, ex.bottom, ex.bug); return `<p class="lede"><b>${esc(ex.who)}'s work:</b> ${probHTML(ex)} = ${fmt(w.answer)}?</p><div class="sr-ws" id="srExWs"></div><p class="sr-why">${esc(ex.note)}</p>`; }
    if (ex.kind === 'check') {
      return `<p class="lede">${probHTML(ex)} = ${fmt(ex.top - ex.bottom)}. Check it: add the answer to the number you took away.</p><div class="sr-ws" id="srExWs"></div>` +
        addStack(ex.top - ex.bottom, ex.bottom, ex.top) +
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
        <p class="muted" style="margin-top:10px" id="spFirst">Only problems solved without hints or Show me count as “on your own”. ${session.firstTry} of them ${session.firstTry === 1 ? 'was' : 'were'} right on the first try.</p>
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
     MATH THINKING LAB — the shared Galaxy question screen (GalaxyUI.askQuestion) with the subtraction reasoning bank
     (js/sub-bank.js). One try each, no hints before answering, Skip allowed; the kind is named only afterwards.
     Regrouping problems are answered in SubtractKit's test-mode workspace; worked answers use its demo mode.
     ===================================================================================== */
  const LAB_SIZES = [{ n: 10, name: 'Quick Challenge', icon: '🚀' }, { n: 25, name: 'Thinking Workout', icon: '🪐' }, { n: 50, name: 'Big Challenge', icon: '🌌' }];
  const LEVEL_TEXT = { 1: '2- and 3-digit problems with one exchange', 2: 'up to 4 digits, with more exchanges and across one zero (3-digit)', 3: 'up to 4 digits, including across zeros next to each other' };
  /**
   * How big Lab problems may be. "Grows with my child": level 2 after the "More than one exchange" lesson, a 3-digit
   * practice session with 7+ on their own, a test of 70%+, or two Lab sessions of 80%+ at level 1; level 3 after the
   * "Four-digit" and an "across zeros" lesson, a 4-digit/mixed practice session with 7+ on their own, a test of 80%+,
   * or two Lab sessions of 80%+ at level 2. A parent can fix the level in Parent Settings.
   */
  function autoLevel() {
    // Only work done without help counts (S2-03): lessons done on their own, practice sessions of 10+ with at least 70%
    // on their own, tests, and regular Lab challenges (not "Practice my misses").
    const done = (id) => { const l = store.lesson(id); return !!(l && l.indep); };
    const best = Math.max(0, ...store.tests().map((t) => t.pct));
    const prac = (sizes) => store.sessions().some((s) => sizes.includes(s.size) && s.total >= 10 && s.counts.independent / s.total >= 0.7);
    const labOk = (lv) => store.labSessions().filter((s) => s.kind === 'challenge' && s.level === lv && s.total >= 10 && s.pct >= 80).length >= 2;
    let lv = 1;
    if (done('multi') || prac([3]) || best >= 70 || labOk(1)) lv = 2;
    if (lv === 2 && ((done('four') && (done('zero1') || done('zeros2'))) || prac([4, 'mixed']) || best >= 80 || labOk(2))) lv = 3;
    return lv;
  }
  const labLevel = () => { const s = store.settings().lab.level; return s === 'auto' ? autoLevel() : s; };
  let labQs = null;   // the questions of the active Lab session (rebuilt from its seed)
  const labQuestions = (a) => SB.makeSession({ seed: a.seed, count: a.count, level: a.level, types: a.types });

  function renderLabSetup() {
    const a = store.activeLab(), lv = labLevel(), auto = store.settings().lab.level === 'auto';
    const answered = a ? Object.keys(a.answers).length : 0;
    paint(head('subLabTitle', '🧪 Math Thinking Lab') +
      `<p class="screen-sub">Different problems. Different ways to think.</p>
       ${a ? `<div class="panel cream"><div class="panel-head"><h3>Keep going</h3><span class="badge">${answered} of ${a.count} answered</span></div>
          <div class="btn-row"><button class="btn btn-go btn-lg" id="labContinue">▶ Continue the challenge</button><button class="btn btn-secondary" id="labDrop">Start a new one</button></div></div>` : ''}
       <div class="lab-sizes">${LAB_SIZES.map((s) => `<button class="lab-size" data-size="${s.n}"><span class="ls-icon" aria-hidden="true">${s.icon}</span><span class="ls-n">${s.n}</span><span class="ls-unit">problems</span><span class="ls-name">${s.name}</span></button>`).join('')}</div>
       <div class="panel ice lab-info"><p><b>No timer.</b> One try for each problem, then you'll see how to think about it.</p>
         <p>Twelve kinds of thinking: regrouping, missing numbers, checking with addition, estimating, finding mistakes, comparing strategies and more.</p>
         <p class="muted" id="labLevel">Your problems: ${esc(LEVEL_TEXT[lv])}${auto ? ' (they grow as you learn)' : ' (set by a grown-up)'}.</p></div>`);
    host.querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', () => startLab({ count: +b.dataset.size })));
    if (a) {
      host.querySelector('#labContinue').addEventListener('click', () => renderLabQ());
      host.querySelector('#labDrop').addEventListener('click', () => { store.quitLab(); renderLabSetup(); focusHead(); });
    }
  }
  function startLab({ count, kind = 'challenge', types = null, level = null }) {
    store.startLab({ seed: newSeed(), count, level: level || labLevel(), kind, types });
    labQs = null;
    renderLabQ();
  }
  /** Mount a SubtractKit model of the problem in the picture area (view mode: someone's work, or the problem only). */
  function mountModel(el, q) {
    const s = q.sk, box = document.createElement('div');
    box.className = 'sr-ws sr-model'; el.appendChild(box);
    mount(box, { top: s.top, bottom: s.bottom, mode: 'view', work: s.work || { ann: {}, d: [] }, answer: s.answer !== false && !!s.work, caption: s.caption, answerLabel: s.caption ? s.caption.replace(/work$/, 'answer') : undefined });
  }
  /** "See it worked": SubtractKit's own demo of the problem, step by step (after answering only). */
  function seeItWorked(container, q, label = '▶ See it worked') {
    if (!q.top || !q.bottom) return;
    const wrap = document.createElement('div'); wrap.className = 'sr-seeit';
    wrap.innerHTML = `<button type="button" class="btn btn-secondary btn-sm" data-seeit>${label}</button><div class="sr-ws" hidden></div>`;
    container.appendChild(wrap);
    wrap.querySelector('[data-seeit]').addEventListener('click', (e) => {
      const box = wrap.querySelector('.sr-ws');
      if (!box.childElementCount) mount(box, { top: q.top, bottom: q.bottom, mode: 'demo', caption: `Worked: ${problemText(q)}` });
      box.hidden = !box.hidden; e.currentTarget.textContent = box.hidden ? label : '▲ Hide the worked answer';
    });
  }
  function renderLabQ() {
    const a = store.activeLab();
    if (!a) { renderLabSetup(); focusHead(); return; }
    if (!labQs || labQs.seed !== a.seed) labQs = { seed: a.seed, qs: labQuestions(a) };
    const qs = labQs.qs, n = qs.length;
    const i = qs.findIndex((_, k) => !a.answers[k]);
    if (i < 0 || !qs.length) { finishLab(); return; }
    const q = qs[i], last = qs.slice(i + 1).every((_, k) => a.answers[i + 1 + k]);
    const right = Object.values(a.answers).filter((x) => x.correct).length;
    paint(`<div class="panel workspace">${UI().actHead({ id: 'subLabQ', title: '🧪 Math Thinking Lab', count: `<span class="act-count" id="lCount">Problem ${i + 1} of ${n}</span>`,
        right: `<span class="muted" id="lScore">${right} right so far</span>`, exit: '<button class="btn btn-ghost-light" id="labExit">✕ Exit</button>', now: i, max: n, label: 'Challenge progress' })}
        <div class="feedback info lab-leave" id="labLeave" hidden><strong>Leave the challenge?</strong> Your place is saved, so you can come back.
          <div class="btn-row" style="margin-top:8px"><button class="btn btn-primary" id="labFinishNow">Finish now and see my report</button><button class="btn btn-secondary" id="labStay">Keep going</button><button class="btn btn-secondary" data-nav="${MENU}" id="labQuit">Leave for now</button></div></div>
        <div id="lQ" class="q-host"></div></div>`);
    let wsInst = null;
    UI().askQuestion(host.querySelector('#lQ'), q, { tries: 1, allowHint: false, allowSkip: true, revealType: true, hideHintSub: true, checkLabel: 'Submit', nextLabel: last ? 'See my report →' : 'Next problem →',
      mountVisual: mountModel,
      mountAnswer: (el, qq) => {
        wsInst = mount(el, { top: qq.top, bottom: qq.bottom, mode: 'test' });
        return { value: () => { const r = wsInst.result(); return r && r.status !== 'empty' && r.value !== null && r.value !== undefined ? String(r.value) : ''; } };
      },
      onDone: (r) => { store.recordLabAnswer(i, { typeId: q.typeId, correct: !r.skipped && !!r.firstTry, skipped: !!r.skipped }); },
      onFinished: (el) => {
        if (wsInst) {   // lock the child's work: the same grid, read-only
          const st = wsInst.getState(), box = el.querySelector('#qWs');
          unmount(wsInst); wsInst = null;
          box.innerHTML = ''; const v = document.createElement('div'); box.appendChild(v);
          mount(v, { top: q.top, bottom: q.bottom, mode: 'view', work: { ann: st.ann, d: st.d }, caption: 'Your work', answerLabel: 'Your answer' });
        }
        seeItWorked(el.querySelector('.qa-feedback'), q);
      },
      onNext: () => { if (store.activeLab() && Object.keys(store.activeLab().answers).length >= n) finishLab(); else { renderLabQ(); focusHead(); } } });
    const leave = host.querySelector('#labLeave');
    host.querySelector('#labExit').addEventListener('click', () => { host.querySelector('#labFinishNow').hidden = !Object.keys(store.activeLab().answers).length; leave.hidden = false; host.querySelector('#labStay').focus(); });
    host.querySelector('#labStay').addEventListener('click', () => { leave.hidden = true; });
    host.querySelector('#labFinishNow').addEventListener('click', () => finishLab());
  }
  function finishLab() {
    const a = store.activeLab();
    if (!a) { renderLabSetup(); return; }
    const qs = labQs && labQs.seed === a.seed ? labQs.qs : labQuestions(a);
    const rows = Object.keys(a.answers).map(Number).sort((x, y) => x - y).map((k) => ({ q: qs[k], a: a.answers[k] })).filter((x) => x.q);
    const s = store.finishLab();
    labQs = null;
    if (!s) { renderLabSetup(); focusHead(); return; }
    const missed = rows.filter((x) => !x.a.correct);
    const byType = {};
    rows.forEach((x) => { const t = (byType[x.q.typeId] = byType[x.q.typeId] || { c: 0, t: 0 }); t.t++; if (x.a.correct) t.c++; });
    const order = SB.TYPES.map((t) => t.id).filter((id) => byType[id]);
    const recs = [...new Set(missed.map((x) => x.q.lesson))].slice(0, 3);
    paint(head('subLabDoneTitle', '🧪 Lab report') +
      `<div class="panel"><div class="results-top"><div><div class="pct" id="ldPct">${s.pct}%</div><p class="center muted">${s.correct} of ${s.total} right</p></div>
          <div class="tally"><div class="c"><b id="ldC">${s.correct}</b>correct</div><div class="i"><b id="ldI">${s.incorrect}</b>incorrect</div><div class="u"><b id="ldU">${s.skipped}</b>skipped</div></div></div>
        <p class="center" style="margin-top:10px">${s.pct >= 90 ? 'Brilliant thinking!' : s.pct >= 70 ? 'Great thinking. Look at the problems below to grow even more.' : 'Good effort. Every problem you look at again makes your brain stronger.'}</p></div>
       <div class="panel"><h3>How you did with each kind of problem</h3><div class="table-wrap"><table class="data" id="ldTypes"><thead><tr><th>Kind of problem</th><th>Right</th></tr></thead><tbody>
         ${order.map((id) => `<tr><td>${esc(SB.TYPE[id].name)}</td><td>${byType[id].c} of ${byType[id].t}</td></tr>`).join('')}</tbody></table></div></div>
       ${missed.length ? `<div class="panel cream"><h3>Problems to look at again</h3><ul class="missed-list" id="ldMissed">${missed.map((x, k) => `<li><details data-m="${k}"><summary><span class="badge type">${esc(x.q.typeName)}</span> ${esc(x.q.prompt)} → <b>${esc(typeof x.q.answer === 'number' ? fmt(x.q.answer) : x.q.answer)}</b>${x.a.skipped ? ' <span class="muted">(skipped)</span>' : ''}</summary>
           <p style="margin-top:6px">${esc(x.q.explain.text)}</p>${x.q.explain.lines ? `<ol class="sk-steps">${x.q.explain.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ol>` : ''}<div class="sr-review-host"></div></details></li>`).join('')}</ul></div>` : ''}
       ${recs.length ? `<div class="panel ice"><h3>Recommended lessons</h3><div class="btn-row" style="margin-top:8px" id="ldRecs">${recs.map((id) => `<button class="btn btn-secondary" data-rec="${id}">💡 ${esc(lessonOf(id).title)}</button>`).join('')}</div></div>` : ''}
       <div class="btn-row center" style="margin-top:16px">
         ${missed.length ? '<button class="btn btn-primary" id="ldMisses">Practice my misses</button>' : ''}
         <button class="btn btn-go btn-lg" id="ldAgain">Start another challenge</button>
         <button class="btn btn-ghost" data-nav="${MENU}">⬅ Subtraction</button></div>`);
    host.querySelectorAll('details[data-m]').forEach((d) => d.addEventListener('toggle', () => { const h = d.querySelector('.sr-review-host'); if (d.open && !h.childElementCount) seeItWorked(h, missed[+d.dataset.m].q); }));
    host.querySelectorAll('[data-rec]').forEach((b) => b.addEventListener('click', () => { pendingLesson = b.dataset.rec; ctx.nav('#/subtraction/teach'); }));
    if (host.querySelector('#ldMisses')) host.querySelector('#ldMisses').addEventListener('click', () => {
      // New problems of the same kinds that were missed (never the same numbers again).
      startLab({ count: Math.min(10, Math.max(3, missed.length)), kind: 'misses', types: [...new Set(missed.map((x) => x.q.typeId))], level: s.level }); focusHead();
    });
    host.querySelector('#ldAgain').addEventListener('click', () => { renderLabSetup(); focusHead(); });
    focusHead();
  }

  /* =====================================================================================
     FLASHCARDS — Galaxy's flashcard screen for subtraction facts. The answer shows after a delay suited to the size of
     the numbers (or on tap); the next card comes only when the child is ready (no time pressure). "See the regrouping"
     opens SubtractKit's demo mode. Records exposure and the child's own "I knew it / Not yet", never mastery.
     ===================================================================================== */
  const FLASH_AUTO = { 2: 8, 3: 12, 4: 15 };   // seconds before the answer shows, by number of digits (Parent Settings can change it)
  const FLASH_MIX = { gentle: ['none', 'easy'], standard: ['none', 'easy', 'medium'], challenge: ['easy', 'medium', 'hard'] };
  const FLASH_SIZES = [{ v: 2, label: '2-digit' }, { v: 3, label: '3-digit' }, { v: 4, label: '4-digit' }, { v: 'mixed', label: '🔀 Mixed' }];
  let fc = null, fcTimers = new Set(), fcKeys = null;
  const fcAfter = (fn, ms) => { const id = setTimeout(() => { fcTimers.delete(id); fn(); }, ms); fcTimers.add(id); return id; };
  function fcStopTimers() { fcTimers.forEach((id) => clearTimeout(id)); fcTimers = new Set(); }
  /** A deck of subtraction facts from SubtractKit's generator: the chosen size, a sensible mix of difficulties, no repeats. */
  function flashDeck(size, n, mix, seed) {
    const r = M.rng(seed), avoid = new Set(), deck = [];
    for (let k = 0; deck.length < n && k < n * 6; k++) {
      const sz = size === 'mixed' ? [2, 3, 4][k % 3] : size;
      const diffs = FLASH_MIX[mix].filter((d) => d === 'none' || M.supported(sz).includes(d));
      const d = diffs[Math.floor(r() * diffs.length)], spec = { size: sz, difficulty: d, avoid };   // independent of size (S2-02)
      const q = M.generateOne(r, spec);
      if (q && q.top !== q.bottom) deck.push({ top: q.top, bottom: q.bottom });
    }
    return M.shuffle(r, deck);
  }
  const revealFor = (card) => { const s = store.settings().flash.reveal; return s === 'auto' ? FLASH_AUTO[M.lengthOf(card.top)] : s; };
  function renderFlashSetup() {
    const f = store.settings().flash;
    paint(head('subFlashTitle', '🃏 Flashcards <span class="h-sub">Help me remember</span>') +
      `<div class="panel start-panel fc-setup"><h3 class="center">Which numbers?</h3><p class="muted center">Tap one to start.</p>
        <div class="table-pick sr-fc-pick" id="sfPick">${FLASH_SIZES.map((s) => `<button type="button" data-fsize="${s.v}" aria-label="Start ${s.v === 'mixed' ? 'mixed sizes' : s.label + ' subtraction'}">${s.label}</button>`).join('')}</div>
        <p class="muted center" id="sfInfo">${f.reveal === 0 ? 'Tap the card to see each answer.' : f.reveal === 'auto' ? 'Each answer shows after a while: longer for bigger numbers (8, 12 or 15 seconds). Tap the card to see it sooner.' : `Each answer shows after ${f.reveal} seconds. Tap the card to see it sooner.`} The next card comes when you are ready.</p></div>
       <p class="grownup-note">Grown-ups: timing and kinds of problems are in <a href="${MENU}/settings" data-nav="${MENU}/settings">Parent Settings</a>.</p>`);
    host.querySelector('#sfPick').addEventListener('click', (e) => { const b = e.target.closest('[data-fsize]'); if (!b) return; const v = b.dataset.fsize; startFlash(v === 'mixed' ? 'mixed' : +v); });
  }
  function startFlash(size) {
    const f = store.settings().flash;
    store.setSettings({ flash: { size } });
    fcStopTimers();
    fc = { size, deck: flashDeck(size, f.cards, f.mix, newSeed()), i: 0, flipped: false, paused: false, startedAt: Date.now(), activeMs: 0, resumedAt: Date.now(), knew: 0, notYet: 0, shown: 0, seen: 1, deadline: 0, left: 0, showing: false };
    const title = size === 'mixed' ? 'Mixed' : `${size}-digit`;
    paint(`<div class="panel workspace fc-space sr-fc">${UI().actHead({ id: 'subFlashQ', title: `🃏 ${title} subtraction`, count: '<span class="act-count" id="sfCount"></span>', right: '', exit: `<button class="btn btn-ghost-light" id="sfExit">✕ Exit</button>`, now: 0, max: fc.deck.length, label: 'Cards', spanId: 'sfBar' })}
        <div class="fc-stage"><button class="fc" id="sfCard" aria-label=""><div class="fc-face fc-front" id="sfFront"></div><div class="fc-face fc-back" id="sfBack"></div></button></div>
        <p class="fc-status" id="sfStatus" aria-live="polite"></p>
        <div class="fc-controls-row" id="sfMain"><button class="btn btn-primary btn-lg" id="sfFlip">👀 Show answer</button><button class="btn btn-secondary btn-lg" id="sfPause">⏸ Pause</button><button class="btn btn-ghost-light btn-lg" id="sfEnd">✓ I'm done</button></div>
        <div class="fc-controls-row sr-fc-after" id="sfAfter" hidden><button class="btn btn-ok btn-lg" data-conf="knew">😊 I knew it</button><button class="btn btn-secondary btn-lg" data-conf="notYet">🤔 Not yet</button><button class="btn btn-secondary btn-lg" id="sfSee">🔍 See the regrouping</button><button class="btn btn-primary btn-lg" id="sfNext">Next card ➜</button></div>
        <div class="sr-fc-demo" id="sfDemo" hidden><div class="sr-ws" id="sfDemoWs"></div><button class="btn btn-secondary" id="sfDemoClose">Back to the cards</button></div></div>`);
    host.querySelector('#sfCard').addEventListener('click', () => flashFlip());
    host.querySelector('#sfFlip').addEventListener('click', () => flashFlip());
    host.querySelector('#sfPause').addEventListener('click', flashPause);
    host.querySelector('#sfEnd').addEventListener('click', flashFinish);
    host.querySelector('#sfExit').addEventListener('click', flashFinish);
    host.querySelector('#sfNext').addEventListener('click', () => flashNext());
    host.querySelectorAll('[data-conf]').forEach((b) => b.addEventListener('click', () => flashNext(b.dataset.conf)));
    host.querySelector('#sfSee').addEventListener('click', flashSee);
    host.querySelector('#sfDemoClose').addEventListener('click', flashSeeClose);
    fcKeys = (e) => {
      if (!fc || e.ctrlKey || e.metaKey || e.altKey || (e.target && e.target.closest && e.target.closest('.sk'))) return;
      if (e.key === ' ' && !(e.target.closest && e.target.closest('button'))) { e.preventDefault(); flashFlip(); }
      else if (e.key === 'ArrowRight' && fc.flipped) { e.preventDefault(); flashNext(); }
      else if (e.key === 'p' || e.key === 'P') flashPause();
    };
    document.addEventListener('keydown', fcKeys);
    flashShow();
  }
  const cardFace = (c) => {
    const w = Math.max(String(c.top).length, String(c.bottom).length) + 1;
    return `<div class="sr-fc-vert" style="--w:${w}ch" aria-hidden="true"><div>${fmt(c.top)}</div><div><b>−</b>${fmt(c.bottom)}</div></div>`;
  };
  function flashShow() {
    const c = fc.deck[fc.i];
    fc.flipped = false; fc.showing = false;
    host.querySelector('#sfCard').classList.remove('flip');
    host.querySelector('#sfFront').innerHTML = cardFace(c);
    host.querySelector('#sfBack').innerHTML = `<div><span class="fc-ans">${fmt(c.top - c.bottom)}</span><span class="fc-eq">${fmt(c.top)} − ${fmt(c.bottom)} = ${fmt(c.top - c.bottom)}</span></div>`;
    host.querySelector('#sfCard').setAttribute('aria-label', `Flash card: ${fmt(c.top)} minus ${fmt(c.bottom)}. Tap to see the answer.`);
    host.querySelector('#sfCount').textContent = `Card ${fc.i + 1} of ${fc.deck.length}`;
    host.querySelector('#sfBar').style.width = `${(fc.i / fc.deck.length) * 100}%`;
    host.querySelector('#sfMain').hidden = false; host.querySelector('#sfAfter').hidden = true;
    host.querySelector('#sfSee').textContent = M.classify(c.top, c.bottom).exchanges ? '🔍 See the regrouping' : '🔍 See it worked';
    fc.left = revealFor(c) * 1000;
    flashSchedule();
    flashStatus();
  }
  function flashStatus() {
    const s = host.querySelector('#sfStatus'), c = fc.deck[fc.i];
    s.textContent = fc.paused ? 'Paused' : fc.flipped ? 'How did it go? Then go on when you are ready.' : revealFor(c) ? `Work it out. The answer shows in ${revealFor(c)} seconds, or tap the card.` : 'Work it out, then tap the card.';
  }
  function flashSchedule() {
    fcStopTimers();
    if (fc.flipped || fc.paused || !revealFor(fc.deck[fc.i])) return;
    fc.deadline = Date.now() + fc.left;
    fcAfter(() => flashSetFlip(true), fc.left);
  }
  function flashSetFlip(on) {
    fc.flipped = on; fcStopTimers();
    const c = fc.deck[fc.i];
    host.querySelector('#sfCard').classList.toggle('flip', on);
    host.querySelector('#sfCard').setAttribute('aria-label', on ? `Answer: ${fmt(c.top)} minus ${fmt(c.bottom)} equals ${fmt(c.top - c.bottom)}` : `Flash card: ${fmt(c.top)} minus ${fmt(c.bottom)}. Tap to see the answer.`);
    host.querySelector('#sfMain').hidden = on; host.querySelector('#sfAfter').hidden = !on;
    flashStatus();
    if (on) { const k = host.querySelector('[data-conf="knew"]'); if (k) k.focus({ preventScroll: true }); }
  }
  function flashFlip() { if (!fc || fc.paused || fc.showing) return; if (!fc.flipped) flashSetFlip(true); }
  function flashNext(conf) {
    if (!fc || !fc.flipped || fc.paused) return;
    if (conf === 'knew') fc.knew++; else if (conf === 'notYet') fc.notYet++;
    if (fc.i + 1 >= fc.deck.length) { flashFinish(); return; }
    fc.i++; fc.seen++;
    flashShow();
    host.querySelector('#sfFlip').focus({ preventScroll: true });
  }
  function flashPause() {
    if (!fc || fc.showing) return;
    if (!fc.paused) { fc.activeMs += Date.now() - fc.resumedAt; if (!fc.flipped && fc.deadline) fc.left = Math.max(0, fc.deadline - Date.now()); fcStopTimers(); fc.paused = true; }
    else { fc.paused = false; fc.resumedAt = Date.now(); flashSchedule(); }
    host.querySelector('.sr-fc').classList.toggle('paused', fc.paused);
    host.querySelector('#sfPause').textContent = fc.paused ? '▶ Resume' : '⏸ Pause';
    host.querySelector('#sfFlip').disabled = fc.paused;
    host.querySelectorAll('#sfAfter button').forEach((x) => { x.disabled = fc.paused; });
    flashStatus();
  }
  /** SubtractKit's demo of this card's subtraction (supplemental, after the answer shows). */
  function flashSee() {
    if (!fc || !fc.flipped) return;
    const c = fc.deck[fc.i], box = host.querySelector('#sfDemoWs');
    fc.shown++; fc.showing = true;
    box.innerHTML = ''; const v = document.createElement('div'); box.appendChild(v);
    fc.demo = mount(v, { top: c.top, bottom: c.bottom, mode: 'demo', caption: `${fmt(c.top)} − ${fmt(c.bottom)}: ${M.classify(c.top, c.bottom).exchanges ? 'see the regrouping' : 'no regrouping needed'}` });
    host.querySelector('#sfDemo').hidden = false; host.querySelector('#sfAfter').hidden = true;
    const n = host.querySelector('#sfDemo [data-act="next"]'); if (n) n.focus({ preventScroll: true });
  }
  function flashSeeClose() {
    fc.showing = false;
    unmount(fc.demo); fc.demo = null;
    host.querySelector('#sfDemo').hidden = true; host.querySelector('#sfAfter').hidden = false;
    host.querySelector('#sfDemoWs').innerHTML = '';
    host.querySelector('[data-conf="knew"]').focus({ preventScroll: true });
  }
  function flashFinish() {
    if (!fc) return;
    const s = fc; fc = null; fcStopTimers();
    if (fcKeys) { document.removeEventListener('keydown', fcKeys); fcKeys = null; }
    const seconds = Math.round((s.activeMs + (s.paused ? 0 : Date.now() - s.resumedAt)) / 1000);
    store.recordFlash({ size: s.size, cards: s.seen, seconds, knew: s.knew, notYet: s.notYet, shown: s.shown });
    const mins = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    paint(head('subFlashDoneTitle', '🃏 Great flying!') +
      `<div class="panel center"><p class="stars" aria-hidden="true">🚀⭐🚀</p>
        <div class="stats" style="margin-top:8px"><div class="stat"><b id="sfdSeen">${s.seen}</b>cards seen</div><div class="stat"><b>${mins}</b>time practiced</div><div class="stat"><b id="sfdKnew">${s.knew}</b>“I knew it”</div><div class="stat"><b id="sfdNot">${s.notYet}</b>“Not yet”</div></div>
        <p class="muted" style="margin-top:12px">Flashcards are practice. To show what you have mastered, take the Test.</p>
        <div class="btn-row center" style="margin-top:16px"><button class="btn btn-go btn-lg" id="sfdAgain">Flashcards again</button>
          <button class="btn btn-secondary" id="sfdPick">Pick other numbers</button><button class="btn btn-secondary" data-nav="${MENU}">⬅ Subtraction</button></div></div>`);
    host.querySelector('#sfdAgain').addEventListener('click', () => { startFlash(s.size); focusHead(); });
    host.querySelector('#sfdPick').addEventListener('click', () => { renderFlashSetup(); focusHead(); });
    focusHead();
  }

  /* =====================================================================================
     PARENT SETTINGS (Subtraction only; saved in galaxy-math.subtraction, never in the other subjects' settings)
     ===================================================================================== */
  function renderSettings() {
    const S = store.settings();
    const seg = (key, legend, options, value) => `<fieldset class="field"><legend>${legend}</legend><div class="seg" data-set="${key}">${options.map((o) => `<button type="button" data-v="${o.v}" aria-pressed="${String(String(value) === String(o.v))}">${esc(o.label)}</button>`).join('')}</div></fieldset>`;
    paint(head('subSettingsTitle', '⚙️ Parent Settings · Subtraction') +
      `<p class="settings-note">For grown-ups. Settings are saved on this device as soon as you tap them. They are <b>not locked</b>, so a child could change them.</p>
       <div class="settings-grid">
        <section class="panel settings-card"><h3>🃏 Flashcards</h3>
          <div class="set-row">${seg('flash.reveal', 'Show the answer after', [{ v: 'auto', label: 'Auto by size' }, { v: 0, label: 'Tap only' }, { v: 5, label: '5 s' }, { v: 10, label: '10 s' }, { v: 15, label: '15 s' }, { v: 20, label: '20 s' }, { v: 30, label: '30 s' }], S.flash.reveal)}
            <p class="set-help">Auto: 8 seconds for 2-digit, 12 for 3-digit and 15 for 4-digit numbers. Cards never move on by themselves, and a slow answer is never counted as wrong.</p></div>
          <div class="set-row">${seg('flash.cards', 'Cards per session', [{ v: 10, label: '10' }, { v: 20, label: '20' }, { v: 30, label: '30' }], S.flash.cards)}</div>
          <div class="set-row">${seg('flash.mix', 'Kinds of problems', [{ v: 'gentle', label: 'Gentle' }, { v: 'standard', label: 'Standard' }, { v: 'challenge', label: 'Challenge' }], S.flash.mix)}
            <p class="set-help"><b>Gentle:</b> no regrouping or one exchange. <b>Standard:</b> adds two or more exchanges. <b>Challenge:</b> always regrouping, including across zeros. 2-digit cards only use no regrouping or one exchange.</p></div></section>
        <section class="panel settings-card"><h3>🧪 Math Thinking Lab</h3>
          <div class="set-row">${seg('lab.level', 'Problem size', [{ v: 'auto', label: 'Grow with my child' }, { v: 1, label: 'Small' }, { v: 2, label: 'Medium' }, { v: 3, label: 'Full' }], S.lab.level)}
            <p class="set-help" id="ssLevel">Grow with my child: now <b>${esc(LEVEL_TEXT[autoLevel()])}</b>. It moves up after the matching lessons, strong Practice or Test results, or two strong Lab challenges. Small: ${esc(LEVEL_TEXT[1])}. Medium: ${esc(LEVEL_TEXT[2])}. Full: ${esc(LEVEL_TEXT[3])}.</p></div>
          <p class="set-help">The Lab has no timer and no hints before answering. Its results are kept apart from Practice and the Test.</p></section>
       </div>`);
    host.querySelectorAll('.seg[data-set]').forEach((s) => s.addEventListener('click', (e) => {
      const b = e.target.closest('[data-v]'); if (!b) return;
      const [grp, key] = s.dataset.set.split('.'), raw = b.dataset.v, v = /^\d+$/.test(raw) ? Number(raw) : raw;
      store.setSettings({ [grp]: { [key]: v } });
      s.querySelectorAll('[data-v]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }));
  }

  /* =====================================================================================
     PROGRESS (grown-ups)
     ===================================================================================== */
  function labPanel() {
    const ls = store.labSessions().slice(-8).reverse(), bt = store.labByType(), date = (s) => new Date(s).toLocaleDateString();
    const kinds = SB.TYPES.filter((t) => bt[t.id]);
    return `<div class="panel"><h3>Math Thinking Lab</h3><p class="muted">Reasoning challenges: no hints, one try each. Kept apart from Practice and the Test.</p>
      ${ls.length ? `<div class="table-wrap"><table class="data" id="sgLab" style="margin-top:8px"><thead><tr><th>Date</th><th>Problems</th><th>Score</th><th>✓ / ✗ / skipped</th></tr></thead><tbody>${ls.map((s) =>
        `<tr><td>${date(s.at)}</td><td>${s.total}${s.kind === 'misses' ? ' (misses)' : ''}</td><td>${s.pct}%</td><td>${s.correct} / ${s.incorrect} / ${s.skipped}</td></tr>`).join('')}</tbody></table></div>
        <div class="table-wrap"><table class="data" id="sgLabKinds" style="margin-top:8px"><thead><tr><th>Kind of problem</th><th>Right</th></tr></thead><tbody>${kinds.map((t) => `<tr><td>${esc(t.name)}</td><td>${bt[t.id].c} of ${bt[t.id].t} (${Math.round((100 * bt[t.id].c) / bt[t.id].t)}%)</td></tr>`).join('')}</tbody></table></div>`
        : '<p class="muted" id="sgLab">No Lab challenges yet.</p>'}</div>`;
  }
  function flashPanel() {
    const t = store.flashTotals();
    return `<div class="panel"><h3>Flashcards</h3>${t.sessions ? `<div class="stats" id="sgFlash"><div class="stat"><b>${t.cards}</b>cards seen</div><div class="stat"><b>${Math.floor(t.seconds / 60)}:${String(t.seconds % 60).padStart(2, '0')}</b>time practiced</div><div class="stat"><b>${t.knew}</b>“I knew it”</div><div class="stat"><b>${t.notYet}</b>“Not yet”</div></div>` : '<p class="muted" id="sgFlash">No flashcards yet.</p>'}
      <p class="muted" style="margin-top:8px">Flashcards show practice and how sure your child felt. They are not counted as mastery; the Test is.</p></div>`;
  }
  function renderProgress() {
    const ls = store.lessonsSummary(), tot = store.practiceTotals(), sessions = store.sessions().slice(-8).reverse(), tests = store.tests().slice(-8).reverse();
    const date = (s) => new Date(s).toLocaleDateString();
    const all = Object.values(tot).reduce((a, b) => a + b, 0);
    paint(head('subProgressTitle', '📊 Subtraction progress') +
      `<div class="panel"><h3>Lessons</h3><p class="lede"><b id="sgLessons">${ls.done}/${ls.total}</b> lessons done${ls.done > ls.indep ? ` · ${ls.done - ls.indep} only with help so far` : ''}.</p>
        <ol class="sr-list">${C.learn.map((l) => { const r = store.lesson(l.id); return `<li>${esc(l.title)}: ${r ? (r.indep ? '✓ done on own' : 'done with help') : 'not yet'}</li>`; }).join('')}</ol></div>
       <div class="panel"><h3>Practice (${all} problems)</h3><div class="stats" id="sgPractice">${root.GalaxySubStore.OUTCOMES.map((o) => `<div class="stat"><b data-o="${o}">${tot[o]}</b>${esc(OUT_LABEL[o])}</div>`).join('')}</div>
        <p class="muted" style="margin-top:8px">Show me and hints are recorded as help and never counted as “on your own”.</p>
        ${sessions.length ? `<div class="table-wrap"><table class="data" style="margin-top:8px"><thead><tr><th>Date</th><th>Practice</th><th>On own (first try)</th><th>With hints</th><th>Show me</th><th>Not right / skipped</th></tr></thead><tbody>${sessions.map((s) =>
          `<tr><td>${date(s.at)}</td><td>${esc(sizeLabel(s.size))} · ${esc(diffLabel(s.difficulty))}</td><td>${s.counts.independent}/${s.total} (${s.firstTry || 0})</td><td>${s.counts.hinted}</td><td>${s.counts.shown}</td><td>${s.counts.incorrect} / ${s.counts.skipped}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No practice sessions yet.</p>'}</div>
       ${labPanel()}
       ${flashPanel()}
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
      if (r.view === 'settings') { renderSettings(); return 'Parent Settings'; }
      if (r.activity === 'lab') { renderLabSetup(); return 'Math Thinking Lab'; }
      if (r.activity === 'flashcards') { renderFlashSetup(); return 'Flashcards'; }
      if (r.activity === 'teach') { renderTeach(); if (pendingLesson && LESSON_IDS.includes(pendingLesson)) startLesson(pendingLesson); pendingLesson = null; return 'Teach'; }
      if (r.activity === 'practice') { renderPracticeSetup(); return 'Practice'; }
      if (r.activity === 'test') { renderTestSetup(); return 'Test'; }
      return '';
    },
    /** Leave the subtraction screen: destroy every workspace (their listeners go with them). */
    stop() {
      destroyAll(); lesson = null; labQs = null;
      if (fc) { const s = fc; fc = null; store.recordFlash({ size: s.size, cards: s.seen, seconds: Math.round((s.activeMs + (s.paused ? 0 : Date.now() - s.resumedAt)) / 1000), knew: s.knew, notYet: s.notYet, shown: s.shown }); }
      fcStopTimers();
      if (fcKeys) { document.removeEventListener('keydown', fcKeys); fcKeys = null; }
    },
    get timerCount() { return fcTimers.size; },
    menuMeta: () => { const s = store.lessonsSummary(); return { lessonsDone: s.done, lessonsTotal: s.total }; },
    store,
    get liveCount() { return live.length; },
    /** Review hooks for the browser tests and screenshots. */
    _test: { startLesson: (id, step) => { startLesson(id); if (step) { lesson.step = step; renderLesson(); } } }
  };
  root.GalaxySubtraction = api;
})(window);
