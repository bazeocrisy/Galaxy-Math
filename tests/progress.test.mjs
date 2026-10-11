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
  assert.deepEqual(Object.keys(saved.mult).sort(), ['facts', 'flash', 'lab', 'lessons', 'missedQs', 'misses', 'practice', 'tests', 'types']);
  assert.doesNotMatch(JSON.stringify(saved), /name|email|child/i);
});

const B = require('../js/mult-bank.js');
function seeded(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

test('v1 progress (from the first Multiplication release) is upgraded, not lost', () => {
  const v1 = { v: 1, mult: { lessons: { arrays: { completed: true, best: 3, attempts: 1, completedAt: '2026-10-11T00:00:00Z' } },
    practice: { sessions: 2, questions: 20, firstTry: 15, hints: 3, byFamily: {} }, tests: [], facts: { '6x7': { correct: 1, total: 2 } }, misses: { '6x7': 1 }, flash: { sessions: 1, seconds: 60, cards: 9 } } };
  const st = P.createStore(memoryStorage({ [P.KEY]: JSON.stringify(v1) }));
  const sum = st.summary();
  assert.equal(sum.lessonsDone, 1);
  assert.equal(sum.practice.questions, 20);
  assert.deepEqual(sum.misses.map((f) => `${f.fam}x${f.other}`), ['6x7']);
  assert.equal(sum.labSessions, 0);
  assert.equal(sum.types.length, 12);
  st.recordFlash(10, 1);
  assert.equal(JSON.parse(st.data && JSON.stringify(st.data())).v, 2, 'saved back as v2');
});

test('Lab sessions record results by question type and missed questions', () => {
  const s = memoryStorage();
  const st = P.createStore(s);
  const q1 = B.generate('error', 6, 7, { rng: seeded(1) }), q2 = B.generate('compare', 4, 3, { rng: seeded(2) }), q3 = B.generate('fact', 2, 5, { rng: seeded(3) });
  const answers = [{ q: q1, given: q1.answer }, { q: q2, given: '11' }, { q: q3, given: null }];
  st.recordLab(B.scoreSession(answers), answers);
  const sum = P.createStore(s).summary();
  assert.equal(sum.labSessions, 1);
  assert.deepEqual([sum.lab[0].correct, sum.lab[0].incorrect, sum.lab[0].unanswered], [1, 1, 1]);
  const byId = Object.fromEntries(sum.types.map((t) => [t.id, t]));
  assert.deepEqual(byId.error.lab, { correct: 1, total: 1 });
  assert.deepEqual(byId.compare.lab, { correct: 0, total: 1 });
  assert.equal(byId.compare.sessions, 1);
  assert.deepEqual(sum.missedQuestions.map((m) => `${m.type}:${m.fam}x${m.other}`).sort(), ['compare:4x3', 'fact:2x5']);
  assert.ok(sum.milestones.includes('Completed a first Math Thinking Lab challenge'));
});

test('a type cannot become Strong from one session, and practice answers clear missed questions', () => {
  const st = P.createStore(memoryStorage());
  const qs = Array.from({ length: 12 }, (_, i) => B.generate('fact', 3, 1 + (i % 10), { rng: seeded(i + 1) }));
  for (const q of qs) st.recordPracticeAnswer(q, true, false);
  st.recordPracticeSession(qs.map((q) => q.typeId));
  let fact = st.summary().types.find((t) => t.id === 'fact');
  assert.equal(fact.status.label, 'Getting stronger', '12/12 in a single session is not "Strong"');
  for (const q of qs) st.recordPracticeAnswer(q, true, false);
  st.recordPracticeSession(qs.map((q) => q.typeId));
  fact = st.summary().types.find((t) => t.id === 'fact');
  assert.equal(fact.status.label, 'Strong');
  const miss = B.generate('equal', 4, 6, { rng: seeded(9) });
  st.recordPracticeAnswer(miss, false, true);
  assert.equal(st.missedQuestions().length, 1);
  st.recordPracticeAnswer(miss, true, false);
  assert.equal(st.missedQuestions().length, 0);
  assert.equal(st.practiceAttempts().equal, 2);
});

test('corrupt v2 fields are dropped safely', () => {
  const bad = { v: 2, mult: { types: { nope: {}, fact: { practice: { correct: 'x', total: 3 } } }, lab: ['x', { total: 5, byType: { bogus: { total: 1 } } }], missedQs: [{ type: 'fact', fam: 99, other: 1 }, { type: 'zzz', fam: 2, other: 2 }, { type: 'fact', fam: 2, other: 3 }] } };
  const sum = P.createStore(memoryStorage({ [P.KEY]: JSON.stringify(bad) })).summary();
  assert.deepEqual(sum.missedQuestions, [{ type: 'fact', fam: 2, other: 3 }]);
  assert.equal(sum.lab.length, 1);
  assert.deepEqual(sum.lab[0].byType, {});
  assert.deepEqual(sum.types.find((t) => t.id === 'fact').practice, { correct: 0, total: 3 });
});
