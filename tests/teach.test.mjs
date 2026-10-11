import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const V = require('../js/visuals.js');
const L = require('../js/mult-lessons.js');

const dots = (s) => (s.match(/class="dot[" ]/g) || []).length;
const tag = (s, cls) => (s.match(new RegExp(`class="${cls}"`, 'g')) || []).length;

test('arrays draw rows × cols dots', () => {
  for (let r = 1; r <= 12; r++) for (let c = 1; c <= 12; c++) {
    const s = V.render({ kind: 'array', rows: r, cols: c });
    assert.equal(dots(s), r * c);
    assert.match(s, new RegExp(`aria-label="array with ${r} rows? of ${c}"`));
  }
  const split = V.render({ kind: 'array', rows: 6, cols: 7, split: 5 });
  assert.equal((split.match(/#D9366F/g) || []).length, 7, 'one pink row of 7');
  const fade = V.render({ kind: 'array', rows: 10, cols: 7, fade: 9 });
  assert.equal((fade.match(/class="dot faded"/g) || []).length, 7);
});

test('equal groups draw g circles with n dots each', () => {
  for (let g = 1; g <= 10; g++) for (let n = 1; n <= 12; n++) {
    const s = V.render({ kind: 'groups', groups: g, size: n });
    assert.equal(tag(s, 'grp'), g);
    assert.equal(dots(s), g * n);
  }
  const u = V.render({ kind: 'uneven', sizes: [3, 1, 4] });
  assert.equal(tag(u, 'grp'), 3);
  assert.equal(dots(u), 8);
});

test('number-line jumps land on multiples', () => {
  const s = V.render({ kind: 'jumps', jumps: 4, size: 3 });
  assert.equal(tag(s, 'hop'), 4);
  for (const v of [0, 3, 6, 9, 12]) assert.match(s, new RegExp(`>${v}</text>`));
  assert.match(s, /aria-label="number line: 4 jumps of 3 from 0 to 12"/);
});

test('equation labels factors and product', () => {
  const s = V.render({ kind: 'equation', a: 4, b: 3, p: 12 });
  assert.equal((s.match(/>factor</g) || []).length, 2);
  assert.match(s, />product</);
});

test('thirteen lessons cover the required topics in order', () => {
  assert.deepEqual(L.LESSONS.map((l) => l.id), ['equal-groups', 'repeated-addition', 'rows-columns', 'arrays', 'equations', 'missing-factors', 'commutative', 'fact-families', 'strategies', 'word-problems', 'connecting', 'check-the-work', 'times-as-many']);
  assert.deepEqual(L.STEPS, ['Goal', 'Explanation', 'See it', 'Worked example', 'Try it together', 'Check yourself', 'Finish']);
});

test('every lesson has all six parts and a real picture', () => {
  for (const l of L.LESSONS) {
    assert.ok(l.objective.startsWith('I can'), l.id);
    assert.ok(l.words.length >= 1, `${l.id} vocabulary`);
    assert.ok(l.explain.text.length >= 2 && l.explain.visual, `${l.id} explanation + picture`);
    assert.ok(l.explain.caption && l.explain.caption.length < 70, `${l.id} short caption for See it`);
    assert.ok(V.render(l.explain.visual).length > 100, `${l.id} picture renders`);
    assert.ok(l.example.steps.length >= 3 && l.example.visual, `${l.id} worked example`);
    assert.ok(l.guided.hint && l.guided.explain, `${l.id} guided hint/feedback`);
    assert.equal(l.check.length, 3, `${l.id} check`);
    for (const q of [l.guided, ...l.check]) {
      assert.ok(q.explain, `${l.id}: feedback for "${q.prompt}"`);
      if (q.visual) V.render(q.visual);
      if (q.type === 'choice') { assert.ok(q.options.includes(q.answer), `${l.id}: ${q.prompt}`); assert.equal(new Set(q.options).size, q.options.length); }
      else { assert.equal(q.type, 'number'); assert.ok(Number.isInteger(q.answer) && q.answer > 0, `${l.id}: ${q.prompt}`); }
    }
  }
});

test('lesson answers are mathematically right', () => {
  // Every "a × b = ?" style prompt and every equation option marked as the answer must be true.
  for (const l of L.LESSONS) for (const q of [l.guided, ...l.check]) {
    const m = /^(\d+) × (\d+) = \?$/.exec(q.prompt);
    if (m) assert.equal(q.answer, m[1] * m[2], q.prompt);
    if (q.type === 'choice') {
      const e = /^(\d+) × (\d+) = (\d+)$/.exec(q.answer);
      if (e) assert.equal(e[1] * e[2], +e[3], q.answer);
    }
    if (q.visual && q.visual.kind === 'array' && /in all|product does this array|How many dots are there in all/.test(q.prompt)) assert.equal(q.answer, q.visual.rows * q.visual.cols, q.prompt);
    if (q.visual && q.visual.kind === 'groups' && /in all/.test(q.prompt)) assert.equal(q.answer, q.visual.groups * q.visual.size, q.prompt);
  }
  // Spot-check the strategy and word-problem answers explicitly.
  const s = L.getLesson('strategies');
  assert.deepEqual(s.check.map((q) => q.answer), [6 * 8, 4 * 7, 9 * 6]);
  const w = L.getLesson('word-problems');
  assert.deepEqual([w.guided.answer, w.check[1].answer, w.check[2].answer], [6 * 4, 4 * 5, 9 * 4]);
});

test('completing a lesson only needs core facts (no 11s or 12s in guided or check questions)', () => {
  for (const l of L.LESSONS) for (const q of [l.guided, ...l.check]) assert.doesNotMatch(q.prompt, /1[12]/, `${l.id}: ${q.prompt}`);
  assert.ok(L.getLesson('strategies').explain.text.join(' ').includes('Extension: **×11**'), 'extension strategies still taught');
});

test('question pictures never show the answer before the child answers', () => {
  // Equation pictures label factor/product; number lines label the total. Neither may appear in a question.
  for (const l of L.LESSONS) for (const q of [l.guided, ...l.check]) if (q.visual) assert.notEqual(q.visual.kind, 'equation', `${l.id}: ${q.prompt}`);
});

test('checkLessonAnswer', () => {
  const l = L.getLesson('arrays');
  assert.equal(L.checkLessonAnswer(l.check[0], '16'), true);
  assert.equal(L.checkLessonAnswer(l.check[0], '15'), false);
  assert.equal(L.checkLessonAnswer(l.check[0], ''), false);
  assert.equal(L.checkLessonAnswer(l.check[1], '4 × 6'), true);
  assert.equal(L.checkLessonAnswer(l.check[1], '6 × 6'), false);
});
