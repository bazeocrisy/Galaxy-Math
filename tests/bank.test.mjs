import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const B = require('../js/mult-bank.js');
const L = require('../js/mult-lessons.js');
const V = require('../js/visuals.js');
function seeded(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Evaluate "a × b", "a + b", "a − b" or a full equation "x op y = z" (true/false). */
function evalExpr(s) {
  const m = /^(\d+) ([×+÷−]) (\d+)$/.exec(s.trim());
  if (!m) return null;
  const [x, op, y] = [+m[1], m[2], +m[3]];
  return op === '×' ? x * y : op === '+' ? x + y : op === '−' ? x - y : x / y;
}
function evalEquation(s) {
  const m = /^(.+) = (\d+)$/.exec(s);
  return m ? evalExpr(m[1]) === +m[2] : null;
}
const numbersIn = (s) => (s.match(/\d+/g) || []).map(Number).sort((a, b) => a - b).join(',');

test('twelve question types A–L with full metadata and real lessons', () => {
  assert.deepEqual(B.TYPES.map((t) => t.letter).join(''), 'ABCDEFGHIJKL');
  assert.equal(new Set(B.TYPES.map((t) => t.id)).size, 12);
  for (const t of B.TYPES) {
    for (const k of ['id', 'name', 'skill', 'difficulty', 'lesson', 'format']) assert.ok(t[k], `${t.id}.${k}`);
    assert.ok(L.getLesson(t.lesson), `${t.id}: lesson ${t.lesson} exists`);
  }
  // Teach covers every reasoning skill in the bank.
  const lessons = new Set(L.LESSONS.map((l) => l.id));
  for (const id of ['missing-factors', 'repeated-addition', 'connecting', 'arrays', 'equal-groups', 'word-problems', 'commutative', 'fact-families', 'check-the-work', 'times-as-many']) assert.ok(lessons.has(id), id);
});

test('every generated question is mathematically correct (all types × all facts 1–12)', () => {
  let made = 0;
  for (const t of B.TYPES) for (let fam = 1; fam <= 12; fam++) for (let other = 1; other <= 12; other++) for (let s = 0; s < 3; s++) {
    const q = B.generate(t.id, fam, other, { rng: seeded(fam * 1000 + other * 10 + s + t.letter.charCodeAt(0)) });
    if (!q) continue;
    made++;
    const where = `${t.id} ${fam}×${other}: ${q.prompt}`;
    assert.ok(q.prompt && q.prompt.length > 3, where);
    assert.equal(q.typeId, t.id);
    assert.equal(q.product, fam * other);
    assert.ok(Array.isArray(q.hints) && q.hints.length === 2 && q.hints.every((h) => h.text.length > 5), `${where} hints`);
    assert.ok(q.explain && q.explain.text.length > 5, `${where} explanation`);
    for (const v of [q.visual, q.explain.visual, ...q.hints.map((h) => h.visual)]) if (v) V.render(v);
    if (q.format === 'choice') {
      assert.ok(q.options.length >= 3, `${where} has 3+ options`);
      assert.equal(new Set(q.options).size, q.options.length, `${where} options unique`);
      assert.equal(q.options.filter((o) => o === q.answer).length, 1, `${where} answer listed once`);
      assert.ok(B.check(q, q.answer));
      for (const d of q.options.filter((o) => o !== q.answer)) assert.ok(!B.check(q, d), `${where} distractor ${d} rejected`);
    } else {
      assert.ok(Number.isInteger(q.answer) && q.answer > 0, where);
      assert.ok(B.check(q, String(q.answer)) && B.check(q, ` 0${q.answer} `), `${where} accepts spaces/leading zeros`);
      assert.ok(!B.check(q, String(q.answer + 1)) && !B.check(q, '') && !B.check(q, `${q.answer}.5`), where);
    }
    // Independent check of the right answer, type by type.
    const p = fam * other;
    switch (t.id) {
      case 'fact': case 'groups': case 'array': case 'word': assert.equal(q.answer, p, where); assert.equal(q.a * q.b, p, where); break;
      case 'missing': assert.equal(q.a * q.b, p); assert.ok(q.answer === q.a || q.answer === q.b, where); break;
      case 'repeated': { const adds = q.prompt.replace(' = ?', '').split(' + ').map(Number); assert.equal(adds.reduce((x, y) => x + y, 0), q.answer, where); assert.ok(adds.length >= 2); assert.match(q.sub, new RegExp(`${adds.length} groups with ${adds[0]} in each`)); break; }
      case 'match': {
        const target = q.visual ? (q.visual.kind === 'groups' ? q.visual.groups * q.visual.size : q.visual.rows * q.visual.cols)
          : q.prompt.match(/matches (.+)\?$/)[1].split(' + ').map(Number).reduce((x, y) => x + y, 0);
        assert.equal(evalExpr(q.answer), target, where);
        const [g, n] = q.answer.split(' × ').map(Number);
        for (const d of q.options.filter((o) => o !== q.answer)) { assert.notEqual(d, `${n} × ${g}`, `${where}: turned-around fact offered`); if (/×/.test(d)) assert.notEqual(evalExpr(d), target, `${where}: ${d} also equals ${target}`); }
        break;
      }
      case 'turnaround':
        if (q.format === 'number') assert.equal(q.answer, p, where);
        else { assert.equal(evalExpr(q.answer), p, where); for (const d of q.options.filter((o) => o !== q.answer)) assert.notEqual(evalExpr(d), p, `${where}: ${d}`); }
        break;
      case 'family':
        if (q.format === 'number') { assert.equal(q.answer * q.a, p, where); }
        else {
          assert.equal(evalEquation(q.answer), true, `${where}: answer is a true fact`);
          assert.equal(numbersIn(q.answer), numbersIn(`${q.a} ${q.b} ${p}`), `${where}: answer uses the family's numbers`);
          for (const d of q.options.filter((o) => o !== q.answer)) {
            assert.equal(evalEquation(d), true, `${where}: distractor ${d} is a true fact (no false facts shown)`);
            assert.notEqual(numbersIn(d), numbersIn(`${q.a} ${q.b} ${p}`), `${where}: distractor ${d} is in the same family`);
          }
        }
        break;
      case 'error': {
        const claim = +/= (\d+)\./.exec(q.prompt)[1];
        if (claim === p) assert.match(q.answer, /^Yes/, where); else assert.equal(q.answer, `No, ${q.a} × ${q.b} = ${p}`, where);
        assert.equal(q.a * q.b, p);
        break;
      }
      case 'compare': assert.equal(q.answer, q.a * q.b, where); assert.ok(q.a >= 2, `${where}: "1 times as many" never asked`); assert.equal(q.a * q.b, p); break;
      case 'equal': { const c = +/= (\d+) × \?/.exec(q.prompt)[1]; assert.equal(c * q.answer, p, where); assert.ok(c !== fam && c !== other); break; }
      default: assert.fail(t.id);
    }
  }
  assert.ok(made > 3000, `generated ${made} questions`);
});

test('every type has questions for core tables, and ineligible facts are skipped, not faked', () => {
  for (const t of B.TYPES) {
    const ok = [];
    for (let fam = 2; fam <= 10; fam++) for (let other = 2; other <= 10; other++) if (B.generate(t.id, fam, other, { rng: seeded(fam + other), maxFactor: 10 })) ok.push(1);
    assert.ok(ok.length >= 20, `${t.id}: ${ok.length} core questions`);
  }
  assert.equal(B.generate('turnaround', 6, 6, { rng: seeded(1) }), null, 'no turn-around of 6 × 6');
  assert.equal(B.generate('equal', 7, 1, { rng: seeded(1) }), null, '7 has no other factor pair');
  assert.equal(B.generate('compare', 1, 1, { rng: seeded(1) }), null);
  assert.equal(B.generate('repeated', 1, 7, { rng: seeded(1) }), null);
});

test('hints never show the answer in their pictures; compare bars never show the total', () => {
  for (const t of B.TYPES) for (let fam = 2; fam <= 10; fam++) for (let other = 2; other <= 10; other++) {
    const q = B.generate(t.id, fam, other, { rng: seeded(fam * 31 + other), maxFactor: 10 });
    if (!q) continue;
    for (const h of q.hints) {
      if (h.visual && h.visual.kind === 'jumps') assert.equal(h.visual.labels, false, `${t.id} ${fam}×${other}`);
      if (h.visual && h.visual.kind === 'compare') assert.doesNotMatch(V.render(h.visual), new RegExp(`>${q.answer}<`));
    }
    if (q.hints[0].text.split(/[^0-9]+/).includes(String(q.answer)) && !q.prompt.split(/[^0-9]+/).includes(String(q.answer))) assert.fail(`${t.id} clue gives ${q.answer}: ${q.hints[0].text}`);
  }
});

test('word problems include short and long stories with correct grammar', () => {
  const texts = new Set();
  for (let s = 0; s < 400; s++) { const q = B.generate('word', 1 + (s % 10), 1 + ((s * 7) % 10), { rng: seeded(s) }); texts.add(q.prompt); assert.doesNotMatch(q.prompt, /\b1 (bags|rows|teams|players|cookies|space cookies)\b/, q.prompt); }
  const lens = [...texts].map((x) => x.length);
  assert.ok(Math.min(...lens) < 90 && Math.max(...lens) > 150, `${Math.min(...lens)}–${Math.max(...lens)} characters`);
  assert.ok([...texts].some((x) => /baseball/.test(x)));
});

test('mixed sessions: exact size, balanced types, no back-to-back type, no duplicate questions', () => {
  for (const count of [10, 25, 50]) for (let s = 0; s < 5; s++) {
    const set = B.makeSet({ families: [2, 3, 4, 5, 6, 7, 8, 9, 10], count, rng: seeded(count * 10 + s) });
    assert.equal(set.length, count);
    for (let i = 1; i < set.length; i++) assert.notEqual(set[i].typeId, set[i - 1].typeId, `type repeated at ${i}`);
    assert.equal(new Set(set.map((q) => q.key)).size, count, 'no identical question');
    const per = {};
    for (const q of set) per[q.typeId] = (per[q.typeId] || 0) + 1;
    const n = Object.values(per);
    if (count >= 25) assert.equal(Object.keys(per).length, 12, 'all 12 types appear');
    assert.ok(Math.max(...n) - Math.min(...n) <= 2, `balanced: ${JSON.stringify(per)}`);
    assert.ok(set.every((q) => !q.extension), 'core facts only unless extension is on');
  }
});

test('small or partial pools still give the full session size', () => {
  const one = B.makeSet({ types: ['fact'], families: [2], count: 50, rng: seeded(1) });
  assert.equal(one.length, 50, 'one type, one table');
  const starter = B.makeSet({ types: B.STARTER_TYPES, families: [3], count: 25, rng: seeded(2) });
  assert.equal(starter.length, 25);
  assert.ok(starter.every((q) => B.STARTER_TYPES.includes(q.typeId)));
  const ext = B.makeSet({ families: [11, 12], extension: true, count: 10, rng: seeded(3) });
  assert.ok(ext.every((q) => q.fam >= 11));
  const noExt = B.makeSet({ families: [11, 12], extension: false, count: 10, rng: seeded(3) });
  assert.ok(noExt.every((q) => q.fam <= 10 && q.other <= 10), 'extension tables ignored when extension is off');
});

test('practice-my-misses pairs revisit the same facts and types', () => {
  const pairs = [{ type: 'error', fam: 6, other: 7 }, { type: 'compare', fam: 4, other: 3 }];
  const set = B.makeSet({ pairs, count: 4, rng: seeded(4) });
  assert.equal(set.length, 4);
  assert.ok(set.every((q) => ['6x7', '4x3'].includes(q.factKey)));
  assert.ok(set.some((q) => q.typeId === 'error') && set.some((q) => q.typeId === 'compare'));
});

test('unlocked Lab types: starters, plus lessons completed or 3+ right answers in Practice (challenge kinds need their lesson)', () => {
  assert.deepEqual(B.unlockedTypes([], {}), B.STARTER_TYPES.slice().sort((a, b) => B.TYPES.findIndex((t) => t.id === a) - B.TYPES.findIndex((t) => t.id === b)));
  assert.ok(B.unlockedTypes(['check-the-work'], {}).includes('error'));
  assert.ok(B.unlockedTypes([], { missing: 3 }).includes('missing'));
  assert.ok(!B.unlockedTypes([], { missing: 2 }).includes('missing'));
  assert.ok(!B.unlockedTypes([], { compare: 30 }).includes('compare'), 'times as many needs its lesson');
  assert.ok(B.unlockedTypes(['times-as-many'], {}).includes('compare'));
  assert.ok(B.STARTER_TYPES.includes('turnaround') && B.STARTER_TYPES.includes('match'), 'the Lab starts with reasoning kinds too');
  assert.equal(B.unlockedTypes(L.LESSONS.map((l) => l.id), {}).length, 12);
});

test('skill statuses are constructive and never awarded from one short session', () => {
  const labels = [B.skillStatus(), B.skillStatus({ correct: 1, total: 2, sessions: 1 }), B.skillStatus({ correct: 2, total: 10, sessions: 3 }),
    B.skillStatus({ correct: 8, total: 10, sessions: 1 }), B.skillStatus({ correct: 10, total: 10, sessions: 1 }), B.skillStatus({ correct: 19, total: 20, sessions: 2 })].map((s) => s.label);
  assert.deepEqual(labels, ['Not tried yet', 'Just starting', 'Growing — keep practicing', 'Getting stronger', 'Getting stronger', 'Strong']);
  for (const l of labels) assert.doesNotMatch(l, /weak|poor|bad|fail/i);
});

test('session scoring counts unanswered and splits results by type', () => {
  const q1 = B.generate('fact', 3, 4, { rng: seeded(1) }), q2 = B.generate('error', 6, 7, { rng: seeded(2) }), q3 = B.generate('compare', 4, 3, { rng: seeded(3) });
  const sc = B.scoreSession([{ q: q1, given: '12' }, { q: q2, given: q2.options.find((o) => o !== q2.answer) }, { q: q3, given: null }]);
  assert.deepEqual([sc.total, sc.correct, sc.incorrect, sc.unanswered, sc.percent], [3, 1, 1, 1, 33]);
  assert.deepEqual(sc.byType.fact, { correct: 1, total: 1 });
  assert.equal(sc.missed.length, 2);
});

// ---- regression tests for the independent audit (AUDIT-REPORT.md) ----
test('A-01: every "use a fact you know" hint is correct arithmetic', () => {
  for (let fam = 1; fam <= 12; fam++) for (let other = 1; other <= 12; other++) for (let s = 0; s < 6; s++) {
    const q = B.generate('error', fam, other, { rng: seeded(fam * 97 + other * 7 + s) });
    const m = /(\d+) × (\d+) = (\d+)\. Then add one more (\d+)/.exec(q.hints[1].text);
    if (m) { const [x, y, z, w] = m.slice(1).map(Number); assert.equal(x * y, z, q.hints[1].text); assert.equal(z + w, q.a * q.b, q.hints[1].text); }
    else assert.match(q.hints[1].text, /just/, q.hints[1].text);
  }
});

test('A-04: the missing-factor strategy picture never shows all the jumps', () => {
  for (let fam = 1; fam <= 12; fam++) for (let other = 1; other <= 12; other++) {
    const q = B.generate('missing', fam, other, { rng: seeded(fam * 13 + other) });
    const v = q.hints[1].visual;
    if (v) assert.ok(v.jumps < q.answer, `${q.prompt}: ${v.jumps} jumps for answer ${q.answer}`);
  }
});

test('A-13: extension match pictures match the equation', () => {
  for (const [f, o] of [[11, 11], [11, 12], [12, 12]]) for (let s = 0; s < 20; s++) {
    const q = B.generate('match', f, o, { rng: seeded(s) });
    const v = q.explain.visual;
    if (v) assert.equal(v.kind === 'groups' ? v.groups * v.size : v.rows * v.cols, q.a * q.b, q.prompt);
  }
});

test('A-14: with core facts only, no 11s, 12s or products over 100 appear anywhere', () => {
  for (const t of B.TYPES) for (let fam = 1; fam <= 10; fam++) for (let other = 1; other <= 10; other++) for (let s = 0; s < 4; s++) {
    const q = B.generate(t.id, fam, other, { rng: seeded(fam * 100 + other + s * 7), maxFactor: 10 });
    if (!q) continue;
    const all = [q.prompt, ...(q.options || [])].join(' | ');
    for (const m of all.matchAll(/(\d+) × (\d+)/g)) assert.ok(+m[1] <= 10 && +m[2] <= 10, `${t.id}: ${all}`);
    for (const m of all.matchAll(/\d+/g)) assert.ok(+m[0] <= 100, `${t.id}: ${all}`);
  }
});

test('A-18: a fact-family question never offers the given fact back as the answer', () => {
  for (let n = 1; n <= 12; n++) for (let s = 0; s < 20; s++) {
    const q = B.generate('family', n, n, { rng: seeded(n * 31 + s) });
    if (q.format === 'choice') assert.notEqual(q.answer, `${n} × ${n} = ${n * n}`);
  }
});

test('A-08 / A-22: Practice keeps challenge kinds behind their lessons; hints do not hand over the equation', () => {
  assert.deepEqual(B.practiceTypes([]).sort(), ['array', 'fact', 'family', 'groups', 'match', 'missing', 'repeated', 'turnaround', 'word']);
  assert.ok(B.practiceTypes(['check-the-work']).includes('error'));
  assert.match(B.TYPE.compare.name, /challenge/);
  for (let s = 0; s < 30; s++) {
    const w = B.generate('word', 4, 7, { rng: seeded(s) }), c = B.generate('compare', 4, 7, { rng: seeded(s) });
    assert.doesNotMatch(w.hints[1].text, /\d+ × \d+/, w.hints[1].text);
    assert.doesNotMatch(c.hints[1].text, /\d+ × \d+/, c.hints[1].text);
  }
});
