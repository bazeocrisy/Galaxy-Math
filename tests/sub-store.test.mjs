// Subtraction progress store: its own key, record-by-record cleaning, help kept apart from independent work,
// no duplicate results, and no effect on multiplication/division progress.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const S = require('../js/sub-store.js');
const M = require('../js/subtractkit/sub-math.js');
const P = require('../js/progress.js');
const LESSONS = ['value', 'one', 'multi', 'four', 'zero1', 'zeros2', 'decide', 'mistakes', 'check'];
function mem(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m };
}
const LAB = ['vsub', 'missub', 'missmin', 'exchange', 'error', 'inverse', 'word', 'estimate', 'place', 'zeros', 'strategy', 'model'];
const make = (st) => S.createSubStore(st, { lessonIds: LESSONS, math: M, labTypes: LAB });

test('subtraction uses its own versioned key and never touches multiplication/division progress', () => {
  const st = mem();
  const mult = P.createStore(st);
  mult.recordLesson('arrays', 3, true);
  mult.forSubject('div').recordLesson('equal-sharing', 3, true);
  const before = st.getItem('galaxy-math.progress');
  const sub = make(st);
  sub.completeLesson('one', false);
  sub.startPractice({ size: 4, difficulty: 'easy', length: 10 }, 42);
  sub.recordProblem(0, { correct: true, helped: false, hints: 0, wrong: 0, tries: 1 });
  sub.reset();
  assert.equal(S.KEY, 'galaxy-math.subtraction');
  assert.equal(st.getItem('galaxy-math.progress'), before, 'multiplication and division record unchanged');
  assert.equal(JSON.parse(st.getItem(S.KEY)).v, 2);
  assert.deepEqual([...st._m.keys()].sort(), ['galaxy-math.progress', 'galaxy-math.subtraction']);
});

test('practice outcomes keep help apart: Show me and hints are never "independent"', () => {
  assert.equal(S.outcomeOf({ correct: true, helped: false, hints: 0, wrong: 0 }), 'independent');
  assert.equal(S.outcomeOf({ correct: true, helped: false, hints: 0, wrong: 2 }), 'independent', 'fixing a wrong check on your own is still on your own');
  assert.equal(S.outcomeOf({ correct: true, helped: false, hints: 1, wrong: 0 }), 'hinted');
  assert.equal(S.outcomeOf({ correct: true, helped: true, hints: 0, wrong: 0 }), 'shown');
  assert.equal(S.outcomeOf({ correct: true, helped: true, hints: 3, wrong: 1 }), 'shown', 'help stays recorded when the right answer comes later');
  assert.equal(S.outcomeOf({ correct: false, helped: true, hints: 0, wrong: 1 }), 'incorrect', 'Show me opened but not finished, then a wrong answer (SI-07)');
  assert.equal(S.outcomeOf({ correct: false, helped: true, hints: 0, wrong: 0 }), 'skipped', 'Show me opened, then skipped: not "completed with Show me" (SI-07)');
  assert.equal(S.outcomeOf({ correct: false, helped: false, hints: 0, wrong: 1 }), 'incorrect');
  assert.equal(S.outcomeOf({ correct: false, helped: false, hints: 2, wrong: 0 }), 'skipped');
});

