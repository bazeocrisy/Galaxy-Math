import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const L = require('../js/div-lessons.js');
const B = require('../js/div-bank.js');
const V = require('../js/visuals.js');
const dots = (s) => (s.match(/class="dot[" ]/g) || []).length;

test('fifteen division lessons in the required order (remainders last, as an extension)', () => {
  assert.deepEqual(L.LESSONS.map((l) => l.id), ['what-division-means', 'equal-sharing', 'equal-grouping', 'share-or-group', 'div-equations', 'div-arrays',
    'repeated-subtraction', 'div-using-mult', 'div-fact-families', 'missing-divisors', 'missing-dividends', 'div-word-problems', 'check-with-mult', 'explain-errors', 'remainders']);
  const rem = L.getLesson('remainders');
  assert.ok(rem.extension && rem.challenge && /extension/i.test(rem.title));
  assert.deepEqual(L.UNITS.flatMap((u) => u.ids).sort(), L.LESSONS.map((l) => l.id).sort(), 'every lesson is in exactly one unit');
  for (const t of B.TYPES) assert.ok(L.getLesson(t.lesson), `${t.id} → ${t.lesson}`);
});

test('every lesson has all parts, a real picture, and feedback for every question', () => {
  for (const l of L.LESSONS) {
    assert.ok(l.objective.startsWith('I can'), l.id);
    assert.ok(l.words.length >= 1 && l.explain.text.length >= 2 && l.explain.visual && l.explain.caption, l.id);
    assert.ok(V.render(l.explain.visual).length > 100, `${l.id} picture`);
    assert.ok(l.example.steps.length >= 3 && l.example.visual, `${l.id} worked example`);
    assert.ok(l.guided.hint && l.guided.explain, `${l.id} guided`);
    assert.equal(l.check.length, 3);
    for (const q of [l.guided, ...l.check]) {
      assert.ok(q.explain, `${l.id}: ${q.prompt}`);
      for (const v of [q.visual, q.hintVisual, q.explainVisual]) if (v) V.render(v);
      if (q.type === 'choice') { assert.equal(q.options.filter((o) => o === q.answer).length, 1, q.prompt); assert.equal(new Set(q.options).size, q.options.length); }
      else assert.ok(Number.isInteger(q.answer) && q.answer > 0, q.prompt);
    }
  }
});

test('lesson answers are mathematically right', () => {
  for (const l of L.LESSONS) for (const q of [l.guided, ...l.check]) {
    let m;
    if ((m = /^(\d+) ÷ (\d+) = \?$/.exec(q.prompt))) assert.equal(q.answer, m[1] / m[2], q.prompt);
    if ((m = /^(\d+) ÷ \? = (\d+)$/.exec(q.prompt))) assert.equal(q.answer, m[1] / m[2], q.prompt);
    if ((m = /^\? ÷ (\d+) = (\d+)$/.exec(q.prompt))) assert.equal(q.answer, m[1] * m[2], q.prompt);
    if ((m = /^(\d+) × \? = (\d+), so \2 ÷ \1 = \?$/.exec(q.prompt))) assert.equal(q.answer, m[2] / m[1], q.prompt);
    if ((m = /^Use (?:the array|subtraction to find)[: ]*(\d+) ÷ (\d+)/.exec(q.prompt))) assert.equal(q.answer, m[1] / m[2], q.prompt);
    if (l.id === 'remainders') continue;
    // sharing / grouping pictures hold exactly the numbers in the question, and the answer is the exact quotient
    if (q.visual && q.visual.kind === 'share') { assert.ok(q.prompt.includes(String(q.visual.total)) && q.prompt.includes(String(q.visual.groups)), q.prompt); assert.equal(dots(V.render(q.visual)), q.visual.total);
      if (q.type === 'number') assert.equal(q.answer, q.visual.total / q.visual.groups, q.prompt); }
    if (q.visual && q.visual.kind === 'grouping') { assert.ok(q.prompt.includes(String(q.visual.total)) && q.prompt.includes(String(q.visual.size)), q.prompt);
      if (q.type === 'number') assert.equal(q.answer, q.visual.total / q.visual.size, q.prompt); }
    if (q.visual && q.visual.kind === 'array' && q.type === 'number') assert.ok([q.visual.rows, q.visual.cols].includes(q.answer), q.prompt);
  }
  const rem = L.getLesson('remainders');
  assert.deepEqual([rem.guided.answer, ...rem.check.map((q) => q.answer)], [11 - 3 * 3, 14 - 4 * 3, Math.floor(10 / 3), 20 % 6]);
});

test('every equation written in a lesson is true (except the deliberate mistakes in the checking lessons)', () => {
  const skip = new Set(['explain-errors', 'check-with-mult', 'remainders']);
  for (const l of L.LESSONS) {
    if (skip.has(l.id)) continue;
    const texts = [...l.explain.text, l.explain.caption, l.example.title, ...l.example.steps, l.guided.explain, ...l.check.map((q) => q.explain)];
    for (const s of texts) for (const m of s.replace(/\*\*/g, '').matchAll(/(\d+) ([×÷]) (\d+) = (\d+)/g)) {
      const [a, op, b, c] = [+m[1], m[2], +m[3], +m[4]];
      assert.equal(op === '×' ? a * b : a / b, c, `${l.id}: "${m[0]}" in "${s}"`);
    }
  }
  // the mistakes shown in the checking lessons are labelled as wrong options, never as the answer
  for (const id of ['explain-errors', 'check-with-mult']) for (const q of [L.getLesson(id).guided, ...L.getLesson(id).check]) {
    if (q.type !== 'choice') continue;
    const m = /(\d+) ÷ (\d+) = (\d+)/.exec(q.answer);
    if (m) assert.equal(m[1] / m[2], +m[3], `${id}: the answer "${q.answer}" is true`);
  }
});

test('the division bracket and labelled equation teach dividend, divisor and quotient', () => {
  const l = L.getLesson('div-equations');
  assert.deepEqual(l.words.map((w) => w.term).slice(0, 3), ['dividend', 'divisor', 'quotient']);
  const pic = V.render(l.explain.visual);
  assert.match(pic, /viz-bracket/); assert.match(pic, />dividend</); assert.match(pic, />quotient</);
});
