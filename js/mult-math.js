/* Galaxy Math multiplication engine: facts, practice/test question generation, hints, explanations, scoring
   and mastery. Pure functions only (no DOM), shared by the page (window.GalaxyMult) and the Node unit tests. */
(function (root) {
  'use strict';

  const FAMILIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const CORE_MAX = 10;              // third-grade fluency: both factors 1–10 (products within 100)
  const PRACTICE_TYPES = ['fact', 'missing', 'groups', 'array', 'repeated', 'word'];
  const TYPE_NAMES = { fact: 'Fact', missing: 'Missing factor', groups: 'Equal groups', array: 'Array', repeated: 'Repeated addition', word: 'Word problem' };
  const MASTERY_PCT = 0.9, MASTERY_TESTS = 2, MASTERY_MIN_QUESTIONS = 5;

  const isExtension = (a, b) => a > CORE_MAX || b > CORE_MAX;
  const factKey = (fam, other) => `${fam}x${other}`;
  function parseFactKey(k) { const m = /^(\d+)x(\d+)$/.exec(k); return m ? { fam: +m[1], other: +m[2] } : null; }

  function shuffle(arr, rng = Math.random) {
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  }
  function cleanFamilies(families) {
    const out = [...new Set((families || []).map(Number))].filter((n) => Number.isInteger(n) && n >= 1 && n <= 12).sort((a, b) => a - b);
    return out.length ? out : [...FAMILIES];
  }

  /** Every fact in the chosen times tables: fam × 1 … fam × maxFactor. */
  function factsFor(families, maxFactor = 12) {
    const out = [];
    for (const fam of cleanFamilies(families)) for (let other = 1; other <= maxFactor; other++) out.push({ fam, other });
    return out;
  }

  /** count facts drawn without repeats until the list is used up, then reshuffled (never the same fact twice in a row). */
  function drawFacts(facts, count, rng = Math.random) {
    const out = [];
    let bag = [];
    while (out.length < count) {
      if (!bag.length) {
        bag = shuffle(facts.slice(), rng);
        const last = out[out.length - 1];
        if (last && bag.length > 1 && bag[0].fam === last.fam && bag[0].other === last.other) bag.push(bag.shift());
      }
      out.push(bag.shift());
    }
    return out;
  }

  const plural = (n, word, many = word + 's') => `${n} ${n === 1 ? word : many}`;

  // Story templates for word problems: g groups with n in each.
  const WORD_TEMPLATES = [
    (g, n) => ({ text: `There ${g === 1 ? 'is' : 'are'} ${plural(g, 'bag')}. Each bag has ${plural(n, 'marble')}. How many marbles are there in all?`, unit: 'marbles' }),
    (g, n) => ({ text: `A garden has ${plural(g, 'row')} of carrots with ${n} in each row. How many carrots are in the garden?`, unit: 'carrots' }),
    (g, n) => ({ text: `${g === 1 ? 'One rocket carries' : `${g} rockets each carry`} ${plural(n, 'astronaut')}. How many astronauts is that altogether?`, unit: 'astronauts' }),
    (g, n) => ({ text: `There ${g === 1 ? 'is' : 'are'} ${plural(g, 'box', 'boxes')} of crayons. Each box has ${plural(n, 'crayon')}. How many crayons are there?`, unit: 'crayons' }),
    (g, n) => ({ text: `${plural(g, 'planet')} each ${g === 1 ? 'has' : 'have'} ${plural(n, 'moon')}. How many moons in all?`, unit: 'moons' }),
    (g, n) => ({ text: `A muffin tray has ${plural(g, 'row')} with ${plural(n, 'muffin')} in each row. How many muffins fit in the tray?`, unit: 'muffins' })
  ];

  // groups / repeated addition need a picture with at most 10 groups; returns [groups, size] or null.
  function groupShape(fam, other) {
    if (other <= CORE_MAX) return [other, fam];
    if (fam <= CORE_MAX) return [fam, other];
    return null;
  }
  const eligible = (type, f) => (type === 'groups' || type === 'repeated') ? !!groupShape(f.fam, f.other) : true;

  /** Build one question of a given type for fact fam × other. rng decides the order the factors are shown in. */
  function makeQuestion(type, fam, other, rng = Math.random) {
    const p = fam * other;
    const swap = rng() < 0.5;
    const [a, b] = swap ? [other, fam] : [fam, other];
    const base = { type, fam, other, product: p, key: `${type}:${factKey(fam, other)}`, factKey: factKey(fam, other), extension: isExtension(fam, other) };
    if (type === 'fact') {
      return { ...base, a, b, answer: p, prompt: `${a} × ${b} = ?`, equation: `${a} × ${b} = ${p}` };
    }
    if (type === 'missing') {
      const hideFirst = rng() < 0.5;
      return { ...base, a, b, answer: hideFirst ? a : b, hidden: hideFirst ? 'a' : 'b',
        prompt: hideFirst ? `? × ${b} = ${p}` : `${a} × ? = ${p}`, equation: `${a} × ${b} = ${p}` };
    }
    if (type === 'groups') {
      const [g, n] = groupShape(fam, other);
      return { ...base, a: g, b: n, answer: p, prompt: `There are ${plural(g, 'group')} with ${n} in each group. How many are there in all?`,
        visual: { kind: 'groups', groups: g, size: n }, equation: `${g} × ${n} = ${p}` };
    }
    if (type === 'array') {
      return { ...base, a, b, answer: p, prompt: `This array has ${plural(a, 'row')} with ${b} in each row. How many dots are there?`,
        visual: { kind: 'array', rows: a, cols: b }, equation: `${a} × ${b} = ${p}` };
    }
    if (type === 'repeated') {
      const [g, n] = groupShape(fam, other);
      return { ...base, a: g, b: n, answer: p, prompt: `${Array(g).fill(n).join(' + ')} = ?`, equation: `${g} × ${n} = ${p}` };
    }
    if (type === 'word') {
      const t = WORD_TEMPLATES[Math.floor(rng() * WORD_TEMPLATES.length)](a, b);
      return { ...base, a, b, answer: p, prompt: t.text, unit: t.unit, equation: `${a} × ${b} = ${p}` };
    }
    throw new Error(`unknown question type ${type}`);
  }

  function skipCount(step, times) { return Array.from({ length: times }, (_, i) => step * (i + 1)); }

  /** A hint that helps without giving the answer away. */
  function hintFor(q) {
    const { a, b } = q;
    switch (q.type) {
      case 'fact': return { text: `Think of ${a} groups of ${b}. Skip-count by ${b}s, ${a} times: ${skipCount(b, Math.min(a, 3)).join(', ')}, …`, visual: a <= 10 && b <= 12 ? { kind: 'array', rows: a, cols: b } : null };
      case 'missing': {
        const known = q.hidden === 'a' ? b : a;
        return { text: `What number times ${known} makes ${q.product}? Count by ${known}s until you reach ${q.product}: ${skipCount(known, 3).join(', ')}, …` };
      }
      case 'groups': return { text: `Count by ${b}s, one group at a time: ${skipCount(b, Math.min(a, 3)).join(', ')}, …` };
      case 'array': return { text: `Each row has ${b}. Count by ${b}s, one row at a time: ${skipCount(b, Math.min(a, 3)).join(', ')}, …` };
      case 'repeated': return { text: `${b} is added ${a} times. That is the same as ${a} × ${b}.`, visual: { kind: 'jumps', jumps: a, size: b } };
      case 'word': return { text: `How many groups are there? How many are in each group? Then multiply: ${a} × ${b}.` };
      default: return { text: '' };
    }
  }

  /** What to show after a mistake: the correct answer, why, and a picture of the mathematics. */
  function explainFor(q) {
    const { a, b, product: p } = q;
    const counts = skipCount(b, a).join(', ');
    switch (q.type) {
      case 'fact': return { text: `${a} × ${b} means ${a} groups of ${b}. Count by ${b}s: ${counts}. So ${a} × ${b} = ${p}.`, visual: a <= 12 ? { kind: 'array', rows: a, cols: b } : null };
      case 'missing': return { text: `${a} × ${b} = ${p}, so the missing factor is ${q.answer}. Check: ${a} rows of ${b} make ${p}.`, visual: { kind: 'array', rows: a, cols: b } };
      case 'groups': return { text: `There are ${a} groups and ${b} in each group. Count by ${b}s: ${counts}. ${a} × ${b} = ${p}.`, visual: { kind: 'groups', groups: a, size: b } };
      case 'array': return { text: `${a} rows with ${b} in each row is ${a} × ${b}. Count by ${b}s: ${counts}. There are ${p} dots.`, visual: { kind: 'array', rows: a, cols: b } };
      case 'repeated': return { text: `Adding ${b} ${a} times is ${a} × ${b}. The jumps land on ${counts}. The total is ${p}.`, visual: { kind: 'jumps', jumps: a, size: b } };
      case 'word': return { text: `There are ${a} groups with ${b} in each group, so multiply: ${a} × ${b} = ${p} ${q.unit}.`, visual: a <= 10 ? { kind: 'groups', groups: a, size: b } : { kind: 'array', rows: a, cols: b } };
      default: return { text: '' };
    }
  }

  /** Untimed practice: count questions from the chosen tables (or from specific facts for "Practice My Misses"). */
  function makePracticeSet({ families, count = 10, types = PRACTICE_TYPES, facts, rng = Math.random } = {}) {
    const pool = facts && facts.length ? facts : factsFor(families);
    const chosen = drawFacts(pool, count, rng);
    const used = new Set();
    let typeBag = [];
    return chosen.map((f) => {
      if (!typeBag.length) typeBag = shuffle(types.slice(), rng);
      // Prefer the next type in the bag that suits this fact and has not been asked about this fact yet.
      // Otherwise any unused type for this fact; repeat a question only when every type was already asked.
      const fresh = (t) => eligible(t, f) && !used.has(`${t}:${factKey(f.fam, f.other)}`);
      const idx = typeBag.findIndex(fresh);
      let type;
      if (idx >= 0) type = typeBag.splice(idx, 1)[0];
      else type = shuffle(types.filter(fresh), rng)[0] || types.find((t) => eligible(t, f)) || 'fact';
      const q = makeQuestion(type, f.fam, f.other, rng);
      used.add(q.key);
      return q;
    });
  }

  /** Test deck: count fact questions from the chosen tables, avoiding repeats where the tables allow. */
  function makeTestSet({ families, count = 10, facts, rng = Math.random } = {}) {
    const pool = facts && facts.length ? facts : factsFor(families);
    return drawFacts(pool, count, rng).map((f) => makeQuestion('fact', f.fam, f.other, rng));
  }

  /** Answer check: only whole numbers typed by the child count. */
  function isCorrect(q, given) {
    if (given === null || given === undefined || given === '') return false;
    return /^\d+$/.test(String(given)) && Number(given) === q.answer;
  }

  /** Score a finished test. responses: [{ q, given: string|null, ms }]. Unanswered = no answer given; it still counts in the total.
      ms (answer time) is only passed for timed tests, so speed comes from timed recall alone. */
  function scoreTest(responses) {
    const total = responses.length;
    let correct = 0, incorrect = 0, unanswered = 0, ms = 0, timedCorrect = 0;
    const byFamily = {}, missed = [];
    for (const r of responses) {
      const f = (byFamily[r.q.fam] ||= { correct: 0, total: 0, ms: 0, timedCorrect: 0 });
      f.total++;
      const blank = r.given === null || r.given === undefined || r.given === '';
      if (blank) { unanswered++; missed.push({ ...r, result: 'unanswered' }); }
      else if (isCorrect(r.q, r.given)) { correct++; f.correct++; if (typeof r.ms === 'number') { ms += r.ms; timedCorrect++; f.ms += r.ms; f.timedCorrect++; } }
      else { incorrect++; missed.push({ ...r, result: 'incorrect' }); }
    }
    return {
      total, correct, incorrect, unanswered,
      percent: total ? Math.round((correct / total) * 100) : 0,
      byFamily, missed,
      avgCorrectMs: timedCorrect ? Math.round(ms / timedCorrect) : null
    };
  }

  /** Per-table mastery: at least 90% on that table in two separate full tests that each asked it at least 5 times. */
  function masteryFor(tests, fam) {
    const qualifying = (tests || []).filter((t) => t && t.kind === 'test' && t.byFamily && t.byFamily[fam] &&
      t.byFamily[fam].total >= MASTERY_MIN_QUESTIONS && t.byFamily[fam].correct / t.byFamily[fam].total >= MASTERY_PCT);
    return { passes: qualifying.length, needed: MASTERY_TESTS, mastered: qualifying.length >= MASTERY_TESTS };
  }

  const api = {
    FAMILIES, CORE_MAX, PRACTICE_TYPES, TYPE_NAMES, MASTERY_PCT, MASTERY_TESTS, MASTERY_MIN_QUESTIONS,
    isExtension, factKey, parseFactKey, shuffle, cleanFamilies, factsFor, drawFacts, makeQuestion, hintFor, explainFor,
    makePracticeSet, makeTestSet, isCorrect, scoreTest, masteryFor, skipCount, groupShape
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GalaxyMult = api;
})(this);
