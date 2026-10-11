import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const M = createRequire(import.meta.url)('../js/mult-math.js');
function seeded(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

test('all 12 times tables: every fact 1–12 × 1–12 is correct', () => {
  const facts = M.factsFor(M.FAMILIES);
  assert.equal(facts.length, 144);
  for (const f of facts) {
    const q = M.makeQuestion('fact', f.fam, f.other, seeded(f.fam * 100 + f.other));
    assert.equal(q.answer, f.fam * f.other);
    assert.equal(q.a * q.b, q.answer, q.prompt);
    assert.deepEqual([q.a, q.b].sort((x, y) => x - y), [f.fam, f.other].sort((x, y) => x - y));
    assert.equal(q.prompt, `${q.a} × ${q.b} = ?`);
  }
});

test('core vs extension facts', () => {
  assert.equal(M.isExtension(10, 10), false);
  assert.equal(M.isExtension(9, 7), false);
  assert.equal(M.isExtension(11, 3), true);
  assert.equal(M.isExtension(3, 12), true);
  const core = M.factsFor(M.FAMILIES).filter((f) => !M.isExtension(f.fam, f.other));
  assert.equal(core.length, 100);
  assert.ok(core.every((f) => f.fam * f.other <= 100));
});

test('factsFor validates the chosen tables', () => {
  assert.deepEqual(M.cleanFamilies([3, '3', 0, 13, 'x', 7]), [3, 7]);
  assert.deepEqual(M.cleanFamilies([]), M.FAMILIES);
  assert.equal(M.factsFor([5]).length, 12);
  assert.ok(M.factsFor([5]).every((f) => f.fam === 5));
});

test('missing factor questions hide a real factor', () => {
  for (const fam of M.FAMILIES) for (let other = 1; other <= 12; other++) {
    const q = M.makeQuestion('missing', fam, other, seeded(fam * 31 + other));
    assert.equal(q.a * q.b, q.product);
    if (q.hidden === 'a') { assert.equal(q.answer, q.a); assert.equal(q.prompt, `? × ${q.b} = ${q.product}`); }
    else { assert.equal(q.answer, q.b); assert.equal(q.prompt, `${q.a} × ? = ${q.product}`); }
  }
});

test('equal groups, arrays and repeated addition describe the same multiplication', () => {
  for (const fam of M.FAMILIES) for (let other = 1; other <= 12; other++) {
    const r = seeded(fam * 7 + other);
    const arr = M.makeQuestion('array', fam, other, r);
    assert.deepEqual(arr.visual, { kind: 'array', rows: arr.a, cols: arr.b });
    assert.equal(arr.answer, arr.a * arr.b);
    if (M.groupShape(fam, other)) {
      const g = M.makeQuestion('groups', fam, other, r);
      assert.ok(g.visual.groups <= 10);
      assert.equal(g.visual.groups * g.visual.size, g.answer);
      const rep = M.makeQuestion('repeated', fam, other, r);
      const addends = rep.prompt.replace(' = ?', '').split(' + ').map(Number);
      assert.equal(addends.length, rep.a);
      assert.ok(addends.every((n) => n === rep.b));
      assert.equal(addends.reduce((s, n) => s + n, 0), rep.answer);
    }
  }
  assert.equal(M.groupShape(11, 12), null, 'no 11 or 12 groups picture');
});

test('word problems use the right numbers and grammar', () => {
  for (let i = 0; i < 200; i++) {
    const r = seeded(i), fam = 1 + (i % 12), other = 1 + ((i * 5) % 12);
    const q = M.makeQuestion('word', fam, other, r);
    assert.equal(q.answer, fam * other);
    assert.ok(q.prompt.includes(String(q.a)) || q.a === 1, q.prompt);
    assert.doesNotMatch(q.prompt, /\b1 (bags|rows|boxes|planets|marbles|crayons|moons|muffins|astronauts)\b/, q.prompt);
  }
});

test('hints never contain the answer as the final count; explanations always do', () => {
  for (const type of M.PRACTICE_TYPES) for (const [fam, other] of [[3, 4], [7, 8], [6, 9], [2, 5], [10, 10]]) {
    const q = M.makeQuestion(type, fam, other, seeded(fam + other));
    const h = M.hintFor(q), e = M.explainFor(q);
    assert.ok(h.text.length > 10, `${type} hint`);
    assert.ok(e.text.includes(String(q.answer)), `${type} explanation includes the answer: ${e.text}`);
    if (type !== 'repeated' && type !== 'word' && q.answer > 3 * Math.max(q.a, q.b)) assert.ok(!h.text.split(/[ ,.:]/).includes(String(q.answer)), `${type} hint gives away ${q.answer}: ${h.text}`);
  }
});

test('practice set: requested length, variety, no avoidable duplicates', () => {
  for (const count of [10, 20, 30]) {
    const set = M.makePracticeSet({ families: [3, 7], count, rng: seeded(count) });
    assert.equal(set.length, count);
    assert.equal(new Set(set.map((q) => q.key)).size, count, 'no identical question twice');
    for (let i = 1; i < set.length; i++) assert.notEqual(set[i].factKey, set[i - 1].factKey, 'same fact twice in a row');
    assert.ok(set.every((q) => q.fam === 3 || q.fam === 7));
    assert.ok(new Set(set.map((q) => q.type)).size >= 5, 'mixes question types');
  }
  const one = M.makePracticeSet({ families: [4], count: 30, rng: seeded(4) });
  assert.equal(new Set(one.map((q) => q.key)).size, 30);
});

test('practice my misses uses only the missed facts', () => {
  const facts = [{ fam: 7, other: 8 }, { fam: 6, other: 9 }];
  const set = M.makePracticeSet({ facts, count: 10, rng: seeded(9) });
  assert.ok(set.every((q) => ['7x8', '6x9'].includes(q.factKey)));
});

test('test set: 10/20/36 fact questions, spread before repeating', () => {
  for (const count of [10, 20, 36]) {
    const set = M.makeTestSet({ families: M.FAMILIES, count, rng: seeded(count) });
    assert.equal(set.length, count);
    assert.ok(set.every((q) => q.type === 'fact'));
    assert.equal(new Set(set.map((q) => q.factKey)).size, count, 'no repeats when 144 facts are available');
  }
  const small = M.makeTestSet({ families: [2], count: 36, rng: seeded(2) });
  const counts = {};
  for (const q of small) counts[q.factKey] = (counts[q.factKey] || 0) + 1;
  assert.equal(Object.keys(counts).length, 12);
  assert.ok(Object.values(counts).every((n) => n === 3), 'each of 12 facts exactly 3 times');
  for (let i = 1; i < small.length; i++) assert.notEqual(small[i].factKey, small[i - 1].factKey);
});

test('isCorrect accepts only the right whole number', () => {
  const q = M.makeQuestion('fact', 6, 7, seeded(1));
  assert.equal(M.isCorrect(q, '42'), true);
  assert.equal(M.isCorrect(q, 42), true);
  for (const bad of ['', null, undefined, '41', '4 2', '42.0', '-42', 'abc']) assert.equal(M.isCorrect(q, bad), false, String(bad));
});

test('scoring counts correct, incorrect and unanswered against all assigned questions', () => {
  const qs = [M.makeQuestion('fact', 2, 3, seeded(1)), M.makeQuestion('fact', 2, 4, seeded(2)), M.makeQuestion('fact', 5, 5, seeded(3)), M.makeQuestion('fact', 5, 6, seeded(4))];
  const s = M.scoreTest([{ q: qs[0], given: '6', ms: 1200 }, { q: qs[1], given: '9', ms: 900 }, { q: qs[2], given: null }, { q: qs[3], given: '30', ms: 2000 }]);
  assert.equal(s.total, 4);
  assert.equal(s.correct, 2);
  assert.equal(s.incorrect, 1);
  assert.equal(s.unanswered, 1);
  assert.equal(s.percent, 50);
  assert.deepEqual(s.byFamily[2], { correct: 1, total: 2, ms: 1200, timedCorrect: 1 });
  assert.deepEqual(s.byFamily[5], { correct: 1, total: 2, ms: 2000, timedCorrect: 1 });
  assert.deepEqual(s.missed.map((m) => m.result), ['incorrect', 'unanswered']);
  assert.equal(s.avgCorrectMs, 1600);
  const none = M.scoreTest(qs.map((q) => ({ q, given: null })));
  assert.equal(none.percent, 0);
  assert.equal(none.unanswered, 4);
  assert.equal(M.scoreTest(qs.map((q) => ({ q, given: String(q.answer) }))).avgCorrectMs, null, 'untimed: no speed');
});

test('mastery: 90%+ on a table in two separate full tests (5+ questions each); retries and small samples do not count', () => {
  const t = (kind, correct, total) => ({ kind, byFamily: { 7: { correct, total } } });
  assert.equal(M.masteryFor([t('test', 9, 10)], 7).mastered, false);
  assert.equal(M.masteryFor([t('test', 9, 10), t('test', 5, 5)], 7).mastered, true);
  assert.equal(M.masteryFor([t('test', 9, 10), t('test', 8, 10)], 7).mastered, false, '80% does not count');
  assert.equal(M.masteryFor([t('test', 9, 10), t('retry', 10, 10)], 7).mastered, false, 'retry of misses does not count');
  assert.equal(M.masteryFor([t('test', 4, 4), t('test', 4, 4)], 7).mastered, false, 'needs at least 5 questions');
  assert.equal(M.masteryFor([t('test', 10, 10), t('test', 10, 10)], 3).mastered, false, 'other table');
  assert.equal(M.masteryFor(undefined, 7).passes, 0);
});

test('no "1 groups" style grammar anywhere, and no repeated addition of a single number', () => {
  for (const type of M.PRACTICE_TYPES) for (const fam of M.FAMILIES) for (const other of [1, 2, 7]) {
    for (let s = 0; s < 4; s++) {
      if ((type === 'groups' || type === 'repeated') && !M.groupShape(fam, other)) continue;
      if (type === 'repeated' && (fam === 1 || other === 1)) continue;
      const q = M.makeQuestion(type, fam, other, seeded(s * 97 + fam * 13 + other));
      const all = [q.prompt, M.hintFor(q).text, M.explainFor(q).text].join(' | ');
      assert.doesNotMatch(all, /\b1 (groups|rows|times|planets|bags|boxes|rockets|dots)\b|There are 1\b|\b1 planets? each/, all);
    }
  }
  const set = M.makePracticeSet({ families: [1], count: 30, rng: seeded(5) });
  assert.ok(!set.some((q) => q.type === 'repeated'), '×1 facts skip repeated addition');
  assert.deepEqual(M.groupShape(7, 1), [7, 1], '7 × 1 pictured as 7 groups of 1');
});

test('hints stop before the answer (factors 2–12, all types except missing factor)', () => {
  for (const type of ['fact', 'groups', 'array', 'repeated', 'word']) for (let fam = 2; fam <= 12; fam++) for (let other = 2; other <= 12; other++) {
    if ((type === 'groups' || type === 'repeated') && !M.groupShape(fam, other)) continue;
    const q = M.makeQuestion(type, fam, other, seeded(fam * 50 + other));
    const h = M.hintFor(q);
    assert.ok(!h.text.split(/[^0-9]+/).includes(String(q.answer)) || q.answer === q.a || q.answer === q.b, `${type} ${q.a}×${q.b}: ${h.text}`);
    if (h.visual && h.visual.kind === 'jumps') assert.equal(h.visual.labels, false, 'number-line hint hides the total');
  }
});

test('test decks share questions evenly between the chosen tables', () => {
  const quota = M.tableQuotas([2, 5, 7], 20, seeded(1));
  assert.equal(Object.values(quota).reduce((s, n) => s + n, 0), 20);
  assert.ok(Object.values(quota).every((n) => n === 6 || n === 7));
  const set = M.makeTestSet({ families: [3, 4], count: 10, rng: seeded(3) });
  const per = {};
  for (const x of set) per[x.fam] = (per[x.fam] || 0) + 1;
  assert.deepEqual(per, { 3: 5, 4: 5 }, 'two tables in a 10-question test: 5 each, so both can count toward mastery');
  assert.equal(M.masteryTableLimit(10), 2);
  assert.equal(M.masteryTableLimit(20), 4);
  assert.equal(M.masteryTableLimit(36), 7);
  for (let s = 0; s < 30; s++) {
    const t = M.makeTestSet({ families: [6], count: 36, rng: seeded(s) });
    for (let i = 1; i < t.length; i++) assert.notEqual(t[i].factKey, t[i - 1].factKey, `seed ${s}`);
  }
});

test('practice-my-misses length: two questions per missed fact, 4 to 30', () => {
  assert.equal(M.missPracticeCount(1), 4);
  assert.equal(M.missPracticeCount(3), 6);
  assert.equal(M.missPracticeCount(40), 30);
  const one = M.makePracticeSet({ facts: [{ fam: 8, other: 7 }], count: M.missPracticeCount(1), rng: seeded(8) });
  assert.equal(new Set(one.map((q) => q.key)).size, one.length, 'no identical question when the fact allows enough types');
});
