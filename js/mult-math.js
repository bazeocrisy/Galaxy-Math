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
    (g, n) => ({ text: `${g === 1 ? 'One planet has' : `${g} planets each have`} ${plural(n, 'moon')}. How many moons in all?`, unit: 'moons' }),
    (g, n) => ({ text: `A muffin tray has ${plural(g, 'row')} with ${plural(n, 'muffin')} in each row. How many muffins fit in the tray?`, unit: 'muffins' }),
    (g, n) => ({ text: `${g === 1 ? 'One baseball team has' : `${g} baseball teams each have`} ${plural(n, 'player')}. How many players are there?`, unit: 'players' }),
    // a deliberately long story, so layouts are tested with long text too
    (g, n) => ({ text: `The Galaxy Math rocket club is packing snack bags for a trip to the Moon. They fill ${plural(g, 'bag')} and put ${plural(n, 'space cookie')} in ${g === 1 ? 'it' : 'every bag'}. How many space cookies did they pack altogether?`, unit: 'space cookies' })
  ];

  // groups / repeated addition need a picture with at most 10 groups; returns [groups, size] or null.
  // Prefer more than one group (7 × 1 is pictured as 7 groups of 1, not "1 group of 7").
  function groupShape(fam, other) {
    const options = [[other, fam], [fam, other]].filter(([g]) => g <= CORE_MAX);
    return options.find(([g]) => g > 1) || options[0] || null;
  }
  // Repeated addition of a single number ("7 = ?") is not repeated addition, so ×1 facts skip that type.
  const eligible = (type, f) => type === 'groups' ? !!groupShape(f.fam, f.other)
    : type === 'repeated' ? !!groupShape(f.fam, f.other) && f.fam > 1 && f.other > 1 : true;
  const isAre = (n) => (n === 1 ? 'is' : 'are');

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
      return { ...base, a: g, b: n, answer: p, prompt: `There ${isAre(g)} ${plural(g, 'group')} with ${n} in each group. How many are there in all?`,
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
  /** The start of a skip-count that always stops before the answer: "8, 16, …" for 3 × 8 (never reaching 24). */
  function countStart(step, times) {
    const n = Math.min(times - 1, 3);
    return n >= 1 ? `${skipCount(step, n).join(', ')}, …` : `${step}`;
  }
  const times = (n) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);

  /** A hint that helps without giving the answer away. Pictures in hints never show the total. */
  function hintFor(q) {
    const { a, b } = q;
    switch (q.type) {
      case 'fact': return a === 1 ? { text: `1 × ${b} means just one group of ${b}.` }
        : { text: `Think of ${plural(a, 'group')} of ${b}. Skip-count by ${b}s, ${times(a)}: ${countStart(b, a)}`, visual: a <= 10 ? { kind: 'array', rows: a, cols: b } : null };
      case 'missing': {
        const known = q.hidden === 'a' ? b : a;
        return { text: `What number times ${known} makes ${q.product}? Count by ${known}s until you reach ${q.product}, and count how many jumps that took.` };
      }
      case 'groups': return { text: a === 1 ? `There is only one group. How many are in it?` : `Count by ${b}s, one group at a time: ${countStart(b, a)}` };
      case 'array': return { text: a === 1 ? `There is only one row. How many dots are in it?` : `Each row has ${b}. Count by ${b}s, one row at a time: ${countStart(b, a)}` };
      case 'repeated': return { text: `${b} is added ${times(a)}. That is the same as ${a} × ${b}.`, visual: { kind: 'jumps', jumps: a, size: b, labels: false } };
      case 'word': return { text: `How many groups are there? How many are in each group? Then multiply: ${a} × ${b}.` };
      default: return { text: '' };
    }
  }

  /** What to show after a mistake: the correct answer, why, and a picture of the mathematics. */
  function explainFor(q) {
    const { a, b, product: p } = q;
    const counts = skipCount(b, a).join(', ');
    switch (q.type) {
      case 'fact': return { text: `${a} × ${b} means ${plural(a, 'group')} of ${b}. Count by ${b}s: ${counts}. So ${a} × ${b} = ${p}.`, visual: { kind: 'array', rows: a, cols: b } };
      case 'missing': return { text: `${a} × ${b} = ${p}, so the missing factor is ${q.answer}. Check: ${plural(a, 'row')} of ${b} make ${p}.`, visual: { kind: 'array', rows: a, cols: b } };
      case 'groups': return { text: `There ${isAre(a)} ${plural(a, 'group')} with ${b} in each group. Count by ${b}s: ${counts}. ${a} × ${b} = ${p}.`, visual: { kind: 'groups', groups: a, size: b } };
      case 'array': return { text: `${plural(a, 'row')} with ${b} in each row is ${a} × ${b}. Count by ${b}s: ${counts}. There ${isAre(p)} ${plural(p, 'dot')}.`, visual: { kind: 'array', rows: a, cols: b } };
      case 'repeated': return { text: `Adding ${b} ${times(a)} is ${a} × ${b}. The jumps land on ${counts}. The total is ${p}.`, visual: { kind: 'jumps', jumps: a, size: b } };
      case 'word': return { text: `There ${isAre(a)} ${plural(a, 'group')} with ${b} in each group, so multiply: ${a} × ${b} = ${p} ${q.unit}.`, visual: a <= 10 ? { kind: 'groups', groups: a, size: b } : { kind: 'array', rows: a, cols: b } };
      default: return { text: '' };
    }
  }

  /** Length of a "practice my misses" session for n missed facts: two questions per fact, 4 to 30. */
  const missPracticeCount = (n) => Math.min(30, Math.max(4, 2 * n));

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

  /** Random order with the same fact never twice in a row (when that is possible). A fact that fills more than
      half of what is left must go next, otherwise any other fact is picked at random, weighted by how many remain. */
  function spreadOut(items, rng = Math.random) {
    const groups = new Map();
    for (const it of items) { const k = factKey(it.fam, it.other); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(it); }
    const out = [];
    let prev = null, left = items.length;
    while (left > 0) {
      const keys = [...groups.keys()].filter((k) => groups.get(k).length && k !== prev);
      const pool = keys.length ? keys : [prev];
      const urgent = pool.find((k) => groups.get(k).length * 2 > left);
      let pick = urgent;
      if (!pick) {
        let r = rng() * pool.reduce((s, k) => s + groups.get(k).length, 0);
        pick = pool.find((k) => (r -= groups.get(k).length) < 0) || pool[pool.length - 1];
      }
      out.push(groups.get(pick).pop()); prev = pick; left--;
    }
    return out;
  }

  /** How many questions each table gets when count questions are shared evenly (leftovers go to random tables). */
  function tableQuotas(families, count, rng = Math.random) {
    const fams = cleanFamilies(families), base = Math.floor(count / fams.length);
    const quota = Object.fromEntries(fams.map((f) => [f, base]));
    for (const f of shuffle(fams.slice(), rng).slice(0, count - base * fams.length)) quota[f]++;
    return quota;
  }
  /** Most tables a test of count questions can include while each still gets the 5 needed for mastery. */
  const masteryTableLimit = (count) => Math.floor(count / MASTERY_MIN_QUESTIONS);

  /** Test deck: count fact questions. Chosen tables share the questions evenly (so results by table are fair),
      no fact repeats while a table still has unused facts, and the same fact never comes twice in a row. */
  function makeTestSet({ families, count = 10, facts, maxFactor = 12, rng = Math.random } = {}) {
    let picked;
    if (facts && facts.length) picked = drawFacts(facts, count, rng);
    else {
      const quota = tableQuotas(families, count, rng);
      picked = shuffle(Object.entries(quota).flatMap(([f, n]) => drawFacts(factsFor([+f], maxFactor), n, rng)), rng);
    }
    picked = spreadOut(picked, rng);
    return picked.map((f) => makeQuestion('fact', f.fam, f.other, rng));
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
    makePracticeSet, makeTestSet, tableQuotas, masteryTableLimit, missPracticeCount, isCorrect, scoreTest, masteryFor, skipCount, groupShape
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GalaxyMult = api;
})(this);
