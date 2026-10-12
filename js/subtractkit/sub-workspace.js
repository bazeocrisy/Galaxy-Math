/*
 * SubtractKit.mount(el, options): a vertical subtraction workspace with regrouping (exchanges).
 * Reusable: no host routes, lesson ids, storage keys or globals except window.SubtractKit. Needs sub-math.js first and
 * assets/css/subtract-workspace.css. Modes: 'demo' (step through the standard method), 'guided' (the child decides each
 * step), 'independent' (free regroup marks, answer, Check, hints), 'test' (marks and answer only — no Check, hints or
 * feedback), 'view' (read-only: someone's work, or a solution).
 * Rendering: a skeleton is built once (grid host, toolbar, coach panel, one live region). A regroup mark, Undo or Clear
 * patches only the affected cells, so the box or button the child is moving to is never replaced (review SR-D01);
 * every rebuild names where focus goes next (SR-D05).
 * API, events and state format: docs/supplemental/subtract-regrouping/INTEGRATION.md.
 */
(function (root) {
  'use strict';
  const SK = (root.SubtractKit = root.SubtractKit || {});
  const M = SK.math;
  if (!M) throw new Error('SubtractKit: load sub-math.js before sub-workspace.js');
  const P = M.PLACES;
  const KEYS = ['O', 'T', 'H', 'Th'];
  let counter = 0;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /** Every word the component says. Hosts may replace any of them with options.text. */
  const TEXT = {
    working: (i) => `Working on the ${P[i].name}`,
    needsQ: (i) => `Does the ${P[i].name} column need regrouping?`,
    needsYes: (t, b) => `Yes. ${t} is less than ${b}, so you can't take ${b} away yet.`,
    needsNo: (t, b) => `No. ${t} is enough to take away ${b}.`,
    needsWrongNo: (i, t, b) => `Look again at the ${P[i].name}: the top has ${t} and you need to take away ${b}.`,
    needsAltYes: (i, t, b) => `You could exchange, and the value would stay the same, but you don't need to: ${t} is enough to take away ${b}. Choose No.`,
    supplierQ: 'Which place can give?',
    supplierZero: (k) => `The ${P[k].name} place has 0, so it has nothing to give. Look further left.`,
    supplierFar: (k, best) => `That could work too, but it takes more exchanges than you need. Take from the nearest place that has something: the ${P[best].name}.`,
    supplierOk: (k) => `Yes. The ${P[k].name} can give.`,
    exchangeQ: (from, to) => `Exchange 1 ${P[from].one} for 10 ${P[to].name}. Write the new ${P[from].name} and the new ${P[to].name} above the top number.`,
    exchangeKept: (from, to, after) => `Now: ${M.describe(after)}. ${valueLine(after)}`,
    exchangeNoReduce: (from, had) => `The ${P[from].name} still shows ${had}. It gives 1 ${P[from].one} away, so it must go down by 1 (${had} − 1).`,
    exchangeGiver: (from, had) => `The ${P[from].name} had ${had}. It gives 1 ${P[from].one} away, so there is 1 fewer: ${had} − 1.`,
    exchangeGetter: (to, had) => `The ${P[to].name} had ${had}. It gets 10 more ${P[to].name} (1 ${P[to + 1].one} = 10 ${P[to].name}): ${had} + 10.`,
    exchangeEmpty: 'Write both new values above the top number, then check.',
    digitQ: (i, t, b) => `${cap(P[i].name)}: ${t} − ${b} = ? Write the digit in the ${P[i].name} answer box.`,
    digitOk: (i, t, b, d) => `${cap(P[i].name)}: ${t} − ${b} = ${d}.`,
    digitOriginal: (i, orig, now) => `The ${P[i].name} changed when it gave 1 away. Use ${now}, not the original ${orig}.`,
    digitSwap: (i, t, b, now) => `You can't turn it around to ${b} − ${t}. After the exchange the ${P[i].name} has ${now}: use ${now} − ${b}.`,
    digitWrong: (i, t, b) => `Look again: ${t} − ${b}.`,
    digitEmpty: 'Write one digit in the answer box, then check.',
    help: { hint: '💡 Hint', show: 'Show me', retry: 'Try again', getHint: 'Get a hint', showHow: 'Show me how' },
    shownPrefix: 'Shown: ',
    gHint: {
      needs: (i, t, b) => `Compare the two digits in the ${P[i].name}: the top has ${t} and the bottom has ${b}. Can you take ${b} away from ${t}?`,
      supplier: (col) => `Look one place to the left of the ${P[col.place].name}. If that place has 0, it has nothing to give: keep looking left.`,
      exchange: (e) => `The giving place (${P[e.from].name}) goes down by 1. The getting place (${P[e.to].name}) goes up by 10. Start from what each one has now.`,
      digit: (i, t, b) => `Subtract in the ${P[i].name}: ${t} − ${b}. Count up from ${b} to ${t}.`
    },
    gShow: {
      needs: (i, t, b, yes) => yes ? `The ${P[i].name} has ${t} and we take away ${b}. ${t} is less than ${b}, so the ${P[i].name} needs an exchange.` : `The ${P[i].name} has ${t} and we take away ${b}. ${t} is enough, so no exchange is needed.`,
      supplier: (col) => col.chain ? `The ${chainNames(col)} ${col.chain === 1 ? 'has' : 'have'} 0, so the ${P[col.supplier].name} gives. We go through each zero, one place at a time.` : `The ${P[col.supplier].name}, just to the left, has something to give.`,
      exchange: (e) => `Exchange 1 ${P[e.from].one} for 10 ${P[e.to].name}: the ${P[e.from].name} go from ${e.before[e.from]} to ${e.after[e.from]}, and the ${P[e.to].name} from ${e.before[e.to]} to ${e.after[e.to]}. ${valueLine(e.after)}`,
      digit: (i, t, b, d) => `${cap(P[i].name)}: ${t} − ${b} = ${d}.`
    },
    noneLeft: (k) => `No ${P[k].name} are left, so the answer starts in the ${P[k - 1].name}.`,
    guidedDone: (top, bottom, ans, helped) => helped ? `Completed with help: ${M.fmt(top)} − ${M.fmt(bottom)} = ${M.fmt(ans)}. Try a similar problem on your own when you are ready.` : `You did it! ${M.fmt(top)} − ${M.fmt(bottom)} = ${M.fmt(ans)}.`,
    correct: (top, bottom, ans) => `Correct! ${M.fmt(top)} − ${M.fmt(bottom)} = ${M.fmt(ans)}.`,
    correctMarksOff: 'Your answer is right. One regroup mark does not keep the value the same; look at your marks again.',
    altValid: 'Your regroup marks are a different valid way: the value stays the same.',
    empty: 'Write your answer in the boxes below the line, then check.',
    incomplete: 'There is an empty box between your digits. Fill it in (use 0 if needed).',
    invalid: 'Use one digit in each answer box.',
    tryAgain: 'Not yet. Fix the parts marked ✗ and check again. Your other work is kept.',
    issue: {
      'smaller-from-larger': (i, t, b) => `In the ${P[i].name}, the top has ${t} and the bottom has ${b}. You can't take ${b} from ${t}, and you can't turn it around. Exchange first.`,
      'original-digit': (i, orig) => `The ${P[i].name} gave 1 away, so use its new amount, not the original ${orig}.`,
      misaligned: () => 'Check the places: ones go under ones. It looks like the bottom number moved to the left.',
      'no-reduce': (i, now, had) => (had > 0
        ? `You made the ${P[i].name} ${now} (10 more), but the ${P[i + 1] ? P[i + 1].name : 'next place'} still shows ${had}. The place that gives must go down by 1: ${had} − 1.`
        : `You made the ${P[i].name} ${now} (10 more), but no place gave 1 away. The ${P[i + 1] ? P[i + 1].name : 'next place'} has 0, so it cannot give: go further left and exchange one place at a time.`),
      'zero-ten': (i) => `The ${P[i].name} got 10 and then gave 1 to the place on its right, so it has 9, not 10.`,
      'skip-zero': (i, k) => `You took 1 ${P[k].one} straight to the ${P[i].name}. Exchanges go to the place next door: go through each zero, one place at a time.`,
      'wrong-digit': (i, t, b) => (t < b ? `In the ${P[i].name}, ${t} is less than ${b}: exchange first, then subtract.` : `Look again at the ${P[i].name}: ${t} − ${b}.`)
    },
    hintButton: (n) => (n === 0 ? 'Hint' : `Next hint (${n + 1} of 4)`),
    shownSolution: 'Watch each step. Press Next to see each exchange; your answer is filled in at the end.',
    shownDone: (top, bottom, ans) => `Completed with help: ${M.fmt(top)} − ${M.fmt(bottom)} = ${M.fmt(ans)}. Your answer boxes are filled in. Go on, or try a similar problem on your own.`,
    hintLabel: (n) => `Hint ${n} of 4`,
    showSolution: 'Show the full solution',
    solutionTitle: 'Full solution',
    earlierHints: (n) => `Earlier hints (${n})`,
    earlierLines: (n) => `Earlier lines (${n})`,
    undo: '↶ Undo', clear: 'Clear work', check: 'Check',
    back: '◀ Back', next: 'Next ▶', startOver: 'Start over',
    partOf: (i, n) => `Part ${i} of ${n}`,
    topNow: 'Top number now',
    demoStart: (top, bottom) => `${M.fmt(top)} − ${M.fmt(bottom)}. Start with the ones.`,
    demoNeeds: (i, t, b) => `${cap(P[i].name)}: ${t} is less than ${b}. We need an exchange.`,
    demoSupplier: (col) => col.chain === 0 ? `The ${P[col.place + 1].name} can give.` : `The ${chainNames(col)} ${col.chain === 1 ? 'has' : 'have'} 0, so the ${P[col.supplier].name} gives. We go through each zero, one place at a time.`,
    demoNoNeed: (i, t, b) => `${cap(P[i].name)}: ${t} is enough to take away ${b}. No exchange needed.`,
    demoExchange: (e) => `Exchange 1 ${P[e.from].one} for 10 ${P[e.to].name}: the ${P[e.from].name} go from ${e.before[e.from]} to ${e.after[e.from]}, and the ${P[e.to].name} from ${e.before[e.to]} to ${e.after[e.to]}. Now ${M.describe(e.after)}. ${valueLine(e.after)}`,
    demoDigit: (i, t, b, d) => `${cap(P[i].name)}: ${t} − ${b} = ${d}.`,
    demoEnd: (top, bottom, ans) => `${M.fmt(top)} − ${M.fmt(bottom)} = ${M.fmt(ans)}.`,
    undone: (i, now) => `Undone: ${P[i].name} back to ${now === null ? 'no mark' : now}.`,
    cleared: 'Regroup marks cleared.',
    restored: 'Regroup marks restored.',
    committed: (i, now, was) => (now === null ? `${cap(P[i].name)} mark removed.` : `${cap(P[i].name)} now ${now}${was !== null ? `, was ${was}` : ''}.`),
    digitsOnly: 'Use digits only.',
    answerOf: 'Answer',
    yes: 'Yes', no: 'No'
  };
  /** "30 + 19 = 49: the value is the same." */
  function valueLine(amounts) {
    const parts = []; for (let i = amounts.length - 1; i >= 0; i--) if (amounts[i]) parts.push(M.fmt(amounts[i] * 10 ** i));
    return `${parts.join(' + ') || '0'} = ${M.fmt(M.value(amounts))}: the value is the same.`;
  }
  function chainNames(col) {
    const names = [];
    for (let k = col.place + 1; k < col.supplier; k++) names.push(P[k].name);
    return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  }

  // ---------- State validation (also used by hosts when restoring saved work) ----------
  const isDigitText = (v) => typeof v === 'string' && /^\d?$/.test(v);
  /** True when s is a well-formed state for this problem (structure and values, not just JSON). */
  function validState(s, top, bottom) {
    if (!s || typeof s !== 'object' || Array.isArray(s) || s.v !== 1) return false;
    if (s.top !== top || s.bottom !== bottom) return false;
    const n = M.lengthOf(top);
    if (!s.ann || typeof s.ann !== 'object' || Array.isArray(s.ann)) return false;
    for (const k of Object.keys(s.ann)) {
      const i = Number(k), h = s.ann[k];
      if (!Number.isInteger(i) || i < 0 || i >= n || !Array.isArray(h) || h.length > 30) return false;
      if (!h.every((x) => Number.isInteger(x) && x >= 0 && x <= 99)) return false;
    }
    if (!Array.isArray(s.d) || s.d.length > n || !s.d.every(isDigitText)) return false;
    if (!Array.isArray(s.log) || s.log.length > 200) return false;
    if (!Number.isInteger(s.hint) || s.hint < 0 || s.hint > 5) return false;
    if (!Number.isInteger(s.demo) || s.demo < 0 || s.demo > 60) return false;
    if (s.helped !== undefined && typeof s.helped !== 'boolean') return false;
    if (s.show !== undefined && !(Number.isInteger(s.show) && s.show >= 0 && s.show <= 60)) return false;
    if (s.shownDone !== undefined && typeof s.shownDone !== 'boolean') return false;
    if (s.hintCol !== undefined && s.hintCol !== null && !(Number.isInteger(s.hintCol) && s.hintCol >= 0 && s.hintCol < n)) return false;
    if (s.guided !== null && (typeof s.guided !== 'object' || !Number.isInteger(s.guided.col) || s.guided.col < 0 || s.guided.col > n ||
      !['needs', 'supplier', 'exchange', 'digit', 'done'].includes(s.guided.stage) || !Number.isInteger(s.guided.ex) || s.guided.ex < 0 || s.guided.ex > 4)) return false;
    return true;
  }
  function freshState(top, bottom, mode) {
    return { v: 1, top, bottom, mode, ann: {}, log: [], d: [], hint: 0, hintCol: null, demo: 0, guided: mode === 'guided' ? { col: 0, stage: 'needs', ex: 0 } : null, result: null, done: false, helped: false };
  }

  // ---------- The component ----------
  function mount(el, options) {
    if (!el || !el.nodeType) throw new Error('SubtractKit.mount: an element is required');
    const o = Object.assign({ mode: 'independent', hints: true, feedback: true, solution: true }, options || {});
    const top = o.top, bottom = o.bottom;
    const err = M.checkOperands(top, bottom);
    if (err) throw new Error('SubtractKit.mount: ' + err);
    const mode = ['demo', 'guided', 'independent', 'test', 'view'].includes(o.mode) ? o.mode : 'independent';
    // Test mode can never show hints, Check, feedback or the solution, whatever the options say.
    const allowHints = mode === 'independent' && o.hints !== false;
    const allowCheck = mode === 'independent' && o.feedback !== false;
    const allowSolution = allowHints && o.solution !== false;
    // Guided steps get Hint / Show me too (off with hints: false). Never in test, demo or view.
    const guidedHelp = mode === 'guided' && o.hints !== false;
    const T = Object.assign({}, TEXT, o.text || {}, { issue: Object.assign({}, TEXT.issue, (o.text && o.text.issue) || {}) });
    const id = 'sk' + (++counter);
    const n = M.lengthOf(top), orig = M.digitsOf(top, n), bdig = M.digitsOf(bottom, n), blen = M.lengthOf(bottom);
    const plan = M.plan(top, bottom);
    const ac = new AbortController();
    const listeners = {};
    let S = freshState(top, bottom, mode);
    if (o.state && validState(o.state, top, bottom)) S = Object.assign(clone(o.state), { mode });
    if (mode === 'view') { S.ann = clone((o.work && o.work.ann) || {}); S.d = ((o.work && o.work.d) || []).map(String); }
    if (mode === 'demo' && Number.isInteger(o.demoStep) && o.demoStep >= 0) S.demo = o.demoStep;
    let gHintText = '', retryRow = false;
    let destroyed = false, feedbackHTML = '', prevNote = '', marks = {}, solutionInst = null, sayTimer = null;

    el.classList.add('sk', 'sk-mode-' + mode);
    if (o.theme) Object.keys(o.theme).forEach((k) => el.style.setProperty(k.startsWith('--') ? k : '--sk-' + k, o.theme[k]));
    el.setAttribute('data-sk', id);
    // The skeleton, built once. Only its parts are re-rendered; the live region is never replaced (SR-D06).
    el.innerHTML = `<div class="sk-wrap"><div class="sk-main">${o.caption ? `<p class="sk-caption">${esc(o.caption)}</p>` : ''}<div class="sk-gridhost"></div><div class="sk-toolhost"></div></div>` +
      `<div class="sk-coach" hidden></div></div><p class="sk-live sk-sr" aria-live="polite" id="${id}-live"></p>`;
    const gridHost = el.querySelector('.sk-gridhost'), toolHost = el.querySelector('.sk-toolhost'), coachEl = el.querySelector('.sk-coach'), live = el.querySelector('.sk-live');

    // ----- Events -----
    function on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); return api; }
    function off(name, fn) { listeners[name] = (listeners[name] || []).filter((f) => f !== fn); return api; }
    function emit(name, detail) {
      if (destroyed) return;
      const d = Object.assign({ type: name, instance: id }, detail || {});
      (listeners[name] || []).concat(listeners['*'] || []).forEach((f) => { try { f(d); } catch (e) { /* a host handler must not break the workspace */ } });
      if (o.on && typeof o.on[name] === 'function') try { o.on[name](d); } catch (e) { /* ignore */ }
    }
    const change = () => emit('change', { state: getState() });
    /** Announce in the one live region: clear it, then set the text a moment later so it is read (SR-D06). */
    const announce = (msg) => { if (destroyed) return; clearTimeout(sayTimer); live.textContent = ''; sayTimer = setTimeout(() => { if (!destroyed) live.textContent = msg; }, 50); };
    const say = (msg) => { if (mode !== 'test') announce(msg); };
    const plainText = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent; };
    function focusOn(sel) {
      const f = sel && el.querySelector(sel);
      if (f && !f.disabled) { f.focus({ preventScroll: true }); return true; }
      return false;
    }

    // ----- Demo steps -----
    function demoSteps() {
      const steps = [{ kind: 'start', note: T.demoStart(top, bottom), ann: {}, digits: 0 }];
      const ann = {}; let digits = 0;
      const push = (kind, note, extra) => steps.push(Object.assign({ kind, note, ann: clone(ann), digits }, extra || {}));
      plan.columns.forEach((c) => {
        if (c.needs) {
          push('needs', `${T.demoNeeds(c.place, c.before[c.place], c.bottomDigit)} ${T.demoSupplier(c)}`, { col: c.place, supplier: c.supplier });
          c.exchanges.forEach((e) => {
            (ann[e.from] = ann[e.from] || []).push(e.after[e.from]);
            (ann[e.to] = ann[e.to] || []).push(e.after[e.to]);
            push('exchange', T.demoExchange(e), { col: c.place, ex: e });
          });
        } else if (c.place > 0 || plan.exchanges.length) push('check', T.demoNoNeed(c.place, c.topNow, c.bottomDigit), { col: c.place });
        digits = c.place + 1;
        push('digit', T.demoDigit(c.place, c.topNow, c.bottomDigit, c.digit), { col: c.place });
      });
      push('end', (o.demoEnd || T.demoEnd)(top, bottom, top - bottom), {});
      return steps;
    }
    const DEMO = mode === 'demo' ? demoSteps() : null;
    if (DEMO && S.demo >= DEMO.length) S.demo = DEMO.length - 1;

    // ----- Grid -----
    // Tracks: minus sign, then one per place (largest first), with a thin comma track after the thousands.
    const colOf = (i) => { const fromLeft = n - 1 - i; return 2 + fromLeft + (n === 4 && i < 3 ? 1 : 0); };
    const tracks = `var(--sk-op) ${n === 4 ? 'var(--sk-col) var(--sk-comma) repeat(3, var(--sk-col))' : `repeat(${n}, var(--sk-col))`}`;
    const commaCol = n === 4 ? 3 : null;
    const cell = (row, col, html, cls, extra) => `<div class="sk-cell ${cls || ''}" style="grid-row:${row};grid-column:${col}"${extra || ''}>${html}</div>`;
    const shift = mode === 'view' && o.work && o.work.misaligned ? o.work.misaligned : 0;
    // In a read-only view, leading zeros of the answer are left blank (SR-D13).
    const viewLead = (() => { if (mode !== 'view') return n; let k = n - 1; while (k > 0 && (!S.d[k] || S.d[k] === '0')) k--; return k + 1; })();

    function editable(kind, i) {
      if (mode === 'test' || mode === 'independent') return true;
      if (mode !== 'guided' || !S.guided) return false;
      const g = S.guided, col = plan.columns[g.col];
      if (kind === 'regroup') return g.stage === 'exchange' && col && col.exchanges[g.ex] && (i === col.exchanges[g.ex].from || i === col.exchanges[g.ex].to);
      if (kind === 'answer') return g.stage === 'digit' && i === g.col;
      return false;
    }
    function activeInfo() {
      if (mode === 'demo') { const st = DEMO[S.demo]; return { col: st.col, ex: st.ex || null, supplier: st.kind === 'needs' ? st.supplier : null }; }
      if (mode === 'guided' && S.guided && S.guided.stage !== 'done') {
        const col = plan.columns[S.guided.col];
        return { col: S.guided.col, ex: S.guided.stage === 'exchange' ? col.exchanges[S.guided.ex] : null, supplier: null };
      }
      if (mode === 'independent' && S.hint > 0 && S.hint < 5 && S.hintCol !== null && S.hintCol !== undefined) {
        const col = plan.columns[S.hintCol];
        return { col: S.hintCol, ex: null, supplier: S.hint >= 2 && col && col.needs ? col.supplier : null };
      }
      return { col: null, ex: null, supplier: null };
    }
    const annNow = () => (mode === 'demo' ? DEMO[S.demo].ann : S.ann);
    // The cells of one column that a regroup mark changes (patched in place, SR-D01).
    function histCell(i, hist) { const earlier = hist.length >= 2 ? hist[hist.length - 2] : null; return earlier !== null ? `<span class="sk-hist" aria-hidden="true">${earlier}</span>` : ''; }
    function topLabel(i, hist) {
      const earlier = hist.length >= 2 ? hist[hist.length - 2] : null, now = hist.length ? hist[hist.length - 1] : null;
      return `${cap(P[i].name)}: ${orig[i]}${hist.length ? `, crossed out${earlier !== null ? `, was ${earlier}` : ''}, now ${now}` : ''}`;
    }
    function ansCell(i) {
      const c = colOf(i), dv = S.d[i] || '', mk = marks[i];
      const badge = mk ? `<span class="sk-mark is-${mk}" aria-hidden="true">${mk === 'ok' ? '✓' : '✗'}</span>` : '';
      if (o.answer === false) return '';
      if (mode === 'demo') {
        const st = DEMO[S.demo], shown = i < st.digits && !(i >= viewLeadDemo() && st.digits === n) ? String(plan.columns[i].digit) : '';
        return cell(8, c, `<span class="sk-ans sk-ans-read">${shown}</span>`, 'sk-anscell', shown ? ` aria-label="${T.answerOf} ${P[i].name} digit ${shown}"` : '');
      }
      if (mode === 'view' || !editable('answer', i)) {
        const shown = mode === 'view' && i >= viewLead ? '' : dv;
        const who = o.answerLabel || T.answerOf;
        return cell(8, c, `<span class="sk-ans sk-ans-read${mk ? ' is-' + mk : ''}">${esc(shown)}</span>${badge}`, 'sk-anscell',
          ` aria-label="${esc(who)}, ${P[i].name} digit${shown ? ' ' + shown : ', empty'}${mk ? (mk === 'ok' ? ', correct' : ', not correct') : ''}"`);
      }
      return cell(8, c, `<input class="sk-ans sk-in${mk ? ' is-' + mk : ''}" data-k="a${i}" inputmode="numeric" maxlength="1" autocomplete="off" spellcheck="false" ` +
        `aria-label="Answer, ${P[i].name} digit${mk === 'no' ? ', marked not correct' : mk === 'ok' ? ', marked correct' : ''}" value="${esc(dv)}">${badge}`, 'sk-anscell');
    }
    // Demo: a leading zero in the final answer is not written.
    const viewLeadDemo = () => { const d = plan.columns.map((c) => c.digit); let k = n - 1; while (k > 0 && d[k] === 0) k--; return k + 1; };

    function gridHTML() {
      const act = activeInfo(), ann = annNow();
      const showChips = mode === 'demo' || mode === 'guided';
      let decor = '', regroups = '', digits = '', answers = '';
      for (let i = n - 1; i >= 0; i--) {
        const c = colOf(i), hist = ann[i] || [], marked = hist.length > 0;
        const isAct = act.col === i;
        const cls = (isAct ? ' is-active' : '') + (act.ex && act.ex.from === i ? ' is-giver' : '') + (act.ex && act.ex.to === i ? ' is-getter' : '') + (act.supplier === i ? ' is-giver' : '');
        decor += `<div class="sk-band${cls}" style="grid-row:1 / 9;grid-column:${c}" aria-hidden="true"></div>`;
        decor += cell(1, c, `${isAct ? '<span class="sk-here" aria-hidden="true">▼</span>' : ''}<abbr class="sk-tag sk-tag-${KEYS[i]}" title="${P[i].name}">${KEYS[i]}</abbr>`, 'sk-tagcell' + cls);
        if (showChips) {
          const chip = act.ex && act.ex.from === i ? '−1' : act.ex && act.ex.to === i ? '+10' : '';
          decor += cell(2, c, chip ? `<span class="sk-chip">${chip}</span>` : '', 'sk-chipcell');
        }
        decor += cell(3, c, histCell(i, hist), 'sk-histcell', ` data-hist="${i}"`);
        const now = marked ? hist[hist.length - 1] : '';
        if (editable('regroup', i) && mode !== 'demo' && mode !== 'view') {
          regroups += cell(4, c, `<input class="sk-cur sk-in" data-k="r${i}" inputmode="numeric" maxlength="2" autocomplete="off" spellcheck="false" placeholder=" " ` +
            `aria-label="Regrouped ${P[i].name}${mode === 'guided' ? '' : ', optional'}" value="${esc(now)}">`, 'sk-curcell');
        } else {
          regroups += cell(4, c, marked ? `<span class="sk-cur sk-cur-read" aria-hidden="true">${now}</span>` : '', 'sk-curcell', ` data-cur="${i}"`);
        }
        digits += cell(5, c, `<span class="sk-d${marked ? ' sk-x' : ''}" aria-hidden="true">${orig[i]}</span>`, 'sk-topcell', ` data-top="${i}" role="img" aria-label="${esc(topLabel(i, hist))}"`);
        const bi = i - shift, bd = bi >= 0 && bi < blen ? String(bottom)[blen - 1 - bi] : '';
        digits += cell(6, c, bd ? `<span class="sk-d">${bd}</span>` : '', 'sk-botcell' + (shift ? ' is-shifted' : ''), bd ? ` role="img" aria-label="${P[i].name} ${bd}"` : '');
        answers += ansCell(i);
      }
      digits += cell(6, 1, '<span class="sk-op" aria-hidden="true">−</span>', 'sk-opcell');
      if (commaCol) {
        digits += cell(5, commaCol, '<span class="sk-comma" aria-hidden="true">,</span>', 'sk-commacell');
        if (blen === 4 && !shift) digits += cell(6, commaCol, '<span class="sk-comma" aria-hidden="true">,</span>', 'sk-commacell');
      }
      digits += `<div class="sk-rule" style="grid-row:7;grid-column:1 / -1" aria-hidden="true"></div>`;
      // DOM order: decoration, then every regroup box, then the digits, then every answer box (Tab goes row by row, SR-D10).
      return `<div class="sk-grid${showChips ? ' has-chips' : ''}${o.answer === false ? ' no-answer' : ''}" style="grid-template-columns:${tracks}" role="group" aria-label="${esc(`${M.fmt(top)} minus ${M.fmt(bottom)}, written in columns`)}">${decor}${regroups}${digits}${answers}</div>`;
    }
    function renderGrid() { gridHost.innerHTML = gridHTML(); }
    /** Update the cells a regroup mark changes, without replacing any input or button (SR-D01). */
    function patchMarks() {
      const ann = annNow();
      for (let i = 0; i < n; i++) {
        const hist = ann[i] || [], now = hist.length ? hist[hist.length - 1] : '';
        const h = gridHost.querySelector(`[data-hist="${i}"]`); if (h) h.innerHTML = histCell(i, hist);
        const t = gridHost.querySelector(`[data-top="${i}"]`);
        if (t) { t.setAttribute('aria-label', topLabel(i, hist)); const d = t.querySelector('.sk-d'); if (d) d.classList.toggle('sk-x', hist.length > 0); }
        const inp = gridHost.querySelector(`[data-k="r${i}"]`);
        if (inp && inp.value !== String(now)) inp.value = String(now);
        const ro = gridHost.querySelector(`[data-cur="${i}"]`); if (ro) ro.innerHTML = hist.length ? `<span class="sk-cur sk-cur-read" aria-hidden="true">${now}</span>` : '';
      }
      clearMarks();
      updateTools();
    }
    function clearMarks() {
      if (!Object.keys(marks).length && !feedbackHTML) return;
      marks = {};
      gridHost.querySelectorAll('.sk-ans').forEach((x) => x.classList.remove('is-ok', 'is-no'));
      gridHost.querySelectorAll('.sk-mark').forEach((x) => x.remove());
      if (mode === 'independent' && feedbackHTML) { feedbackHTML = ''; const fb = coachEl.querySelector('.sk-fb'); if (fb) fb.innerHTML = ''; }
    }

    // ----- Toolbar (independent and test) -----
    const hintCol = () => M.hints(top, bottom, { d: S.d }).place;
    const nextIsHint = () => S.hint < 4 || (S.hint === 4 && S.hintCol !== hintCol());
    function toolsHTML() {
      if (mode !== 'independent' && mode !== 'test') return '';
      const undo = `<button type="button" class="sk-btn sk-btn-ghost" data-act="undo"${S.log.length ? '' : ' disabled'}>${esc(T.undo)}</button>`;
      const clear = `<button type="button" class="sk-btn sk-btn-ghost" data-act="clear"${Object.keys(S.ann).length ? '' : ' disabled'}>${esc(T.clear)}</button>`;
      let right = '';
      // Hint and Show me are always next to Check; Show me needs no earlier hints (it is never a gate).
      if (allowHints && nextIsHint()) right += `<button type="button" class="sk-btn sk-btn-ghost" data-act="hint">💡 ${esc(T.hintButton(S.hintCol === hintCol() ? S.hint : 0))}</button>`;
      if (allowSolution && S.hint < 5) right += `<button type="button" class="sk-btn sk-btn-ghost" data-act="solution">${esc(T.help.show)}</button>`;
      if (allowCheck) right += `<button type="button" class="sk-btn sk-btn-primary" data-act="check">${esc(T.check)}</button>`;
      return `<div class="sk-toolbar"><div class="sk-tl">${undo}${clear}</div>${right ? `<div class="sk-tr">${right}</div>` : ''}</div>`;
    }
    function renderTools() { toolHost.innerHTML = toolsHTML(); }
    function updateTools() {
      const u = toolHost.querySelector('[data-act="undo"]'), c = toolHost.querySelector('[data-act="clear"]');
      if (u) u.disabled = !S.log.length;
      if (c) c.disabled = !Object.keys(S.ann).length;
      toolHost.querySelectorAll('[data-act="hint"], [data-act="solution"]').forEach((b) => { b.hidden = retryRow; });
    }

    // ----- Coach panel -----
    function coachHTML() {
      if (mode === 'demo') {
        const st = DEMO[S.demo];
        const lines = [M.describe(orig)];
        DEMO.slice(0, S.demo + 1).forEach((x) => { if (x.kind === 'exchange') lines.push(M.describe(x.ex.after)); });
        const ctl = `<div class="sk-democtl"><button type="button" class="sk-btn" data-act="back"${S.demo === 0 ? ' disabled' : ''}>${esc(T.back)}</button>` +
          `<span class="sk-partof">${esc(T.partOf(S.demo + 1, DEMO.length))}</span>` +
          `<button type="button" class="sk-btn sk-btn-primary" data-act="next"${S.demo === DEMO.length - 1 ? ' disabled' : ''}>${esc(T.next)}</button>` +
          `<button type="button" class="sk-btn sk-btn-ghost" data-act="restart">${esc(T.startOver)}</button></div>`;
        let list = '';
        if (plan.exchanges.length) {
          const nowLine = lines[lines.length - 1];
          // Wide: the whole growing list. Narrow: the current line, earlier lines folded (SR-D07).
          list = `<p class="sk-topnow-h">${esc(T.topNow)}</p><ol class="sk-topnow sk-wide-only">${lines.map((l, k) => `<li${k === lines.length - 1 ? ' class="is-now"' : ''}>${esc(l)}${k === lines.length - 1 ? ' <span aria-hidden="true">◀ now</span>' : ''}</li>`).join('')}</ol>` +
            `<p class="sk-topnow-cur sk-narrow-only">${esc(nowLine)}</p>` +
            (lines.length > 1 ? `<details class="sk-older sk-narrow-only"><summary>${esc(T.earlierLines(lines.length - 1))}</summary><ol>${lines.slice(0, -1).map((l) => `<li>${esc(l)}</li>`).join('')}</ol></details>` : '');
        }
        // Controls first, next to the grid (SR-D07); a Show me player (noteFirst) puts the sentence first so it stays in view (SR-D29).
        return o.noteFirst ? `<p class="sk-note">${esc(st.note)}</p>${ctl}${list}` : `${ctl}<p class="sk-note">${esc(st.note)}</p>${list}`;
      }
      if (mode === 'guided') {
        const g = S.guided;
        const prev = prevNote ? `<p class="sk-prev"><span aria-hidden="true">✓ </span>${esc(prevNote)}</p>` : '';
        if (g.stage === 'done') return `${prev}<p class="sk-note sk-ok-note sk-done" tabindex="-1"><span aria-hidden="true">✓ </span>${esc(T.guidedDone(top, bottom, top - bottom, !!S.helped))}</p>`;
        const col = plan.columns[g.col], i = g.col, b = col.bottomDigit;
        let q = '', ctl = '';
        if (g.stage === 'needs') {
          q = T.needsQ(i);
          ctl = `<div class="sk-choices"><button type="button" class="sk-btn" data-act="needs" data-v="yes">${esc(T.yes)}</button><button type="button" class="sk-btn" data-act="needs" data-v="no">${esc(T.no)}</button></div>`;
        } else if (g.stage === 'supplier') {
          q = T.supplierQ;
          const opts = [];
          for (let k = i + 1; k < n; k++) opts.push(`<button type="button" class="sk-btn" data-act="supplier" data-v="${k}">${esc(cap(P[k].name))}</button>`);
          ctl = `<div class="sk-choices">${opts.join('')}</div>`;
        } else if (g.stage === 'exchange') {
          const e = col.exchanges[g.ex];
          q = T.exchangeQ(e.from, e.to);
          ctl = `<button type="button" class="sk-btn sk-btn-primary" data-act="check-ex">${esc(T.check)}</button>`;
        } else if (g.stage === 'digit') {
          q = T.digitQ(i, col.topNow, b);
          ctl = `<button type="button" class="sk-btn sk-btn-primary" data-act="check-digit">${esc(T.check)}</button>`;
        }
        // The last step's ✓ sits above the new question; feedback for this step goes under its button (SR-D11).
        // Help sits right by the answer; after a mistake: Try again · Get a hint · Show me how.
        const help = !guidedHelp ? '' : retryRow
          ? `<div class="sk-help"><button type="button" class="sk-btn sk-btn-ghost" data-act="g-retry">${esc(T.help.retry)}</button><button type="button" class="sk-btn sk-btn-ghost" data-act="g-hint">${esc(T.help.getHint)}</button><button type="button" class="sk-btn sk-btn-ghost" data-act="g-show">${esc(T.help.showHow)}</button></div>`
          : `<div class="sk-help"><button type="button" class="sk-btn sk-btn-ghost" data-act="g-hint">${esc(T.help.hint)}</button><button type="button" class="sk-btn sk-btn-ghost" data-act="g-show">${esc(T.help.show)}</button></div>`;
        return `${prev}<p class="sk-working">${esc(T.working(i))}</p><p class="sk-q" id="${id}-q">${esc(q)}</p>${ctl}<div class="sk-fb">${feedbackHTML}</div>${help}${gHintText ? `<p class="sk-hint" tabindex="-1">${esc(gHintText)}</p>` : ''}`;
      }
      if (mode === 'independent' && (allowHints || allowCheck)) {
        const retry = retryRow ? `<div class="sk-help"><button type="button" class="sk-btn sk-btn-ghost" data-act="i-retry">${esc(T.help.retry)}</button>${allowHints ? `<button type="button" class="sk-btn sk-btn-ghost" data-act="hint">${esc(T.help.getHint)}</button>` : ''}${allowSolution && S.hint < 5 ? `<button type="button" class="sk-btn sk-btn-ghost" data-act="solution">${esc(T.help.showHow)}</button>` : ''}</div>` : '';
        let hintsH = '';
        if (S.hint > 0) {
          const H = M.hints(top, bottom, { d: S.d }).levels;
          if (S.hint >= 5) {
            hintsH = `<div class="sk-solution"><p class="sk-solution-h" tabindex="-1">${esc(T.solutionTitle)}</p><p class="sk-sub">${esc(T.shownSolution)}</p><div class="sk-mini" data-sk-mini></div>` +
              `<div class="sk-solution-end">${S.shownDone ? shownEndHTML() : ''}</div></div>`;
          } else {
            const shown = S.hint, older = [];
            for (let k = 1; k < shown; k++) older.push(`<li><b>${esc(T.hintLabel(k))}:</b> ${esc(H[k - 1])}</li>`);
            hintsH = (older.length ? `<details class="sk-older"><summary>${esc(T.earlierHints(older.length))}</summary><ul>${older.join('')}</ul></details>` : '') +
              `<p class="sk-hint" tabindex="-1"><b>${esc(T.hintLabel(shown))}:</b> ${esc(H[shown - 1])}</p>`;
          }
        }
        return `<div class="sk-fb">${feedbackHTML}</div>${retry}${hintsH}`;
      }
      return '';
    }
    function renderCoach() {
      const h = coachHTML();
      coachEl.innerHTML = h; coachEl.hidden = !h;
      el.querySelector('.sk-wrap').classList.toggle('has-coach', !!h);
      if (solutionInst) { solutionInst.destroy(); solutionInst = null; }
      const mini = coachEl.querySelector('[data-sk-mini]');
      if (mini) {
        // Show me plays the worked answer one step at a time (each exchange visible) in the same vertical model.
        solutionInst = mount(mini, { top, bottom, mode: 'demo', demoStep: S.show || 0, text: o.text, noteFirst: true });
        solutionInst.on('step', (d) => { S.show = d.index; change(); });
        solutionInst.on('complete', () => finishShown());
      }
    }
    const shownEndHTML = () => `<p class="sk-ok-note sk-shown-done" tabindex="-1"><span aria-hidden="true">✓ </span>${esc(T.shownDone(top, bottom, top - bottom))}</p>` +
      `<ol class="sk-steps">${M.solutionLines(top, bottom).map((l) => `<li>${esc(l)}</li>`).join('')}</ol>`;
    /** The Show me player reached its last step: only now is the answer filled in; the problem is completed WITH help. */
    function finishShown() {
      if (S.shownDone || destroyed) return;
      S.shownDone = true; S.helped = true; S.done = true;
      S.ann = solutionAnn();
      S.d = plan.columns.map((c) => String(c.digit));
      while (S.d.length > 1 && S.d[S.d.length - 1] === '0' && S.d.length > M.lengthOf(top - bottom)) S.d.pop();
      S.result = { status: 'correct', correct: true };
      marks = {}; for (let i = 0; i < S.d.length; i++) marks[i] = 'ok';
      feedbackHTML = ''; retryRow = false;
      renderGrid(); updateTools();
      const end = coachEl.querySelector('.sk-solution-end');
      if (end) end.innerHTML = shownEndHTML();
      focusOn('.sk-shown-done');
      say(T.shownDone(top, bottom, top - bottom));
      emit('answer', { status: 'correct', correct: true, value: top - bottom, helped: true, shown: true });
      emit('complete', { correct: true, hintsUsed: S.hint, helped: true, shown: true });
      change();
    }
    function renderAll() { renderGrid(); renderTools(); renderCoach(); }
    function solutionAnn() {
      const ann = {};
      plan.exchanges.forEach((e) => { (ann[e.from] = ann[e.from] || []).push(e.after[e.from]); (ann[e.to] = ann[e.to] || []).push(e.after[e.to]); });
      return ann;
    }

    // ----- Regroup marks (independent and test): patched in place -----
    function commitRegroup(i, text) {
      const v = M.readAmount(text);
      const hist = S.ann[i] || [];
      const was = hist.length ? hist[hist.length - 1] : null;
      if (Number.isNaN(v)) { const inp = gridHost.querySelector(`[data-k="r${i}"]`); if (inp) inp.value = was === null ? '' : String(was); announce(T.digitsOnly); return; }
      if (v === was) return;
      S.log.push({ place: i, before: hist.slice() });
      if (v === null) { hist.pop(); if (hist.length) S.ann[i] = hist; else delete S.ann[i]; }
      else S.ann[i] = hist.concat(v);
      patchMarks();
      if (mode === 'test') announce(T.committed(i, v, was)); else say(T.committed(i, v, was));
      emit('step', { kind: 'regroup', place: i, value: v, was });
      change();
    }
    function undo() {
      const last = S.log.pop();
      if (!last) return;
      if (last.clear) S.ann = last.before;
      else if (last.before.length) S.ann[last.place] = last.before; else delete S.ann[last.place];
      patchMarks();
      if (!focusOn('[data-act="undo"]')) focusOn('[data-k^="r"]');
      const now = last.clear ? null : (S.ann[last.place] ? S.ann[last.place][S.ann[last.place].length - 1] : null);
      announce(last.clear ? T.restored : T.undone(last.place, now));
      emit('step', { kind: 'undo' }); change();
    }
    function clearWork() {
      if (!Object.keys(S.ann).length) return;
      S.log.push({ clear: true, before: clone(S.ann) });
      S.ann = {};
      patchMarks();
      focusOn('[data-act="undo"]');
      announce(T.cleared);
      emit('reset', { scope: 'marks' }); change();
    }

    // ----- Check (independent) -----
    function check() {
      if (mode !== 'independent' && mode !== 'test') return null;
      const g = M.gradeFinal(top, bottom, S.d);
      const ev = M.evaluateWork(top, bottom, S.ann);
      const result = { status: g.status, correct: g.correct, value: g.value, marks: ev.status, standardMarks: ev.status === 'valid' ? ev.standard : null, issues: [] };
      if (mode === 'test' || !allowCheck) return result; // graded silently: the host decides what to show
      marks = {};
      const msgs = [];
      if (g.status === 'empty') msgs.push(T.empty);
      else if (g.status === 'incomplete') msgs.push(T.incomplete);
      else if (g.status === 'invalid') msgs.push(T.invalid);
      else if (g.correct) {
        for (let i = 0; i < n; i++) marks[i] = 'ok';
        msgs.push(T.correct(top, bottom, top - bottom));
        if (ev.status === 'invalid') msgs.push(T.correctMarksOff);
        else if (ev.status === 'valid' && !ev.standard) msgs.push(T.altValid);
      } else {
        const issues = M.diagnose(top, bottom, { ann: S.ann, d: S.d });
        result.issues = issues;
        for (let i = 0; i < n; i++) { const v = (S.d[i] || '').trim(); if (v !== '' || i < M.lengthOf(top - bottom)) marks[i] = v === String(plan.columns[i].digit) ? 'ok' : 'no'; }
        const named = issues.filter((x) => x.kind !== 'wrong-digit');
        const cur = M.amountsFrom(top, S.ann, n);
        (named.length ? named : issues).slice(0, 2).forEach((x) => {
          const f = T.issue[x.kind], i = x.place;
          if (x.kind === 'smaller-from-larger') msgs.push(f(i, orig[i], bdig[i]));
          else if (x.kind === 'original-digit') msgs.push(f(i, orig[i]));
          else if (x.kind === 'no-reduce') msgs.push(f(i, cur[i], i + 1 < n ? cur[i + 1] : 0));
          else if (x.kind === 'skip-zero') { const ev2 = M.evaluateWork(top, bottom, S.ann); msgs.push(f(i, ev2.supplier !== undefined ? ev2.supplier : Math.min(n - 1, i + 2))); }
          else if (x.kind === 'wrong-digit') { const amt = M.evaluateWork(top, bottom, S.ann).status === 'valid' && M.checkAmounts(top, bottom, cur).ok ? cur[i] : plan.columns[i].topNow; msgs.push(f(i, amt, bdig[i])); }
          else msgs.push(f(i));
        });
        if (ev.status === 'valid' && !ev.standard) msgs.push(T.altValid);
        msgs.push(T.tryAgain);
      }
      retryRow = g.status === 'wrong';
      feedbackHTML = `<p class="${g.correct ? 'sk-ok-note' : 'sk-no-note'}"><span aria-hidden="true">${g.correct ? '✓ ' : g.status === 'wrong' ? '✗ ' : ''}</span>${msgs.map(esc).join(' ')}</p>`;
      S.result = { status: g.status, correct: g.correct };
      if (g.correct) S.done = true;
      renderGrid(); renderCoach(); updateTools();
      focusOn('[data-act="check"]');
      say(msgs.join(' '));
      emit('answer', { status: g.status, correct: g.correct, value: g.value, marks: ev.status, issues: result.issues, helped: !!S.helped });
      if (g.correct) emit('complete', { correct: true, hintsUsed: S.hint, helped: !!S.helped });
      change();
      return result;
    }

    // ----- Guided decisions -----
    /** ok: ✓ · false: ✗ (a real mistake) · 'valid': ↺ (mathematically fine, but use the standard step). */
    function guidedFeedback(ok, msg) { const cls = ok === 'valid' ? 'sk-info-note' : ok ? 'sk-ok-note' : 'sk-no-note'; feedbackHTML = `<p class="${cls}"><span aria-hidden="true">${ok === 'valid' ? '↺ ' : ok ? '✓ ' : '✗ '}</span>${esc(msg)}</p>`; }
    /** A correct step: its confirmation moves above the next question; the next stage's controls get focus. */
    function guidedNext(stage, extra, okMsg) {
      prevNote = okMsg || ''; feedbackHTML = ''; gHintText = ''; retryRow = false;
      Object.assign(S.guided, { stage }, extra || {});
      renderGrid(); renderCoach();
      const g = S.guided;
      if (g.stage === 'done') { focusOn('.sk-done'); say(`${prevNote} ${T.guidedDone(top, bottom, top - bottom, !!S.helped)}`); emit('complete', { correct: true, helped: !!S.helped }); }
      else {
        focusOn(g.stage === 'exchange' ? '[data-k^="r"]' : g.stage === 'digit' ? `[data-k="a${g.col}"]` : '.sk-choices .sk-btn');
        const q = coachEl.querySelector('.sk-q');
        say(`${prevNote} ${q ? q.textContent : ''}`.trim());
      }
      change();
    }
    /** A wrong (or valid-but-not-standard) answer: feedback under the controls; focus back where the child was. */
    function guidedStay(focusSel) {
      retryRow = /sk-no-note/.test(feedbackHTML);
      renderCoach();
      if (!focusOn(focusSel)) focusOn('.sk-coach .sk-btn');
      say(plainText(feedbackHTML));
      change();
    }
    /** Guided help: a clue for this step, or show this step (it is done for the child, explained, and marked as helped). */
    function guidedHelpAct(act) {
      const g = S.guided, col = plan.columns[g.col], i = g.col, t = col.before[i], b = col.bottomDigit;
      if (act === 'g-retry') {
        feedbackHTML = ''; retryRow = false; renderCoach();
        let exSel = '[data-k^="r"]';
        if (g.stage === 'exchange') { const e = col.exchanges[g.ex], inp = gridHost.querySelector(`[data-k="r${e.from}"]`), v = inp ? M.readAmount(inp.value) : null; exSel = `[data-k="r${v === e.after[e.from] ? e.to : e.from}"]`; }
        focusOn(g.stage === 'exchange' ? exSel : g.stage === 'digit' ? `[data-k="a${i}"]` : '.sk-choices .sk-btn');
        return;
      }
      if (act === 'g-hint') {
        gHintText = g.stage === 'needs' ? T.gHint.needs(i, t, b) : g.stage === 'supplier' ? T.gHint.supplier(col) : g.stage === 'exchange' ? T.gHint.exchange(col.exchanges[g.ex]) : T.gHint.digit(i, col.topNow, b);
        renderCoach(); focusOn('.sk-coach .sk-hint'); say(gHintText);
        emit('hint', { level: 1, place: i, stage: g.stage }); change();
        return;
      }
      if (act !== 'g-show') return;
      S.helped = true;
      emit('hint', { level: 5, place: i, stage: g.stage, shown: true });
      if (g.stage === 'needs') return guidedNext(col.needs ? 'supplier' : 'digit', null, T.shownPrefix + T.gShow.needs(i, t, b, col.needs));
      if (g.stage === 'supplier') return guidedNext('exchange', { ex: 0 }, T.shownPrefix + T.gShow.supplier(col));
      if (g.stage === 'exchange') {
        const e = col.exchanges[g.ex];
        [[e.from, e.after[e.from]], [e.to, e.after[e.to]]].forEach(([j, val]) => { const h = S.ann[j] || []; if (h[h.length - 1] !== val) S.ann[j] = h.concat(val); });
        const msg = T.shownPrefix + T.gShow.exchange(e);
        return g.ex + 1 < col.exchanges.length ? guidedNext('exchange', { ex: g.ex + 1 }, msg) : guidedNext('digit', null, msg);
      }
      if (g.stage === 'digit') {
        S.d[i] = String(col.digit);
        const msg = T.shownPrefix + T.gShow.digit(i, col.topNow, b, col.digit);
        if (g.col + 1 < n && !leadingOnly(g.col + 1)) return guidedNext('needs', { col: g.col + 1, ex: 0 }, msg);
        return guidedNext('done', null, g.col + 1 < n ? `${msg} ${T.noneLeft(g.col + 1)}` : msg);
      }
    }
    const leadingOnly = (k) => plan.columns.slice(k).every((c) => c.topNow === 0 && c.place >= blen);
    function guidedAct(act, v) {
      const g = S.guided, col = plan.columns[g.col], i = g.col, t = col.before[i], b = col.bottomDigit;
      if (act === 'needs') {
        const yes = v === 'yes';
        if (yes === col.needs) { emit('step', { kind: 'needs', column: i, correct: true }); return guidedNext(yes ? 'supplier' : 'digit', null, yes ? T.needsYes(t, b) : T.needsNo(t, b)); }
        guidedFeedback(yes ? 'valid' : false, yes ? T.needsAltYes(i, t, b) : T.needsWrongNo(i, t, b));
        emit('step', { kind: 'needs', column: i, correct: false, valid: yes });
        return guidedStay(`[data-act="needs"][data-v="${v}"]`);
      }
      if (act === 'supplier') {
        const k = Number(v), cur = col.before;
        if (k === col.supplier) { emit('step', { kind: 'supplier', column: i, correct: true }); return guidedNext('exchange', { ex: 0 }, col.chain ? T.demoSupplier(col) : T.supplierOk(k)); }
        if (cur[k] === 0) guidedFeedback(false, T.supplierZero(k)); else guidedFeedback('valid', T.supplierFar(k, col.supplier));
        emit('step', { kind: 'supplier', column: i, correct: false, valid: cur[k] > 0 });
        return guidedStay(`[data-act="supplier"][data-v="${v}"]`);
      }
      if (act === 'check-ex') {
        const e = col.exchanges[g.ex];
        const rv = (j) => { const inp = gridHost.querySelector(`[data-k="r${j}"]`); return inp ? M.readAmount(inp.value) : null; };
        const giver = rv(e.from), getter = rv(e.to);
        if (giver === null || getter === null || Number.isNaN(giver) || Number.isNaN(getter)) { guidedFeedback('valid', T.exchangeEmpty); return guidedStay('[data-act="check-ex"]'); }
        const okG = giver === e.after[e.from], okR = getter === e.after[e.to];
        if (okG && okR) {
          // Record this exchange's values (each place keeps its earlier values, so 0 → 10 → 9 shows the struck 10).
          [[e.from, giver], [e.to, getter]].forEach(([j, val]) => { const h = S.ann[j] || []; if (h[h.length - 1] !== val) S.ann[j] = h.concat(val); });
          emit('step', { kind: 'exchange', column: i, from: e.from, to: e.to, correct: true });
          return g.ex + 1 < col.exchanges.length ? guidedNext('exchange', { ex: g.ex + 1 }, T.exchangeKept(e.from, e.to, e.after)) : guidedNext('digit', null, T.exchangeKept(e.from, e.to, e.after));
        }
        // Nothing wrong is recorded and nothing earlier is removed (SR-D02); the right box keeps its value.
        guidedFeedback(false, okR && !okG && giver === e.before[e.from] ? T.exchangeNoReduce(e.from, e.before[e.from]) : !okG ? T.exchangeGiver(e.from, e.before[e.from]) : T.exchangeGetter(e.to, e.before[e.to]));
        emit('step', { kind: 'exchange', column: i, correct: false });
        retryRow = true; renderCoach();
        const bad = gridHost.querySelector(`[data-k="r${!okG ? e.from : e.to}"]`);
        if (bad) { bad.focus({ preventScroll: true }); bad.select(); }
        say(plainText(feedbackHTML)); change();
        return;
      }
      if (act === 'check-digit') {
        const inp = gridHost.querySelector(`[data-k="a${i}"]`), dv = inp ? inp.value.trim() : '';
        S.d[i] = dv;
        if (!/^\d$/.test(dv)) { guidedFeedback('valid', T.digitEmpty); return guidedStay(`[data-k="a${i}"]`); }
        const d = Number(dv);
        if (d === col.digit) {
          emit('step', { kind: 'digit', column: i, correct: true });
          emit('answer', { status: i === n - 1 ? 'correct' : 'partial', column: i });
          const ok = T.digitOk(i, col.topNow, b, d);
          if (g.col + 1 < n && !leadingOnly(g.col + 1)) return guidedNext('needs', { col: g.col + 1, ex: 0 }, ok);
          return guidedNext('done', null, g.col + 1 < n ? `${ok} ${T.noneLeft(g.col + 1)}` : ok);
        }
        const lent = col.topNow !== orig[i] && !col.needs;
        guidedFeedback(false, lent && d === orig[i] - b ? T.digitOriginal(i, orig[i], col.topNow) : (d === b - t && t < b) ? T.digitSwap(i, t, b, col.topNow) : T.digitWrong(i, col.topNow, b));
        emit('step', { kind: 'digit', column: i, correct: false });
        retryRow = true; renderCoach();
        if (inp) { inp.focus({ preventScroll: true }); inp.select(); }
        say(plainText(feedbackHTML)); change();
      }
    }

    // ----- Hints and the demo -----
    function showHint(solution) {
      if (!allowHints) return;
      const h = M.hints(top, bottom, { d: S.d });
      if (!solution && S.hint < 5 && S.hintCol !== null && S.hintCol !== undefined && S.hintCol !== h.place) S.hint = 0; // a new column starts again at hint 1
      if (solution) { if (!allowSolution) return; S.hint = 5; S.helped = true; S.show = 0; }
      else if (S.hint < 4) S.hint += 1; else return;
      S.hintCol = h.place;
      if (!solution) retryRow = false;
      renderGrid(); renderTools(); renderCoach(); updateTools();
      // Bring just the worked answer's heading into view (a small scroll on phones), so the child sees it opened while their own answer row stays on screen (SR-D28).
      if (S.hint >= 5) { retryRow = false; updateTools(); focusOn('.sk-solution-h'); const hh = coachEl.querySelector('.sk-solution-h'); if (hh && hh.scrollIntoView) hh.scrollIntoView({ block: 'nearest' }); }
      else if (!focusOn('[data-act="hint"]') && !focusOn('[data-act="solution"]')) focusOn('.sk-hint');
      say(S.hint >= 5 ? `${T.solutionTitle}. ${T.shownSolution}` : `${T.hintLabel(S.hint)}: ${h.levels[S.hint - 1]}`);
      emit('hint', { level: S.hint, place: h.place, solution: S.hint >= 5, shown: S.hint >= 5 });
      change();
    }
    function demoMove(act) {
      if (mode !== 'demo') return;
      if (act === 'next' && S.demo < DEMO.length - 1) S.demo++;
      else if (act === 'back' && S.demo > 0) S.demo--;
      else if (act === 'restart') S.demo = 0;
      else return;
      renderGrid(); renderCoach();
      if (!focusOn(`[data-act="${act === 'restart' ? 'next' : act}"]`)) focusOn(S.demo === 0 ? '[data-act="next"]' : '[data-act="back"]');
      say(DEMO[S.demo].note);
      emit('step', { kind: 'demo', index: S.demo, total: DEMO.length, part: DEMO[S.demo].kind });
      if (S.demo === DEMO.length - 1) emit('complete', { correct: true, demo: true });
      change();
    }

    // ----- Input handling: one set of listeners on the element, removed by destroy() -----
    const sig = { signal: ac.signal };
    el.addEventListener('click', (e) => {
      const t = e.target;
      // A click into a filled box selects it, so typing replaces the value (SR-D02).
      const b = t.closest && t.closest('[data-act]');
      if (!b || !el.contains(b) || b.disabled || (solutionInst && b.closest('[data-sk-mini]'))) return;
      const act = b.dataset.act;
      if (act === 'undo') return undo();
      if (act === 'clear') return clearWork();
      if (act === 'check') return check();
      if (act === 'hint') return showHint(false);
      if (act === 'solution') return showHint(true);
      if (act === 'next' || act === 'back' || act === 'restart') return demoMove(act);
      if (mode === 'guided' && /^g-/.test(act)) return guidedHelpAct(act);
      if (act === 'i-retry') { feedbackHTML = ''; retryRow = false; renderCoach(); updateTools(); const wrong = gridHost.querySelectorAll('.sk-ans.is-no'); if (wrong.length) wrong[wrong.length - 1].focus({ preventScroll: true }); else focusOn('[data-k^="a"]'); return; }
      if (mode === 'guided') return guidedAct(act, b.dataset.v);
    }, sig);
    el.addEventListener('change', (e) => {
      const t = e.target;
      if (!t.matches || !t.matches('.sk-in[data-k^="r"]') || mode === 'guided') return;
      commitRegroup(Number(t.dataset.k.slice(1)), t.value);
    }, sig);
    el.addEventListener('input', (e) => {
      const t = e.target;
      if (!t.matches) return;
      if (t.matches('.sk-in[data-k^="r"]')) { const c = t.value.replace(/\D/g, '').slice(0, 2); if (c !== t.value) t.value = c; return; }
      if (!t.matches('.sk-in[data-k^="a"]')) return;
      const i = Number(t.dataset.k.slice(1));
      const v = t.value.replace(/\D/g, '').slice(-1);
      t.value = v; S.d[i] = v;
      while (S.d.length && S.d[S.d.length - 1] === '') S.d.pop();
      if (mode === 'independent') clearMarks();
      if (v && mode !== 'guided') { const nx = gridHost.querySelector(`[data-k="a${i + 1}"]`); if (nx) nx.focus({ preventScroll: true }); }
      emit('answer', { status: 'typing', digits: S.d.slice() });
      change();
    }, sig);
    el.addEventListener('keydown', (e) => {
      const t = e.target;
      if (!t.matches || !t.matches('.sk-in')) return;
      const kind = t.dataset.k[0], i = Number(t.dataset.k.slice(1));
      const go = (k) => { const x = gridHost.querySelector(`[data-k="${k}"]`); if (x) { e.preventDefault(); x.focus({ preventScroll: true }); if (x.select) x.select(); } };
      if (e.key === 'ArrowLeft') go(kind + (i + 1));
      else if (e.key === 'ArrowRight') go(kind + (i - 1));
      else if (e.key === 'ArrowUp' && kind === 'a') go('r' + i);
      else if (e.key === 'ArrowDown' && kind === 'r') go('a' + i);
      else if (e.key === 'Backspace' && kind === 'a' && t.value === '') go('a' + (i - 1));
      else if (e.key === 'Enter' && kind === 'r' && mode !== 'guided') { e.preventDefault(); commitRegroup(i, t.value); }
    }, sig);
    el.addEventListener('focusin', (e) => { const t = e.target; if (t.matches && t.matches('.sk-cur.sk-in') && t.select) t.select(); }, sig);
    // A tap or click into a filled regroup box selects it, so typing replaces the value (maxlength 2 would block it). The
    // browser places the caret after the pointer event, so select a moment later (review SR-D02).
    el.addEventListener('pointerup', (e) => { const t = e.target; if (t.matches && t.matches('.sk-cur.sk-in') && t.value) setTimeout(() => { if (document.activeElement === t && t.selectionStart === t.selectionEnd) t.select(); }, 0); }, sig);

    // ----- Public API -----
    function getState() { return clone(S); }
    function setState(s) {
      gHintText = ''; retryRow = false;
      if (!validState(s, top, bottom)) return false;
      S = Object.assign(clone(s), { mode });
      if (mode === 'guided' && !S.guided) S.guided = { col: 0, stage: 'needs', ex: 0 };
      if (DEMO && S.demo >= DEMO.length) S.demo = DEMO.length - 1;
      marks = {}; feedbackHTML = ''; prevNote = '';
      renderAll();
      return true;
    }
    function reset() {
      S = freshState(top, bottom, mode); marks = {}; feedbackHTML = ''; prevNote = '';
      renderAll(); announce('Work cleared.'); emit('reset', { scope: 'all' }); change();
    }
    function destroy() {
      if (destroyed) return;
      if (solutionInst) solutionInst.destroy();
      clearTimeout(sayTimer);
      ac.abort();
      destroyed = true;
      Object.keys(listeners).forEach((k) => delete listeners[k]);
      el.innerHTML = '';
      el.classList.remove('sk', 'sk-mode-' + mode);
      el.removeAttribute('data-sk');
      if (o.theme) Object.keys(o.theme).forEach((k) => el.style.removeProperty(k.startsWith('--') ? k : '--sk-' + k));
    }
    // After destroy() every method is a safe no-op (review SR-M11): a late callback from a host must not throw.
    const live1 = (fn, dead) => (...args) => (destroyed ? dead : fn(...args));
    const api = {
      id, mode, top, bottom,
      on, off, getState, destroy,
      setState: live1(setState, false), check: live1(check, null), reset: live1(reset, undefined),
      hint: live1(() => showHint(false)), showSolution: live1(() => showHint(true)),
      undo: live1(undo), clearWork: live1(clearWork), focus: live1(() => { focusOn('.sk-in, .sk-btn'); }),
      result: () => destroyed ? null : (mode === 'test' || mode === 'independent' ? Object.assign(M.gradeFinal(top, bottom, S.d), { marks: M.evaluateWork(top, bottom, S.ann).status }) : null),
      get helped() { return !!S.helped; },
      get destroyed() { return destroyed; }
    };
    renderAll();
    return api;
  }

  SK.mount = mount;
  SK.validState = validState;
  SK.text = TEXT;
  SK.version = '1.1.0';
})(typeof window !== 'undefined' ? window : globalThis);
