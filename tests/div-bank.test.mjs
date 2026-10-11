import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const D = require('../js/div-math.js');
const B = require('../js/div-bank.js');
const V = require('../js/visuals.js');
function seeded(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const dots = (s) => (s.match(/class="dot[" ]/g) || []).length;
/** Evaluate "a op b = c" (op ×, ÷, +, −) → true/false; "a op b" → value. */
function evalExpr(s) { const m = /^(\d+) ([×÷+−]) (\d+)$/.exec(s.trim()); if (!m) return null; const [x, op, y] = [+m[1], m[2], +m[3]]; return op === '×' ? x * y : op === '+' ? x + y : op === '−' ? x - y : x / y; }
function trueEq(s) { const m = /^(.+) = (\d+)$/.exec(s); return m ? evalExpr(m[1]) === +m[2] : null; }
const nums = (s) => (s.match(/\d+/g) || []).map(Number).sort((a, b) => a - b).join(',');

test('division facts: whole-number quotients, never divide by zero, core vs extension', () => {
  const all = D.factsFor(D.FAMILIES);
  assert.equal(all.length, 144);
  for (const f of all) {
    const q = D.makeFact(f.fam, f.other);
    assert.ok(q.divisor >= 1, 'divisor never 0');
    assert.equal(q.dividend / q.divisor, q.answer);
    assert.ok(Number.isInteger(q.dividend / q.divisor));
    assert.equal(q.prompt, `${q.dividend} ÷ ${q.divisor} = ?`);
  }
  assert.throws(() => D.makeFact(0, 5));
  assert.equal(all.filter((f) => !D.isExtension(f.fam, f.other)).length, 100);
  assert.ok(all.filter((f) => !D.isExtension(f.fam, f.other)).every((f) => f.fam * f.other <= 100));
});

test('division test decks: 10/20/36, families shared evenly, right answers', () => {
  for (const count of [10, 20, 36]) {
    const set = D.makeTestSet({ families: [6, 7], count, maxFactor: 10, rng: seeded(count) });
    assert.equal(set.length, count);
    for (const q of set) { assert.ok([6, 7].includes(q.divisor)); assert.equal(q.divisor * q.answer, q.dividend); assert.ok(q.answer <= 10); }
  }
  const sc = D.scoreTest([{ q: D.makeFact(6, 7), given: '7' }, { q: D.makeFact(6, 8), given: '9' }, { q: D.makeFact(6, 9), given: null }]);
  assert.deepEqual([sc.correct, sc.incorrect, sc.unanswered, sc.percent], [1, 1, 1, 33]);
});

test('twelve division kinds A–L with metadata', () => {
  assert.equal(B.TYPES.map((t) => t.letter).join(''), 'ABCDEFGHIJKL');
  for (const t of B.TYPES) for (const k of ['id', 'name', 'skill', 'difficulty', 'lesson', 'format']) assert.ok(t[k], `${t.id}.${k}`);
});