test('a problem is recorded once; a finished session is saved once with all five counts', () => {
  const st = mem(), s = make(st);
  s.startPractice({ size: 3, difficulty: 'mixed', length: 10 }, 7);
  const plan = [['independent', { correct: true, hints: 0 }], ['hinted', { correct: true, hints: 2 }], ['shown', { correct: true, helped: true }], ['incorrect', { correct: false, wrong: 1 }], ['skipped', { correct: false }]];
  for (let i = 0; i < 10; i++) {
    const [want, r] = plan[i % 5];
    assert.equal(s.recordProblem(i, Object.assign({ helped: false, hints: 0, wrong: 0, tries: 1 }, r)), want);
    assert.equal(s.recordProblem(i, { correct: true, helped: false, hints: 0, wrong: 0 }), false, 'a second event for the same problem is ignored');
    assert.equal(s.recordProblem(i + 1, { correct: true }), false, 'a problem that is not on screen cannot be recorded');
    const done = s.nextProblem();
    if (i < 9) assert.equal(done, null); else assert.deepEqual(done.counts, { independent: 2, hinted: 2, shown: 2, incorrect: 2, skipped: 2 });
  }
  assert.equal(s.activePractice(), null);
  assert.equal(s.nextProblem(), null, 'no second session from the same run');
  assert.equal(make(st).sessions().length, 1);
  assert.deepEqual(make(st).practiceTotals(), { independent: 2, hinted: 2, shown: 2, incorrect: 2, skipped: 2 });
});

test('help on the problem on screen survives a reload before it is finished', () => {
  const st = mem(), s = make(st);
  s.startPractice({ size: 4, difficulty: 'hard', length: 10 }, 99);
  s.updateCurrent({ hints: 2, tries: 1, wrong: 1, helped: true, state: { v: 1 } });
  const again = make(st).activePractice();
  assert.deepEqual([again.i, again.cur.hints, again.cur.wrong, again.cur.helped], [0, 2, 1, true]);
});

test('unsupported practice setups are refused (2-digit Medium and Hard)', () => {
  const s = make(mem());
  assert.throws(() => s.startPractice({ size: 2, difficulty: 'medium', length: 10 }, 1));
  assert.throws(() => s.startPractice({ size: 2, difficulty: 'hard', length: 10 }, 1));
  assert.throws(() => s.startPractice({ size: 4, difficulty: 'easy', length: 12 }, 1));
  assert.ok(s.startPractice({ size: 2, difficulty: 'easy', length: 25 }, 1));
  assert.ok(s.startPractice({ size: 2, difficulty: 'mixed', length: 50 }, 1));
});

test('malformed saved data: each bad record is dropped on its own, good records are kept', () => {
  const good = { v: 1,
    lessons: { one: { done: true, indep: true, helped: false, at: '2026-10-01T10:00:00.000Z' }, multi: { done: 'yes' }, bogus: { done: true, indep: true, helped: false, at: '2026-10-01T10:00:00.000Z' } },
    lessonWork: { four: { seed: 12, state: null, resp: null }, zero1: { seed: -4 } },
    practice: {
      sessions: [{ at: '2026-10-02T10:00:00.000Z', size: 4, difficulty: 'easy', length: 10, total: 10, counts: { independent: 6, hinted: 2, shown: 1, incorrect: 1, skipped: 0 } },
        { at: 'nope', size: 4, difficulty: 'easy', length: 10, total: 10, counts: {} },
        { at: '2026-10-02T10:00:00.000Z', size: 2, difficulty: 'hard', length: 10, total: 10, counts: { independent: 10, hinted: 0, shown: 0, incorrect: 0, skipped: 0 } },
        { at: '2026-10-03T10:00:00.000Z', size: 3, difficulty: 'mixed', length: 10, total: 10, counts: { independent: 99, hinted: 0, shown: 0, incorrect: 0, skipped: 0 } }],
      active: { seed: 5, size: 3, difficulty: 'medium', length: 10, i: 2, results: { 0: { outcome: 'independent', tries: 1, hints: 0 }, 1: { outcome: 'magic', tries: 1, hints: 0 }, x: 4 }, cur: { hints: 'two' } } },
    tests: [{ at: '2026-10-04T10:00:00.000Z', seed: 1, total: 15, correct: 12, incorrect: 2, unanswered: 1 }, { at: '2026-10-04T10:00:00.000Z', seed: 2, total: 15, correct: 20, incorrect: 0, unanswered: 0 }, 'junk'],
    testDraft: { seed: 3, i: 1, resp: { t1: { c1: 'Yes' }, bad: 5, t2: 'x' } } };
  const st = mem({ 'galaxy-math.subtraction': JSON.stringify(good) });
  const d = make(st).data();
  assert.deepEqual(Object.keys(d.lessons), ['one']);
  assert.deepEqual(Object.keys(d.lessonWork), ['four']);
  assert.equal(d.practice.sessions.length, 1);
  assert.deepEqual(Object.keys(d.practice.active.results), ['0'], 'only the bad result is dropped from the active run');
  assert.equal(d.practice.active.cur, null);
  assert.deepEqual(d.tests.map((t) => t.seed), [1]);
  assert.deepEqual(Object.keys(d.testDraft.resp), ['t1']);
  // the next save keeps every good record
  const s = make(st); s.completeLesson('check', true);
  const again = make(st).data();
  assert.deepEqual(Object.keys(again.lessons).sort(), ['check', 'one']);
  assert.equal(again.practice.sessions.length, 1);
  assert.equal(again.tests.length, 1);
});

