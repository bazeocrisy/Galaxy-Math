/*
 * SubtractKit.math: pure math for vertical subtraction with regrouping (exchanges). No DOM, no storage, no host app.
 * Works in a browser (window.SubtractKit.math) and in Node (module.exports). Places: index 0 = ones, 1 = tens,
 * 2 = hundreds, 3 = thousands. "Amounts" are the current number of units in each place; they may go above 9 while
 * regrouping (10 hundreds, 12 ones). State is never read from the screen.
 * Documented in docs/supplemental/subtract-regrouping/INTEGRATION.md; tested in tests/subtract-math.test.js.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.SubtractKit = Object.assign(root.SubtractKit || {}, { math: api });
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const PLACES = [
    { key: 'O', name: 'ones', one: 'one' },
    { key: 'T', name: 'tens', one: 'ten' },
    { key: 'H', name: 'hundreds', one: 'hundred' },
    { key: 'Th', name: 'thousands', one: 'thousand' }
  ];
  const MAX_TOP = 9999;
  const DIFFICULTIES = ['easy', 'medium', 'hard'];

  const isWhole = (n) => Number.isInteger(n) && n >= 0;
  const lengthOf = (n) => String(n).length;
  /** Digits of n from the ones up, padded to len places. */
  function digitsOf(n, len) {
    const s = String(n), out = [];
    for (let i = 0; i < (len || s.length); i++) out.push(i < s.length ? Number(s[s.length - 1 - i]) : 0);
    return out;
  }
  /** The represented value of a list of place amounts. */
  const value = (amounts) => amounts.reduce((sum, a, i) => sum + a * 10 ** i, 0);
  /** "2 thousands, 10 hundreds, 0 tens, 2 ones" (largest place first). */
  function describe(amounts) {
    const parts = [];
    for (let i = amounts.length - 1; i >= 0; i--) parts.push(`${amounts[i]} ${amounts[i] === 1 ? PLACES[i].one : PLACES[i].name}`);
    return parts.join(', ');
  }
  /** Whole operands with 0 ≤ bottom ≤ top ≤ 9,999 (answers are never negative). */
  function checkOperands(top, bottom) {
    if (!isWhole(top) || !isWhole(bottom)) return 'Operands must be whole numbers.';
    if (top > MAX_TOP) return 'The top number must be 9,999 or less.';
    if (bottom > top) return 'The bottom number must not be larger than the top number.';
    return '';
  }

  // ---------- Exchanges ----------
  /** Can 1 unit move from place `from` to place `from − 1`? */
  const canExchange = (amounts, from) => Number.isInteger(from) && from >= 1 && from < amounts.length && amounts[from] >= 1;
  /**
   * One adjacent exchange: place `from` gives 1 (−1); place `from − 1` gets 10 (+10). The value never changes.
   * Returns { ok: true, amounts, from, to } or { ok: false, reason } without touching the input.
   */
  function exchange(amounts, from) {
    if (!Number.isInteger(from) || from < 1 || from >= amounts.length) return { ok: false, reason: 'no-place' };
    if (amounts[from] < 1) return { ok: false, reason: 'nothing-to-give' };
    const next = amounts.slice();
    next[from] -= 1; next[from - 1] += 10;
    return { ok: true, amounts: next, from, to: from - 1 };
  }

  /**
   * The standard right-to-left method. For each column: if the current top amount is less than the bottom digit,
   * take from the nearest place on the left that has something, passing through zeros one exchange at a time.
   * Returns { top, bottom, size, columns: [{ place, before, needs, supplier, chain, exchanges, topNow, bottomDigit, digit }],
   *           exchanges: [{ from, to, before, after, forColumn }], final, answer }.
   */
  function plan(top, bottom) {
    const err = checkOperands(top, bottom);
    if (err) throw new Error(err);
    const size = lengthOf(top);
    let a = digitsOf(top, size);
    const b = digitsOf(bottom, size);
    const columns = [], exchanges = [];
    for (let i = 0; i < size; i++) {
      const col = { place: i, before: a.slice(), needs: a[i] < b[i], supplier: null, chain: 0, exchanges: [], bottomDigit: b[i] };
      if (col.needs) {
        let k = i + 1;
        while (a[k] === 0) k++; // a supplier always exists because top ≥ bottom
        col.supplier = k; col.chain = k - i - 1;
        for (let j = k; j > i; j--) {
          const before = a.slice();
          a = exchange(a, j).amounts;
          const ex = { from: j, to: j - 1, before, after: a.slice(), forColumn: i };
          exchanges.push(ex); col.exchanges.push(ex);
        }
      }
      col.topNow = a[i];
      col.digit = a[i] - b[i];
      columns.push(col);
    }
    return { top, bottom, size, columns, exchanges, final: a.slice(), answer: top - bottom };
  }

  /**
   * Difficulty from the standard method only:
   *  none: no exchange · easy: exactly one exchange, no zero chain · medium: two or more, no zero chain ·
   *  hard: some exchange passes through a zero-valued place. chain: the most zeros passed through (1 = one zero, 2+ = zeros next to each other).
   */
  function classify(top, bottom) {
    const p = plan(top, bottom);
    const n = p.exchanges.length;
    const chain = Math.max(0, ...p.columns.map((c) => c.chain));
    const difficulty = chain > 0 ? 'hard' : n === 0 ? 'none' : n === 1 ? 'easy' : 'medium';
    return { difficulty, exchanges: n, chain, size: p.size, regroupColumns: p.columns.filter((c) => c.needs).map((c) => c.place) };
  }

  // ---------- Supported combinations ----------
  /** Which difficulties a size can have under the rules above. */
  function supported(size) {
    if (size === 2) return ['easy']; // only tens → ones can be exchanged: no second exchange, no zero to pass through
    if (size === 3 || size === 4) return DIFFICULTIES.slice();
    return [];
  }
  /** '' when the combination is available, otherwise a plain sentence saying why. size: 2|3|4|'mixed'. */
  function unavailableReason(size, difficulty) {
    if (difficulty === 'mixed' || size === 'mixed') return '';
    if (supported(size).includes(difficulty)) return '';
    if (size === 2 && difficulty === 'medium') return 'Two-digit problems can only need one exchange (1 ten for 10 ones), so Medium is not possible. Choose Easy or Mixed, or pick 3-digit or 4-digit numbers.';
    if (size === 2 && difficulty === 'hard') return 'Hard problems exchange across a zero, which needs at least three digits. Choose Easy or Mixed, or pick 3-digit or 4-digit numbers.';
    return 'That combination is not available.';
  }

  // ---------- Generation ----------
  /** A small seeded random generator (same as Mathbook's pv.rng: mulberry32). */
  function rng(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  function shuffle(r, list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  /**
   * One problem. spec: { size: 2|3|4, difficulty: 'none'|'easy'|'medium'|'hard', chain?: 1|2 (hard only: exactly
   * one zero passed / two or more), minExchanges?, equal?: true (none only: top = bottom), avoid?: Set of 'top-bottom' }.
   * Returns { top, bottom, size, difficulty, chain, exchanges } or null if none was found.
   */
  function generateOne(r, spec) {
    const size = spec.size, diff = spec.difficulty;
    if (diff !== 'none' && !supported(size).includes(diff)) return null;
    for (let tries = 0; tries < 20000; tries++) {
      const zeroP = diff === 'hard' ? 0.42 : diff === 'none' ? 0.08 : 0.12;
      const td = [int(r, 1, 9)];
      for (let i = 1; i < size; i++) td.push(r() < zeroP ? 0 : int(r, 0, 9));
      const top = Number(td.join(''));
      let bottom;
      if (spec.equal) bottom = top;
      else {
        // Mostly the same length as the top, sometimes one shorter, rarely two shorter (so the higher columns get used).
        const lens = size === 4 ? [4, 4, 4, 4, 4, 3, 3, 3, 2] : size === 3 ? [3, 3, 3, 3, 2, 2] : [2, 2, 2, 2, 1];
        const L = lens[int(r, 0, lens.length - 1)];
        const bd = [int(r, 1, 9)];
        for (let i = 1; i < L; i++) bd.push(int(r, 0, 9));
        bottom = Number(bd.join(''));
      }
      if (bottom > top) continue;
      const key = top + '-' + bottom;
      if (spec.avoid && spec.avoid.has(key)) continue;
      const c = classify(top, bottom);
      if (c.difficulty !== diff) continue;
      if (spec.chain === 1 && c.chain !== 1) continue;
      if (spec.chain === 2 && c.chain < 2) continue;
      if (spec.minExchanges && c.exchanges < spec.minExchanges) continue;
      if (spec.avoid) spec.avoid.add(key);
      return { top, bottom, size, difficulty: diff, chain: c.chain, exchanges: c.exchanges };
    }
    return null;
  }

  /**
   * A practice session. opts: { size: 2|3|4|'mixed', difficulty: 'easy'|'medium'|'hard'|'mixed', length, seed }.
   * Mixed size: at least half 4-digit. Mixed difficulty: an even share of the supported difficulties plus about one in
   * six with no regrouping (some with equal numbers, so the answer is 0). Returns { items, error }.
   */
  function generateSession(opts) {
    const reason = unavailableReason(opts.size, opts.difficulty);
    if (reason) return { items: [], error: reason };
    const r = rng(opts.seed >>> 0), n = opts.length, avoid = new Set(), items = [];
    const sizesFor = (diff) => [2, 3, 4].filter((s) => diff === 'none' || supported(s).includes(diff));
    for (let i = 0; i < n; i++) {
      let diff = opts.difficulty;
      if (diff === 'mixed') diff = (i % 6 === 5) ? 'none' : null;
      let size = opts.size;
      if (size === 'mixed') size = i < Math.ceil(n / 2) ? 4 : null;
      if (!diff) {
        const pool = size ? supported(size) : DIFFICULTIES;
        diff = pool[i % pool.length];
      }
      if (!size) { const ok = sizesFor(diff).filter((s) => s !== 4 || r() < 0.34); size = ok.length ? ok[int(r, 0, ok.length - 1)] : 4; }
      const spec = { size, difficulty: diff, avoid };
      if (diff === 'none' && (i === 5 || r() < 0.25)) spec.equal = true; // the first no-regrouping slot is always equal numbers (answer 0)
      if (diff === 'hard' && size === 4) spec.chain = i % 2 ? 2 : 1;
      const q = generateOne(r, spec) || generateOne(r, { size, difficulty: diff, avoid });
      if (q) items.push(q);
    }
    return { items: shuffle(r, items), error: '' };
  }

  // ---------- Reading and grading ----------
  const blank = (v) => v === undefined || v === null || String(v).trim() === '';
  /**
   * The answer row, given as strings from the ones up. Empty boxes on the left are fine; a gap between digits is
   * incomplete; all empty is unanswered (never 0). Leading zeros are accepted, never required.
   * Returns { status: 'empty'|'incomplete'|'invalid'|'ok', value }.
   */
  function readAnswer(digits) {
    const d = (digits || []).map((v) => (blank(v) ? '' : String(v).trim()));
    let hi = -1;
    d.forEach((v, i) => { if (v !== '') hi = i; });
    if (hi < 0) return { status: 'empty', value: null };
    for (let i = 0; i <= hi; i++) {
      if (d[i] === '') return { status: 'incomplete', value: null };
      if (!/^\d$/.test(d[i])) return { status: 'invalid', value: null };
    }
    return { status: 'ok', value: d.slice(0, hi + 1).reduce((s, v, i) => s + Number(v) * 10 ** i, 0) };
  }
  /** A regrouped amount typed in a box: 0–99 written with digits only, or null for empty / not a number. */
  function readAmount(text) {
    if (blank(text)) return null;
    const s = String(text).trim();
    return /^\d{1,2}$/.test(s) ? Number(s) : NaN;
  }
  /** Final answer only (annotations never count). */
  function gradeFinal(top, bottom, digits) {
    const a = readAnswer(digits);
    if (a.status !== 'ok') return { status: a.status, correct: false, value: null };
    return { status: a.value === top - bottom ? 'correct' : 'wrong', correct: a.value === top - bottom, value: a.value };
  }
  /** Current amounts: the last regrouped value of each annotated place, else the original digit. ann: { place: [values…] }. */
  function amountsFrom(top, ann, size) {
    const a = digitsOf(top, size || lengthOf(top));
    Object.keys(ann || {}).forEach((k) => {
      const i = Number(k), hist = ann[k];
      if (!Array.isArray(hist) || !hist.length || i < 0 || i >= a.length) return;
      const v = hist[hist.length - 1];
      if (Number.isInteger(v) && v >= 0) a[i] = v;
    });
    return a;
  }
  /**
   * A regrouping-step answer (the top number written with its regrouped amounts). Any representation that keeps the
   * value and lets every column subtract without another exchange is right, not only the standard one.
   */
  function checkAmounts(top, bottom, amounts) {
    const size = lengthOf(top), b = digitsOf(bottom, size);
    const ok0 = Array.isArray(amounts) && amounts.length === size && amounts.every((v) => Number.isInteger(v) && v >= 0 && v <= 99);
    if (!ok0) return { ok: false, complete: false, valuePreserved: false, covers: false };
    const valuePreserved = value(amounts) === top;
    const covers = amounts.every((v, i) => v >= b[i]);
    return { ok: valuePreserved && covers, complete: true, valuePreserved, covers };
  }

  /**
   * The child's regrouping marks. status: 'none' (no marks) · 'valid' (value kept) · 'invalid'.
   * standard: the marks match a stage of the standard method; otherwise a valid set is "a different valid way".
   * issue (invalid only): 'no-reduce' (a place got 10 but the place on its left was not reduced) · 'zero-ten'
   * (exchanged through a zero but the zero kept 10 instead of giving 1 away) · 'skip-zero' (jumped over a zero) ·
   * 'changed-value'.
   */
  function evaluateWork(top, bottom, ann) {
    const size = lengthOf(top), orig = digitsOf(top, size);
    const marked = Object.keys(ann || {}).filter((k) => Array.isArray(ann[k]) && ann[k].length);
    if (!marked.length) return { status: 'none' };
    const cur = amountsFrom(top, ann, size);
    if (cur.some((v) => !Number.isInteger(v) || v < 0)) return { status: 'invalid', issue: 'changed-value' };
    if (value(cur) === top) {
      const p = plan(top, bottom);
      const stages = [digitsOf(top, size)].concat(p.exchanges.map((e) => e.after));
      const standard = stages.some((s) => s.every((v, i) => v === cur[i]));
      return { status: 'valid', standard };
    }
    const up = cur.map((v, i) => v - orig[i]);
    if (!up.some((d) => d < 0)) { const r = up.findIndex((d) => d === 10); if (r >= 0) return { status: 'invalid', issue: 'no-reduce', place: r }; }
    // Exchanged through zeros, but a zero kept its 10: places that were 0 now show 10.
    const tens = up.map((d, i) => (orig[i] === 0 && cur[i] === 10 ? i : -1)).filter((i) => i >= 0);
    if (tens.length && up.some((d) => d === -1)) return { status: 'invalid', issue: 'zero-ten', place: tens[0] };
    for (let r = 0; r < size; r++) {
      if (up[r] !== 10) continue;
      // +10 here: was a place on the left reduced by 1?
      if (r + 1 < size && up[r + 1] === 0 && orig[r + 1] > 0) return { status: 'invalid', issue: 'no-reduce', place: r };
      let k = r + 1;
      while (k < size && orig[k] === 0 && up[k] === 0) k++;
      if (k > r + 1 && k < size && up[k] === -1) return { status: 'invalid', issue: 'skip-zero', place: r, supplier: k };
    }
    return { status: 'invalid', issue: 'changed-value' };
  }

  /**
   * Practice feedback (never used for test results): specific mistakes found in the child's own work.
   * work: { ann, d } (d: answer digits from the ones up). Returns [{ kind, place }] — kinds: 'smaller-from-larger',
   * 'original-digit', 'misaligned', 'no-reduce', 'zero-ten', 'skip-zero', 'wrong-digit'.
   */
  function diagnose(top, bottom, work) {
    const size = lengthOf(top), orig = digitsOf(top, size), b = digitsOf(bottom, size);
    const p = plan(top, bottom), out = [];
    const ann = (work && work.ann) || {}, d = (work && work.d) || [];
    const ev = evaluateWork(top, bottom, ann);
    if (ev.status === 'invalid' && ev.issue !== 'changed-value') out.push({ kind: ev.issue, place: ev.place });
    const got = readAnswer(d);
    if (got.status === 'ok' && got.value !== top - bottom) {
      for (let k = 1; k < size; k++) if (bottom * 10 ** k <= top && got.value === top - bottom * 10 ** k) { out.push({ kind: 'misaligned', place: null }); break; }
    }
    for (let i = 0; i < size; i++) {
      if (blank(d[i]) || !/^\d$/.test(String(d[i]).trim())) continue;
      const v = Number(String(d[i]).trim());
      if (v === p.columns[i].digit) continue;
      const marked = Array.isArray(ann[i]) && ann[i].length;
      if (!marked && orig[i] < b[i] && v === b[i] - orig[i]) out.push({ kind: 'smaller-from-larger', place: i });
      else if (marked && orig[i] >= b[i] && v === orig[i] - b[i]) out.push({ kind: 'original-digit', place: i });
      else if (!out.some((x) => x.place === i)) out.push({ kind: 'wrong-digit', place: i });
    }
    return out;
  }

  // ---------- Someone else's work (error-analysis items) ----------
  /**
   * The work a child with one specific mistake would write. bug: 'smaller-from-larger' | 'no-reduce' |
   * 'original-digit' | 'zero-ten' | 'misaligned'. Returns { answer, ann, d, misaligned } or null when this mistake
   * would not change the answer (or would not give a sensible whole number).
   */
  function buggyWork(top, bottom, bug) {
    const size = lengthOf(top), orig = digitsOf(top, size), b = digitsOf(bottom, size);
    const ann = {}, d = [];
    const mark = (i, v) => { (ann[i] = ann[i] || []).push(v); };
    if (bug === 'misaligned') {
      const shift = size - lengthOf(bottom);
      if (shift < 1) return null;
      const wrong = top - bottom * 10 ** shift;
      if (wrong < 0 || wrong === top - bottom) return null;
      return { answer: wrong, ann: {}, d: digitsOf(wrong, size).map(String), misaligned: shift };
    }
    let a = orig.slice();
    for (let i = 0; i < size; i++) {
      if (bug === 'smaller-from-larger') { d.push(Math.abs(a[i] - b[i])); continue; }
      if (a[i] < b[i]) {
        if (bug === 'no-reduce') { mark(i, a[i] + 10); a[i] += 10; }
        else {
          let k = i + 1;
          while (a[k] === 0) k++;
          if (k >= size) return null;
          mark(k, a[k] - 1); a[k] -= 1;
          for (let j = k - 1; j > i; j--) {
            if (bug === 'zero-ten') { mark(j, 10); a[j] = 10; } else { mark(j, 10); mark(j, 9); a[j] = 9; }
          }
          mark(i, a[i] + 10); a[i] += 10;
        }
      }
      if (bug === 'original-digit' && Array.isArray(ann[i]) && orig[i] >= b[i] && !(orig[i] < b[i])) d.push(orig[i] - b[i]);
      else d.push(a[i] - b[i]);
    }
    if (d.some((x) => x < 0 || x > 9)) return null;
    const answer = d.reduce((s, x, i) => s + x * 10 ** i, 0);
    if (answer === top - bottom) return null;
    return { answer, ann, d: d.map(String), misaligned: 0 };
  }

  // ---------- Hints ----------
  /**
   * Five levels for the next column that is not finished (empty or wrong answer digit).
   * 1 the column to look at · 2 where an exchange can come from · 3 the exchange(s) · 4 the next worked step (this
   * column's digit) · 5 the full solution. Level 1 never contains the final answer. Returns { place, levels: [5 texts] }.
   */
  function hints(top, bottom, work) {
    const p = plan(top, bottom), d = (work && work.d) || [];
    const col = p.columns.find((c) => blank(d[c.place]) || String(d[c.place]).trim() !== String(c.digit)) || null;
    const full = solutionLines(top, bottom);
    if (!col) { const done = 'Every column has the right digit. Check your answer.'; return { place: null, levels: [done, done, done, done, full.join(' ')] }; }
    const P = PLACES[col.place], topNow = col.before[col.place];
    const l1 = `Look at the ${P.name} column. Is ${topNow} enough to take away ${col.bottomDigit}?`;
    let l2, l3;
    if (!col.needs) {
      l2 = `${topNow} is enough to take away ${col.bottomDigit}, so the ${P.name} column does not need an exchange.`;
      l3 = `Subtract in the ${P.name}: ${topNow} take away ${col.bottomDigit}.`; // no repeat of level 2 (review SR-D15)
    } else {
      const left = PLACES[col.place + 1];
      l2 = col.chain === 0
        ? `${topNow} is not enough. The ${left.name} place, just to the left, can give.`
        : `${topNow} is not enough. ${zeroNames(col)} 0, so look further left: the ${PLACES[col.supplier].name} place can give.`;
      l3 = col.exchanges.map((e) => `Exchange 1 ${PLACES[e.from].one} for 10 ${PLACES[e.to].name}.`).join(' ') +
        ` Now the top number is ${describe(col.exchanges[col.exchanges.length - 1].after)}.`;
    }
    const l4 = `${P.name.charAt(0).toUpperCase() + P.name.slice(1)}: ${col.topNow} − ${col.bottomDigit} = ${col.digit}. Write ${col.digit} in the ${P.name}.`;
    return { place: col.place, levels: [l1, l2, l3, l4, full.join(' ')] };
  }
  /** "The tens place has" / "The tens and hundreds places have" — the zeros an exchange must pass through. */
  function zeroNames(col) {
    const names = [];
    for (let k = col.place + 1; k < col.supplier; k++) names.push(PLACES[k].name);
    return names.length === 1 ? `The ${names[0]} place has` : `The ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} places have`;
  }
  /** Every step of the standard method, in words. */
  function solutionLines(top, bottom) {
    const p = plan(top, bottom), lines = [];
    p.columns.forEach((c) => {
      const P = PLACES[c.place];
      c.exchanges.forEach((e) => lines.push(`Exchange 1 ${PLACES[e.from].one} for 10 ${PLACES[e.to].name}: ${describe(e.after)}.`));
      lines.push(`${P.name.charAt(0).toUpperCase() + P.name.slice(1)}: ${c.topNow} − ${c.bottomDigit} = ${c.digit}.`);
    });
    lines.push(`So ${fmt(top)} − ${fmt(bottom)} = ${fmt(top - bottom)}.`);
    return lines;
  }
  const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return {
    PLACES, MAX_TOP, DIFFICULTIES, digitsOf, lengthOf, value, describe, fmt, checkOperands,
    canExchange, exchange, plan, classify, supported, unavailableReason,
    rng, shuffle, generateOne, generateSession,
    readAnswer, readAmount, gradeFinal, amountsFrom, checkAmounts, evaluateWork, diagnose, buggyWork,
    hints, solutionLines
  };
});
