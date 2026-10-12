// Subtraction integration (Node): the vendored Mathbook files are unchanged, the subject is wired in the registry,
// and the reused SubtractKit math and content give correct answers, difficulty labels and sessions. Expected values
// come from an independent column routine below, never only from the functions under test.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = new URL('..', import.meta.url);
const M = require('../js/subtractkit/sub-math.js');   // also sets globalThis.SubtractKit.math for content.js
require('../js/subtraction-vendor/place-value.js');
require('../js/subtraction-vendor/content.js');
const C = globalThis.Mathbook.subtractRegrouping;
const GM = require('../js/registry.js');

/** SHA-256 of each file as copied from Mathbook-main.zip (GitHub bazeocrisy/Mathbook @ 55b51bdda5a81ed00838433603bfa20daeb10efb). */
const VENDORED = {
  'js/subtractkit/sub-math.js': '979083c4bc2cedb3719b3cfb7c98d29f7e28e0bf5ceef8cc82c709d425c707cd',
  'js/subtractkit/sub-workspace.js': '55622222ea9458bcb317fbf2662a36ea7dc265dafd303156d8cb8db56dd0db68',
  'css/subtractkit/subtract-workspace.css': '0f1da5fd7e816252e2f5dbccbbd7b0b815dbd9c05b9089f7affdcb8a9790cc35',
  'js/subtraction-vendor/content.js': 'ec6d6879a5076704723a065f6f03afe93996a26734173e2dead56fbdd39979e8',
  'js/subtraction-vendor/place-value.js': '5221dc674f51549a53e148e2caaee6494ed213a562707b6f895dc6ad81487c34'
};

/** Independent column subtraction: borrow from the nearest non-zero place, one adjacent exchange at a time. */
function oracle(top, bottom) {
  const n = String(top).length, a = String(top).padStart(n, '0').split('').reverse().map(Number), b = String(bottom).padStart(n, '0').split('').reverse().map(Number);
  let exchanges = 0, chain = 0;
  for (let i = 0; i < n; i++) {
    if (a[i] < b[i]) {
      let k = i + 1; while (a[k] === 0) k++;
      chain = Math.max(chain, k - i - 1);
      for (let j = k; j > i; j--) { a[j] -= 1; a[j - 1] += 10; exchanges++; }
    }
  }
  const digits = a.map((x, i) => x - b[i]);
  return { answer: digits.reduce((s, d, i) => s + d * 10 ** i, 0), exchanges, chain, difficulty: chain > 0 ? 'hard' : exchanges === 0 ? 'none' : exchanges === 1 ? 'easy' : 'medium', final: a };
}

test('the vendored SubtractKit and Mathbook teaching files are byte-for-byte the verified copies', () => {
  for (const [f, sha] of Object.entries(VENDORED)) {
    const got = crypto.createHash('sha256').update(fs.readFileSync(new URL(f, ROOT))).digest('hex');
    assert.equal(got, sha, `${f} changed`);
  }
  const attrs = fs.readFileSync(new URL('.gitattributes', ROOT), 'utf8');
  for (const p of ['js/subtractkit/**', 'css/subtractkit/**', 'js/subtraction-vendor/**']) assert.match(attrs, new RegExp(`${p.replace(/[*]/g, '\\*')} -text`), `${p} is protected from line-ending conversion`);
});

test('Subtraction is open with all five activities, Progress and Parent Settings; Addition stays locked', () => {
  assert.equal(GM.isSubjectOpen('subtraction'), true);
  assert.deepEqual(['teach', 'practice', 'lab', 'flashcards', 'test'].map((a) => GM.isActivityReady('subtraction', a)), [true, true, true, true, true]);
  assert.deepEqual(GM.resolveRoute('#/subtraction/lab'), { view: 'setup', subject: 'subtraction', activity: 'lab', hash: '#/subtraction/lab' });
  assert.deepEqual(GM.resolveRoute('#/subtraction/flashcards'), { view: 'setup', subject: 'subtraction', activity: 'flashcards', hash: '#/subtraction/flashcards' });
  assert.deepEqual(GM.resolveRoute('#/subtraction/progress'), { view: 'progress', subject: 'subtraction', hash: '#/subtraction/progress' });
  assert.equal(GM.resolveRoute('#/subtraction/settings').view, 'settings');
  assert.equal(GM.isSubjectOpen('addition'), false);
  assert.equal(GM.SUBJECTS.length, 4, 'no new subject card');
});