test('unreadable JSON, other versions and blocked storage are handled safely', () => {
  assert.deepEqual(make(mem({ 'galaxy-math.subtraction': '{not json' })).data(), S.blank());
  assert.deepEqual(make(mem({ 'galaxy-math.subtraction': JSON.stringify({ v: 3, lessons: {} }) })).data(), S.blank());
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const s = make(blocked);
  s.completeLesson('one', false);
  assert.equal(s.lessonsSummary().done, 1, 'works in memory for the visit');
  assert.equal(s.persistent, false);
  const none = make(null); none.completeLesson('one', false); assert.equal(none.lessonsSummary().done, 1);
});

test('lessons: done with help is not counted as independent; independent stays once earned', () => {
  const s = make(mem());
  s.completeLesson('zeros2', true);
  assert.deepEqual(s.lessonsSummary(), { total: 9, done: 1, indep: 0 });
  s.completeLesson('zeros2', false);
  assert.deepEqual(s.lessonsSummary(), { total: 9, done: 1, indep: 1 });
  s.completeLesson('zeros2', true);
  assert.equal(s.lesson('zeros2').indep, true);
  s.completeLesson('not-a-lesson', false);
  assert.equal(s.lessonsSummary().done, 1);
});

test('a test is recorded once per attempt, and its draft is cleared in the same save', () => {
  const st = mem(), s = make(st);
  s.startTest(77);
  s.saveTestDraft({ seed: 77, i: 3, resp: { t1: { c1: 'No' } } });
  s.saveTestDraft({ seed: 78, i: 0, resp: {} });
  assert.equal(s.testDraft().i, 3, 'a draft for another attempt is ignored');
  const r = { seed: 77, total: 15, correct: 10, incorrect: 3, unanswered: 2, byCat: { final: { c: 7, t: 9 } }, byDiff: { hard: { c: 2, t: 5 } }, missedSkills: ['zeros2'] };
  assert.equal(s.recordTest(r), true);
  assert.equal(s.recordTest(r), false, 'the same attempt is not recorded twice');
  assert.equal(s.testDraft(), null);
  const t = make(st).tests();
  assert.equal(t.length, 1); assert.equal(t[0].pct, 67); assert.deepEqual(t[0].missedSkills, ['zeros2']);
  assert.throws(() => s.recordTest({ seed: 5, total: 15, correct: 10, incorrect: 10, unanswered: 0 }));
});

test('a damaged result in the active run never makes the finished session disappear (SI-03)', () => {
  const raw = { v: 1, practice: { sessions: [], active: { seed: 5, size: 3, difficulty: 'easy', length: 10, i: 9, results: Object.fromEntries(Array.from({ length: 9 }, (_, k) => [k, k === 4 ? { outcome: 'magic', tries: 1, hints: 0 } : { outcome: 'independent', tries: 1, hints: 0 }])) } } };
  const st = mem({ 'galaxy-math.subtraction': JSON.stringify(raw) }), s = make(st);
  assert.equal(s.recordProblem(9, { correct: true, helped: false, hints: 0, wrong: 0 }), 'independent');
  const done = s.nextProblem();
  assert.deepEqual(done.counts, { independent: 9, hinted: 0, shown: 0, incorrect: 0, skipped: 1 });
  assert.equal(make(st).sessions().length, 1, 'the session survives the next load');
});

