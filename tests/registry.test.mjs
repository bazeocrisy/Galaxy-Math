import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const GM = createRequire(import.meta.url)('../js/registry.js');

test('landing has exactly four subjects in order', () => {
  assert.deepEqual(GM.SUBJECTS.map((s) => s.id), ['addition', 'subtraction', 'multiplication', 'division']);
  assert.deepEqual(GM.SUBJECTS.map((s) => s.symbol), ['+', '−', '×', '÷']);
});

test('addition and subtraction are Coming Soon and cannot be opened', () => {
  for (const id of ['addition', 'subtraction']) {
    assert.equal(GM.getSubject(id).status, 'coming-soon');
    assert.equal(GM.isSubjectOpen(id), false);
    for (const a of GM.ACTIVITIES) assert.equal(GM.isActivityReady(id, a.id), false);
  }
});

test('every open subject offers the five activities in order', () => {
  assert.deepEqual(GM.ACTIVITIES.map((a) => a.name), ['Teach', 'Practice', 'Math Thinking Lab', 'Flashcards', 'Test']);
  assert.deepEqual(GM.ACTIVITIES.map((a) => a.blurb), ['Show me how', 'Let me try', 'Make me think', 'Help me remember', 'Show what I know']);
  assert.equal(GM.isSubjectOpen('multiplication'), true);
  assert.equal(GM.isSubjectOpen('division'), true);
});

test('only finished activities are marked ready', () => {
  assert.equal(GM.isActivityReady('multiplication', 'flashcards'), true);
  assert.equal(GM.isActivityReady('multiplication', 'test'), true);
  assert.equal(GM.isActivityReady('multiplication', 'teach'), true);
  assert.equal(GM.isActivityReady('multiplication', 'practice'), true);
  assert.equal(GM.isActivityReady('multiplication', 'lab'), true);
  for (const a of GM.ACTIVITIES) assert.equal(GM.isActivityReady('division', a.id), false, `division ${a.id}`);
  assert.equal(GM.readyCount('division'), 0);
  assert.equal(GM.readyCount('addition'), 0);
});

test('ready lists only name known activities', () => {
  const ids = new Set(GM.ACTIVITIES.map((a) => a.id));
  for (const s of GM.SUBJECTS) for (const r of s.ready) assert.ok(ids.has(r), `${s.id}: ${r}`);
});

test('resolveRoute sends valid hashes to the right screen', () => {
  assert.deepEqual(GM.resolveRoute(''), { view: 'landing', hash: '#/' });
  assert.deepEqual(GM.resolveRoute('#/'), { view: 'landing', hash: '#/' });
  assert.deepEqual(GM.resolveRoute('#/multiplication'), { view: 'menu', subject: 'multiplication', hash: '#/multiplication' });
  assert.deepEqual(GM.resolveRoute('#/division'), { view: 'menu', subject: 'division', hash: '#/division' });
  assert.deepEqual(GM.resolveRoute('#/multiplication/flashcards'), { view: 'setup', subject: 'multiplication', activity: 'flashcards', hash: '#/multiplication/flashcards' });
  assert.deepEqual(GM.resolveRoute('#/multiplication/test'), { view: 'setup', subject: 'multiplication', activity: 'test', hash: '#/multiplication/test' });
  for (const a of ['teach', 'practice', 'lab']) assert.equal(GM.resolveRoute(`#/multiplication/${a}`).view, 'setup');
  assert.equal(GM.resolveRoute('#/multiplication/settings').view, 'settings');
  assert.equal(GM.resolveRoute('#/division/lab').hash, '#/division');
  assert.equal(GM.resolveRoute('#/division/settings').hash, '#/division');
  assert.deepEqual(GM.resolveRoute('#/multiplication/progress'), { view: 'progress', subject: 'multiplication', hash: '#/multiplication/progress' });
});

test('resolveRoute never opens locked subjects or unfinished activities', () => {
  assert.equal(GM.resolveRoute('#/addition').view, 'landing');
  assert.equal(GM.resolveRoute('#/subtraction/flashcards').view, 'landing');
  assert.equal(GM.resolveRoute('#/nope').view, 'landing');
  assert.equal(GM.resolveRoute('#/division/flashcards').hash, '#/division');
  assert.equal(GM.resolveRoute('#/division/test').hash, '#/division');
  assert.equal(GM.resolveRoute('#/multiplication/test/extra').hash, '#/multiplication');
  assert.equal(GM.resolveRoute('#/multiplication/bogus').hash, '#/multiplication');
  assert.equal(GM.resolveRoute(undefined).view, 'landing');
  assert.equal(GM.resolveRoute('#/division/progress').hash, '#/division', 'no progress page for division yet');
  assert.equal(GM.resolveRoute('#/addition/progress').view, 'landing');
});