test('every generated division problem is mathematically correct (all kinds × facts 1–12)', () => {
  let made = 0;
  for (const t of B.TYPES) for (let d = 1; d <= 12; d++) for (let q0 = 1; q0 <= 12; q0++) for (let s = 0; s < 4; s++) {
    const q = B.generate(t.id, d, q0, { rng: seeded(d * 977 + q0 * 31 + s * 7 + t.letter.charCodeAt(0)) });
    if (!q) continue;
    made++;
    const p = d * q0, where = `${t.id} ${p}÷${d}: ${q.prompt}`;
    assert.equal(q.dividend, p); assert.equal(q.divisor, d); assert.equal(q.quotient, q0);
    assert.ok(q.hints.length === 2 && q.hints.every((h) => h.text.length > 5), `${where} hints`);
    assert.ok(q.explain.text.includes(String(q0)), `${where} explanation states the quotient`);
    for (const v of [q.visual, q.explain.visual, ...q.hints.map((h) => h.visual)]) if (v) V.render(v);
    assert.doesNotMatch(q.prompt + (q.options || []).join(' '), /÷ 0\b|remainder|R\d/, `${where}: no ÷0, no remainders`);
    // hint pictures never show the finished answer, and a hint that says "Here is/are" always has a picture
    for (const h of q.hints) {
      if (/\bHere (is|are)\b/.test(h.text)) assert.ok(h.visual, `${where}: "${h.text}" promises a picture`);
      if (h.visual && h.visual.kind === 'share') assert.ok(h.visual.dealt < q0, `${where}: sharing hint gives the answer away`);
      if (h.visual && h.visual.kind === 'grouping') assert.ok(h.visual.circled < q0, `${where}: grouping hint gives the answer away`);
      if (h.visual && h.visual.kind === 'jumpsBack') assert.ok(h.visual.shown >= 1 && h.visual.shown < q0, `${where}: jumps hint`);
      const m = /every group has (\d+)/.exec(h.text); if (m) assert.equal(+m[1], h.visual.dealt, `${where}: hint text matches the picture`);
    }
    // no singular/plural slips such as "1 groups" or "after 1 subtractions"
    for (const s of [q.prompt, q.explain.text, ...q.hints.map((h) => h.text)]) assert.doesNotMatch(s, /\b1 (equal )?(groups|rows|subtractions|rounds|dots)\b|These 1 /, `${where}: ${s}`);
    if (q.format === 'choice') {
      assert.equal(new Set(q.options).size, q.options.length, `${where} unique options`);
      assert.equal(q.options.filter((o) => o === q.answer).length, 1);
      for (const o of q.options.filter((o) => o !== q.answer)) assert.ok(!B.check(q, o));
    } else {
      assert.ok(B.check(q, String(q.answer)) && !B.check(q, String(q.answer + 1)));
    }
    switch (t.id) {
      case 'dfact': assert.equal(q.answer, q0); assert.equal(q.prompt, `${p} ÷ ${d} = ?`); break;
      case 'missdivisor': assert.equal(q.answer, d); assert.equal(p / q.answer, q0); break;
      case 'missdividend': assert.equal(q.answer, p); assert.equal(q.answer / d, q0); break;
      case 'share': assert.equal(q.answer, q0); assert.match(q.prompt, new RegExp(`${p} .*${d}`)); assert.deepEqual([q.visual.total, q.visual.groups], [p, d], 'sharing picture: total and number of groups'); break;
      case 'group': assert.equal(q.answer, q0); assert.deepEqual([q.visual.total, q.visual.size], [p, d], 'grouping picture: total and group size'); break;
      case 'darray': assert.equal(q.visual.rows * q.visual.cols, p); assert.equal(q.answer, q0, 'the answer is the quotient (stays in the divisor family)'); assert.ok(q.prompt.includes(String(d))); break;
      case 'subtract': assert.equal(q.answer, q0); assert.equal(p - q.answer * d, 0); break;
      case 'dfamily':
        if (q.format === 'number') { assert.equal(q.answer, q0); assert.match(q.prompt, new RegExp(`So ${p} ÷ ${d} = \\?$`), 'stays in the divisor family'); }
        else {
          assert.equal(trueEq(q.answer), true); assert.equal(nums(q.answer), nums(`${p} ${d} ${q0}`));
          for (const o of q.options.filter((o) => o !== q.answer)) { assert.equal(trueEq(o), true, `${where}: ${o} is a true fact`); assert.notEqual(nums(o), nums(`${p} ${d} ${q0}`), `${where}: ${o} not in the family`); }
        }
        break;
      case 'related':
        if (q.format === 'number') assert.equal(q.answer, q0);
        else { assert.equal(q.answer, `${d} × ${q0} = ${p}`); if (d !== q0) assert.ok(!q.options.includes(`${q0} × ${d} = ${p}`), 'no second correct fact'); for (const o of q.options) assert.equal(trueEq(o), true, o); }
        break;
      case 'dmatch':
        assert.equal(q.answer, `${p} ÷ ${d}`); assert.equal(evalExpr(q.answer), q0);
        if (d !== q0) assert.ok(!q.options.includes(`${p} ÷ ${q0}`), 'no second reading of the picture offered');
        assert.equal(dots(V.render(q.visual)), p, 'picture has exactly the dividend');
        break;
      case 'dword': assert.equal(q.answer, q0); break;
      case 'derror': {
        const right = q.options.filter((o) => +o.split('= ')[1] === q0);
        assert.equal(right.length, 1, `${where}: exactly one correct student`); assert.equal(right[0], q.answer);
        assert.match(q.explain.text, / (said \d+, but|subtracted instead)/, `${where}: explanation names each mistake`); break;
      }
      default: assert.fail(t.id);
    }
  }
  assert.ok(made > 4000, `generated ${made}`);
});

test('the right choice is not always the middle value (fact families and Who is right?)', () => {
  let middle = 0, total = 0;
  for (const id of ['dfamily', 'derror']) for (let d = 2; d <= 10; d++) for (let q0 = 2; q0 <= 10; q0++) for (let s = 0; s < 6; s++) {
    const q = B.generate(id, d, q0, { rng: seeded(d * 131 + q0 * 17 + s), maxFactor: 10 });
    if (!q || q.format !== 'choice') continue;
    const vals = q.options.map((o) => +o.split('= ')[1]).sort((a, b) => a - b);
    total++; if (vals[1] === q0 && vals[0] === q0 - 1 && vals[2] === q0 + 1) middle++;
  }
  assert.ok(middle / total < 0.2, `${middle} of ${total} have the answer as the middle of three numbers in a row`);
});