test('an unreadable record is backed up before it is replaced (SI-09)', () => {
  for (const bad of ['{not json', JSON.stringify({ v: 3, lessons: { one: 1 } })]) {
    const st = mem({ 'galaxy-math.subtraction': bad }), s = make(st);
    s.completeLesson('one', false);
    assert.equal(st.getItem('galaxy-math.subtraction.unreadable'), bad);
    assert.equal(JSON.parse(st.getItem('galaxy-math.subtraction')).v, 2);
  }
  const st = mem({ 'galaxy-math.subtraction': JSON.stringify({ v: 1, lessons: {} }) }); make(st).completeLesson('one', false);
  assert.equal(st.getItem('galaxy-math.subtraction.unreadable'), null, 'a readable record is not backed up');
});

test('help details survive a reload: a lesson hint, and Show me opened before a skip (SI-06, SI-12); reset removes the backup (SI-09)', () => {
  const st = mem({ 'galaxy-math.subtraction': '{broken' }), s = make(st);
  s.setLessonWork('zero1', { seed: 4, state: null, resp: null, hinted: true });
  assert.equal(make(st).lessonWork('zero1').hinted, true);
  s.startPractice({ size: 4, difficulty: 'hard', length: 10 }, 3);
  assert.equal(s.recordProblem(0, { correct: false, helped: true, hints: 0, wrong: 0 }), 'skipped');
  assert.equal(make(st).activePractice().results[0].helped, true);
  assert.equal(st.getItem('galaxy-math.subtraction.unreadable'), '{broken');
  s.reset();
  assert.equal(st.getItem('galaxy-math.subtraction.unreadable'), null);
});

test('v1 records upgrade to v2 with nothing lost; new sections start empty', () => {
  const v1 = { v: 1, lessons: { one: { done: true, indep: true, helped: false, at: '2026-10-01T10:00:00.000Z' } },
    practice: { sessions: [{ at: '2026-10-02T10:00:00.000Z', size: 4, difficulty: 'easy', length: 10, total: 10, counts: { independent: 6, hinted: 2, shown: 1, incorrect: 1, skipped: 0 } }], active: null },
    tests: [{ at: '2026-10-04T10:00:00.000Z', seed: 1, total: 15, correct: 12, incorrect: 2, unanswered: 1 }], testDraft: { seed: 3, i: 1, resp: { t1: { c1: 'Yes' } } } };
  const st = mem({ 'galaxy-math.subtraction': JSON.stringify(v1) }), s = make(st);
  assert.equal(s.lessonsSummary().done, 1); assert.equal(s.sessions().length, 1); assert.equal(s.tests().length, 1); assert.equal(s.testDraft().seed, 3);
  assert.deepEqual(s.labSessions(), []); assert.deepEqual(s.flashSessions(), []); assert.deepEqual(s.settings(), S.DEFAULT_SETTINGS);
  s.recordFlash({ size: 3, cards: 5, seconds: 60, knew: 2, notYet: 1, shown: 1 });
  const saved = JSON.parse(st.getItem('galaxy-math.subtraction'));
  assert.equal(saved.v, 2); assert.equal(saved.lessons.one.indep, true); assert.equal(saved.practice.sessions.length, 1); assert.equal(saved.tests.length, 1);
  assert.equal(st.getItem('galaxy-math.subtraction.unreadable'), null, 'v1 is readable: no backup needed');
});

