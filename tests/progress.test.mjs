import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const P = require('../js/progress.js');
const M = require('../js/mult-math.js');

function memoryStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m };
}
const q = (fam, other) => M.makeQuestion('fact', fam, other, () => 0.9);

test('progress persists across reloads (same storage)', () => {
  const s = memoryStorage();
  const a = P.createStore(s);
  a.recordLesson('arrays', 3, true);
  a.recordPracticeAnswer(q(7, 8), false, true);
  a.recordPracticeSession();
  a.recordFlash(300, 40);
  const b = P.createStore(s);
  const sum = b.summary();
  assert.equal(sum.lessonsDone, 1);
  assert.equal(sum.lessons.arrays.completed, true);
  assert.equal(sum.practice.questions, 1);
  assert.equal(sum.practice.hints, 1);
  assert.deepEqual(sum.misses, [{ fam: 7, other: 8, misses: 1 }]);
  assert.equal(sum.flash.seconds, 300);
  assert.equal(b.persistent, true);
});

test('a lesson is not complete unless the check is passed', () => {
  const st = P.createStore(memoryStorage());
  st.recordLesson('equations', 1, false);
  assert.equal(st.summary().lessonsDone, 0);
  assert.equal(st.summary().lessons.equations.attempts, 1);
  st.recordLesson('equations', 3, true);
  st.recordLesson('equations', 1, false);
  assert.equal(st.summary().lessons.equations.completed, true, 'stays complete after a later weaker attempt');
  assert.equal(st.summary().lessons.equations.best, 3);
});

test('missed facts clear after a correct answer', () => {
  const st = P.createStore(memoryStorage());
  st.recordPracticeAnswer(q(6, 9), false, false);
  st.recordPracticeAnswer(q(6, 9), false, false);
  st.recordPracticeAnswer(q(3, 4), false, false);
  assert.deepEqual(st.missedFacts().map((f) => `${f.fam}x${f.other}:${f.misses}`), ['6x9:2', '3x4:1']);
  st.recordPracticeAnswer(q(6, 9), true, false);
  assert.deepEqual(st.missedFacts().map((f) => `${f.fam}x${f.other}`), ['3x4']);
});

test('tests record results, misses and mastery; retries do not count toward mastery', () => {
  const st = P.createStore(memoryStorage());
  const deck = M.factsFor([7]).slice(0, 10).map((f) => q(f.fam, f.other));
  const perfect = deck.map((x) => ({ q: x, given: String(x.answer), ms: 1500 }));
  const s1 = M.scoreTest(perfect);
  st.recordTest(s1, { kind: 'test', timed: 5, families: [7], responses: perfect });
  assert.equal(st.summary().families[6].mastered, false);
  st.recordTest(s1, { kind: 'retry', timed: 5, families: [7], responses: perfect });
  assert.equal(st.summary().families[6].mastered, false, 'retry ignored');
  st.recordTest(s1, { kind: 'test', timed: 5, families: [7], responses: perfect });
  const fam7 = st.summary().families[6];
  assert.equal(fam7.fam, 7);
  assert.equal(fam7.mastered, true);
  assert.equal(fam7.avgSeconds, 1.5);
  assert.ok(st.summary().milestones.includes('Mastered the 7s'));
  const withMiss = [{ q: deck[0], given: null }, ...perfect.slice(1)];
  st.recordTest(M.scoreTest(withMiss), { kind: 'test', timed: 0, families: [7], responses: withMiss });
  assert.deepEqual(st.missedFacts().map((f) => `${f.fam}x${f.other}`), [deck[0].factKey]);
  assert.equal(st.summary().testsTaken, 3);
});

test('untimed tests do not affect speed', () => {
  const st = P.createStore(memoryStorage());
  const r = [{ q: q(2, 3), given: '6' }];
  st.recordTest(M.scoreTest(r), { kind: 'test', timed: 0, families: [2], responses: r });
  assert.equal(st.summary().families[1].avgSeconds, null);
});

test('blocked storage: works in memory and reports not persistent', () => {
  const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const st = P.createStore(throwing);
  assert.equal(st.persistent, false);
  st.recordLesson('arrays', 3, true);
  assert.equal(st.summary().lessonsDone, 1);
  const none = P.createStore(null);
  none.recordPracticeSession();
  assert.equal(none.summary().practice.sessions, 1);
  const full = { getItem: () => null, setItem() { throw new Error('QuotaExceeded'); } };
  const st2 = P.createStore(full);
  st2.recordPracticeSession();
  assert.equal(st2.persistent, false, 'write failure switches to memory');
  assert.equal(st2.summary().practice.sessions, 1);
});

test('corrupt or foreign data is replaced by safe defaults', () => {
  for (const bad of ['not json', '{"v":99,"mult":{}}', '[]', '{"v":1,"mult":{"lessons":"x","tests":"y","misses":{"bad":3,"7x8":-1}}}', '{"v":1,"mult":{"facts":{"bogus":{"correct":1,"total":2}}}}']) {
    const st = P.createStore(memoryStorage({ [P.KEY]: bad }));
    const sum = st.summary();
    assert.equal(sum.lessonsDone, 0, bad);
    assert.deepEqual(sum.misses, [], bad);
    assert.equal(sum.tests.length, 0, bad);
  }
  const ok = P.normalize({ v: 1, mult: { misses: { '7x8': 2, nope: 1 }, lessons: { arrays: { completed: 'yes' } } } });
  assert.deepEqual(ok.mult.misses, { '7x8': 2 });
  assert.equal(ok.mult.lessons.arrays.completed, false, 'only true counts as completed');
});

test('reset clears progress', () => {
  const s = memoryStorage();
  const st = P.createStore(s);
  st.recordLesson('arrays', 3, true);
  st.reset();
  assert.equal(P.createStore(s).summary().lessonsDone, 0);
});

test('nothing personal is stored', () => {
  const s = memoryStorage();
  const st = P.createStore(s);
  st.recordLesson('arrays', 3, true);
  st.recordTest(M.scoreTest([{ q: q(2, 2), given: '4' }]), { families: [2], responses: [{ q: q(2, 2), given: '4' }] });
  const saved = JSON.parse(s.map.get(P.KEY));
  assert.deepEqual(Object.keys(saved), ['v', 'mult']);
  assert.deepEqual(Object.keys(saved.mult).sort(), ['facts', 'flash', 'lessons', 'misses', 'practice', 'tests']);
});