test('the required teaching examples are in the lessons and work out right (including across zeros)', () => {
  const demos = C.learn.flatMap((l) => l.examples.filter((e) => e.kind === 'demo').map((e) => `${e.top}-${e.bottom}`));
  const want = { '52-27': 25, '463-128': 335, '532-168': 364, '4532-1768': 2764, '3002-1578': 1424 };
  for (const [k, ans] of Object.entries(want)) {
    assert.ok(demos.includes(k), `${k} is a worked example`);
    const [t, b] = k.split('-').map(Number);
    assert.equal(M.plan(t, b).answer, ans); assert.equal(oracle(t, b).answer, ans);
  }
  // 3,002 − 1,578 passes through both zeros, one exchange at a time: 3,0,0,2 → 2,9,9,12
  const p = M.plan(3002, 1578);
  assert.deepEqual(p.exchanges.map((e) => [e.from, e.to]), [[3, 2], [2, 1], [1, 0]]);
  assert.deepEqual(p.final, [12, 9, 9, 2]);
  const c32 = M.classify(3002, 1578);
  assert.equal(c32.difficulty, 'hard'); assert.equal(c32.chain, 2); assert.equal(c32.exchanges, 3);
  assert.deepEqual(C.learn.map((l) => l.id), ['value', 'one', 'multi', 'four', 'zero1', 'zeros2', 'decide', 'mistakes', 'check']);
});

test('answers, exchanges and difficulty agree with an independent routine (every pair up to 999, and 4-digit samples)', () => {
  const r = M.rng(2026);
  const pairs = [];
  for (let t = 0; t <= 999; t++) for (let b = 0; b <= t; b += 1 + (t > 200 ? 6 : 0)) pairs.push([t, b]);
  for (let k = 0; k < 20000; k++) { const t = 1000 + Math.floor(r() * 9000), b = Math.floor(r() * (t + 1)); pairs.push([t, b]); }
  for (const [t, b] of pairs) {
    const o = oracle(t, b), c = M.classify(t, b), p = M.plan(t, b);
    assert.equal(p.answer, t - b); assert.equal(o.answer, t - b);
    assert.equal(c.difficulty, o.difficulty, `${t} − ${b}`); assert.equal(c.exchanges, o.exchanges); assert.equal(c.chain, o.chain);
    assert.deepEqual(p.final.slice(0, o.final.length), o.final);
  }
});

test('practice sessions: right size, right difficulty, no duplicates, never negative; unsupported sizes explained', () => {
  for (const size of [2, 3, 4, 'mixed']) for (const difficulty of ['easy', 'medium', 'hard', 'mixed']) for (const length of [10, 25, 50]) for (let seed = 1; seed <= 6; seed++) {
    const why = M.unavailableReason(size, difficulty), s = M.generateSession({ size, difficulty, length, seed });
    if (size === 2 && (difficulty === 'medium' || difficulty === 'hard')) { assert.ok(why.length > 20, why); assert.equal(s.items.length, 0); continue; }
    assert.equal(why, '');
    assert.equal(s.items.length, length, `${size} ${difficulty} ${length}`);
    assert.equal(new Set(s.items.map((q) => `${q.top}-${q.bottom}`)).size, length, 'no repeated problem');
    for (const q of s.items) {
      assert.ok(q.top >= q.bottom && q.bottom >= 0 && q.top <= 9999, 'no negative answers');
      if (size !== 'mixed') assert.equal(String(q.top).length, size);
      const d = oracle(q.top, q.bottom).difficulty;
      if (difficulty !== 'mixed') assert.equal(d, difficulty, `${q.top} − ${q.bottom}`);
    }
  }
  assert.match(M.unavailableReason(2, 'medium'), /one exchange/);
  assert.match(M.unavailableReason(2, 'hard'), /three digits/);
});

test('the test blueprint: 15 questions, new numbers per seed, right kinds, answer keys correct', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const items = C.testItems(seed);
    assert.equal(items.length, 15);
    assert.deepEqual(items.map((i) => i.id), Array.from({ length: 15 }, (_, k) => `t${k + 1}`));
    assert.ok(items.filter((i) => String(i.top).length === 4).length >= 11);
    for (const it of items) {
      assert.ok(it.top >= it.bottom);
      if (it.kind === 'decide') { const o = oracle(it.top, it.bottom); assert.equal(it.needs, o.exchanges ? 'Yes' : 'No'); }
      if (it.kind === 'mistake') { assert.notEqual(it.wrong, it.top - it.bottom, 'the shown work really is wrong'); assert.equal(it.choices.filter((c) => c === it.answer).length, 1); }
    }
    const hardZeros = items.filter((i) => i.kind !== 'decide' && oracle(i.top, i.bottom).chain >= 2);
    assert.ok(hardZeros.length >= 2, 'regrouping across zeros next to each other is tested');
  }
  const a = C.testItems(1).map((i) => `${i.top}-${i.bottom}`).join(), b = C.testItems(2).map((i) => `${i.top}-${i.bottom}`).join();
  assert.notEqual(a, b, 'each attempt uses new numbers');
});