test('Lab: its own records; each answer once; a session is saved once; Practice and Test are untouched', () => {
  const st = mem(), s = make(st);
  s.startLab({ seed: 5, count: 10, level: 2 });
  assert.equal(s.recordLabAnswer(0, { typeId: 'vsub', correct: true, skipped: false }), true);
  assert.equal(s.recordLabAnswer(0, { typeId: 'vsub', correct: false, skipped: false }), false, 'no second answer for the same question');
  assert.equal(s.recordLabAnswer(1, { typeId: 'nope', correct: true, skipped: false }), false, 'unknown kind refused');
  assert.equal(s.recordLabAnswer(1, { typeId: 'zeros', correct: true, skipped: true }), false, 'cannot be both right and skipped');
  s.recordLabAnswer(1, { typeId: 'zeros', correct: false, skipped: false });
  s.recordLabAnswer(2, { typeId: 'model', correct: false, skipped: true });
  assert.equal(make(st).activeLab().answers[1].typeId, 'zeros', 'a Lab in progress survives a reload');
  const done = s.finishLab();
  assert.deepEqual([done.total, done.correct, done.incorrect, done.skipped, done.pct], [3, 1, 1, 1, 33]);
  assert.deepEqual(done.missedTypes.sort(), ['model', 'zeros']);
  assert.equal(s.finishLab(), null, 'finishing again records nothing');
  assert.deepEqual(make(st).labByType(), { vsub: { c: 1, t: 1 }, zeros: { c: 0, t: 1 }, model: { c: 0, t: 1 } });
  assert.equal(make(st).labSessions().length, 1);
  assert.deepEqual([s.sessions().length, s.tests().length, s.lessonsSummary().done], [0, 0, 0], 'Lab work is not Practice, Test or Teach');
  assert.throws(() => s.startLab({ seed: 1, count: 10, level: 2, kind: 'misses', types: [] }));
});

test('Flashcards record exposure and the child\'s own "I knew it" only, never mastery', () => {
  const s = make(mem());
  assert.equal(s.recordFlash({ size: 4, cards: 12, seconds: 300, knew: 7, notYet: 3, shown: 2 }), true);
  assert.equal(s.recordFlash({ size: 4, cards: 2, seconds: 30, knew: 3, notYet: 0, shown: 0 }), false, 'cannot know more cards than were seen');
  assert.deepEqual(s.flashTotals(), { sessions: 1, cards: 12, seconds: 300, knew: 7, notYet: 3, shown: 2 });
  assert.equal(s.lessonsSummary().indep, 0); assert.equal(s.practiceTotals().independent, 0); assert.equal(s.tests().length, 0);
});

test('Parent Settings for Subtraction: cleaned, saved, kept by Reset, and never in galaxy-math.settings', () => {
  const st = mem({ 'galaxy-math.settings': '{"v":2,"multiplication":{"x":1}}' }), s = make(st);
  s.setSettings({ flash: { reveal: 15, cards: 20, mix: 'challenge', size: 4 }, lab: { level: 2 } });
  s.setSettings({ flash: { reveal: 7, hold: 'x' } });
  assert.deepEqual(make(st).settings(), { flash: { reveal: 'auto', cards: 20, mix: 'challenge', size: 4 }, lab: { level: 2 } });
  s.reset();
  assert.equal(make(st).settings().lab.level, 2, 'Reset erases progress, not settings');
  assert.equal(st.getItem('galaxy-math.settings'), '{"v":2,"multiplication":{"x":1}}');
});

test('Practice: first-try credit is kept apart from "on your own after a wrong check"', () => {
  const st = mem(), s = make(st);
  s.startPractice({ size: 3, difficulty: 'easy', length: 10 }, 8);
  s.recordProblem(0, { correct: true, helped: false, hints: 0, wrong: 0, tries: 1 }); s.nextProblem();
  s.recordProblem(1, { correct: true, helped: false, hints: 0, wrong: 1, tries: 2 }); s.nextProblem();
  for (let i = 2; i < 10; i++) { s.recordProblem(i, { correct: false, helped: false, hints: 0, wrong: 0, tries: 0 }); var done = s.nextProblem(); }
  assert.equal(done.counts.independent, 2); assert.equal(done.firstTry, 1);
  assert.equal(make(st).sessions()[0].firstTry, 1);
});