test('pictures match the numbers exactly (sharing, grouping, repeated subtraction, arrays)', () => {
  for (let d = 2; d <= 10; d++) for (let q0 = 1; q0 <= 10; q0++) {
    const p = d * q0;
    assert.equal(dots(V.render({ kind: 'share', total: p, groups: d })), p);
    assert.equal(dots(V.render({ kind: 'share', total: p, groups: d, dealt: q0 })), p);
    assert.equal((V.render({ kind: 'share', total: p, groups: d }).match(/class="grp plate"/g) || []).length, d);
    assert.equal(dots(V.render({ kind: 'grouping', total: p, size: d, circled: q0 })), p);
    assert.equal((V.render({ kind: 'grouping', total: p, size: d, circled: q0 }).match(/class="ring"/g) || []).length, q0);
    assert.equal((V.render({ kind: 'jumpsBack', jumps: q0, size: d }).match(/hop back/g) || []).length, q0);
  }
  assert.match(V.render({ kind: 'bracket', dividend: 42, divisor: 6, quotient: 7, labels: true }), />divisor<.*>dividend<.*quotient/s);
});

test('sharing and grouping are told apart in wording and hints', () => {
  for (let s = 0; s < 40; s++) {
    const sh = B.generate('share', 6, 4, { rng: seeded(s) }), gr = B.generate('group', 6, 4, { rng: seeded(s) });
    assert.match(sh.hints[0].text, /sharing/); assert.match(gr.hints[0].text, /grouping/);
    assert.doesNotMatch(sh.prompt, /in each (bag|box)|teams of|each ride/); assert.match(gr.prompt, /in each bag|holds|teams of|Each ride takes/);
  }
});

test('hint pictures never show the whole answer', () => {
  for (const t of B.TYPES) for (let d = 2; d <= 10; d++) for (let q0 = 3; q0 <= 10; q0++) {
    const q = B.generate(t.id, d, q0, { rng: seeded(d * 13 + q0) });
    if (!q) continue;
    const v = q.hints[1].visual;
    if (!v) continue;
    if (v.kind === 'jumps') assert.ok(v.jumps < q0 && v.labels === false, `${t.id}`);
    if (v.kind === 'share') assert.ok(v.dealt < q0, `${t.id} share dealt ${v.dealt}`);
    if (v.kind === 'grouping') assert.ok(v.circled < q0, `${t.id} grouping`);
    if (v.kind === 'jumpsBack') assert.ok(v.shown < q0 && v.labels === false, `${t.id} jumpsBack`);
  }
});

test('core settings keep every number within third-grade range; word problems have short and long stories', () => {
  for (const t of B.TYPES) for (let d = 1; d <= 10; d++) for (let q0 = 1; q0 <= 10; q0++) {
    const q = B.generate(t.id, d, q0, { rng: seeded(d * 7 + q0), maxFactor: 10 });
    if (!q) continue;
    for (const m of [q.prompt, ...(q.options || [])].join(' ').matchAll(/\d+/g)) assert.ok(+m[0] <= 110, `${t.id}: ${q.prompt}`);
  }
  const lens = [];
  for (let s = 0; s < 200; s++) lens.push(B.generate('dword', 5, 6, { rng: seeded(s) }).prompt.length);
  assert.ok(Math.min(...lens) < 80 && Math.max(...lens) > 130, `${Math.min(...lens)}–${Math.max(...lens)}`);
});

test('mixed sessions: 10/25/50, balanced kinds, no back-to-back kind, no duplicates', () => {
  for (const count of [10, 25, 50]) {
    const set = B.makeSet({ families: [2, 3, 4, 5, 6, 7, 8, 9, 10], count, rng: seeded(count) });
    assert.equal(set.length, count);
    for (let i = 1; i < set.length; i++) assert.notEqual(set[i].typeId, set[i - 1].typeId);
    assert.equal(new Set(set.map((q) => q.key)).size, count);
    if (count >= 25) assert.equal(new Set(set.map((q) => q.typeId)).size, 12);
    assert.ok(set.every((q) => q.divisor >= 1 && q.dividend === q.divisor * q.quotient));
  }
  assert.equal(B.makeSet({ types: ['dfact'], families: [2], count: 50, rng: seeded(1) }).length, 50);
  assert.ok(!B.practiceTypes([]).includes('derror'));
  assert.ok(B.practiceTypes(['explain-errors']).includes('derror'));
  assert.deepEqual(B.unlockedTypes([], {}).sort(), B.STARTER_TYPES.slice().sort());
});
