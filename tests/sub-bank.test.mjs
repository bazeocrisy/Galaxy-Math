// Subtraction reasoning bank (Math Thinking Lab): all 12 kinds × readiness levels × many seeds. Expected values come
// from an independent column routine and plain arithmetic below, never only from the functions under test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const B = require('../js/sub-bank.js');
const M = require('../js/subtractkit/sub-math.js');
const C = globalThis.Mathbook.subtractRegrouping;
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const num = (s) => Number(String(s).replace(/,/g, ''));
const PLACE = { ones: 0, tens: 1, hundreds: 2, thousands: 3 };

/** Independent column subtraction: borrow from the nearest non-zero place, one adjacent exchange at a time. */
function oracle(top, bottom) {
  const n = String(top).length, a = String(top).split('').reverse().map(Number), b = String(bottom).padStart(n, '0').split('').reverse().map(Number);
  let exchanges = 0, chain = 0;
  for (let i = 0; i < n; i++) if (a[i] < b[i]) {
    let k = i + 1; while (a[k] === 0) k++;
    chain = Math.max(chain, k - i - 1);
    for (let j = k; j > i; j--) { a[j] -= 1; a[j - 1] += 10; exchanges++; }
  }
  return { final: a, exchanges, chain, digits: b };
}
/** "2 thousands, 9 hundreds, 9 tens, 12 ones" → amounts from the ones up. */
function parseAmounts(s, n) {
  const a = Array(n).fill(0);
  for (const m of s.matchAll(/(\d+) (thousand|hundred|ten|one)s?/g)) a[PLACE[m[2] + 's']] = Number(m[1]);
  return a;
}
const validRegroup = (top, bottom, a) => a.reduce((s, x, i) => s + x * 10 ** i, 0) === top && oracle(top, bottom).digits.every((d, i) => a[i] >= d);
const BUG_OF = Object.fromEntries(Object.entries(C.BUG_TEXT).map(([k, v]) => [v, k]));
const seeds = (n) => Array.from({ length: n }, (_, k) => k * 7919 + 13);

function verify(q, where) {
  const { top, bottom } = q, diff = top - bottom;
  assert.ok(top > bottom && bottom > 0 && top <= 9999, `${where}: operands`);
  assert.ok(q.typeId && q.typeName && q.skill && q.lesson && q.key && q.explain && q.explain.text.length > 10, `${where}: metadata`);
  assert.ok(['none', 'easy', 'medium', 'hard'].includes(q.difficulty), `${where}: difficulty`);
  assert.ok(C.learn.some((l) => l.id === q.lesson), `${where}: related lesson exists`);
  assert.equal(q.answerText, typeof q.answer === 'number' ? fmt(q.answer) : q.answer.replace(/\.$/, ''), `${where}: answer shown with commas, no double period`);
  if (q.format === 'choice') {
    assert.ok(q.options.length >= 3 && q.options.length <= 4, `${where}: 3–4 options`);
    assert.equal(new Set(q.options).size, q.options.length, `${where}: options unique`);
    assert.equal(q.options.filter((o) => o === q.answer).length, 1, `${where}: the answer is offered once`);
    assert.ok(B.check(q, q.answer) && q.options.filter((o) => o !== q.answer).every((o) => !B.check(q, o)));
  } else {
    assert.ok(['number', 'workspace'].includes(q.format), where);
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0, `${where}: whole-number answer`);
    assert.ok(B.check(q, String(q.answer)) && B.check(q, fmt(q.answer)) && !B.check(q, String(q.answer + 1)) && !B.check(q, ''), `${where}: answer format`);
    assert.ok(q.explain.text.includes(fmt(q.answer)), `${where}: the explanation states the answer`);
  }
  const o = oracle(top, bottom);
  switch (q.typeId) {
    case 'vsub': assert.equal(q.answer, diff); assert.ok(o.exchanges >= 1, `${where}: needs regrouping`); break;
    case 'zeros':
      assert.ok(o.chain >= 1, `${where}: passes through a zero`);
      if (q.format === 'workspace') assert.equal(q.answer, diff);
      else { const p = PLACE[/the (\w+) place has 0/.exec(q.prompt)[1]]; assert.equal(String(top).split('').reverse()[p], '0'); assert.equal(q.answer, o.final[p]); }
      break;
    case 'missub': assert.equal(q.answer, bottom); assert.equal(q.prompt, `${fmt(top)} − ? = ${fmt(diff)}`); break;
    case 'missmin': assert.equal(q.answer, top); assert.equal(q.prompt, `? − ${fmt(bottom)} = ${fmt(diff)}`); break;
    case 'exchange': {
      const n = String(top).length;
      const ok = q.options.filter((s) => validRegroup(top, bottom, parseAmounts(s, n)));
      assert.deepEqual(ok, [q.answer], `${where}: exactly one valid regrouping`);
      assert.deepEqual(parseAmounts(q.answer, n), o.final, `${where}: the standard regrouping`);
      break;
    }
    case 'error': {
      const wrong = num(/got ([\d,]+)/.exec(q.prompt)[1]);
      assert.notEqual(wrong, diff, `${where}: the shown work is wrong`);
      if (q.format === 'number') { assert.equal(q.answer, diff); break; }
      if (!o.chain) assert.ok(!q.options.includes(C.BUG_TEXT['zero-ten']), `${where}: no zero mistake without a zero`);
      const fits = q.options.filter((t) => { const w = BUG_OF[t] && M.buggyWork(top, bottom, BUG_OF[t]); return w && w.answer === wrong; });
      assert.deepEqual(fits, [q.answer], `${where}: exactly one mistake explains ${wrong}`);
      break;
    }
    case 'inverse':
      if (q.variant === 'sum') assert.equal(q.answer, top);
      else if (q.variant === 'how') assert.equal(q.answer, `Add your answer to ${fmt(bottom)}. You should get ${fmt(top)}.`);
      else { const claim = num(/= ([\d,]+)\. /.exec(q.prompt)[1]); assert.equal(q.answer, claim === diff ? 'Yes' : 'No'); assert.ok(q.prompt.includes(`${fmt(claim)} + ${fmt(bottom)} = ${fmt(claim + bottom)}`)); }
      break;
    case 'word':
      assert.equal(q.answer, diff); assert.ok(q.prompt.includes(fmt(top)) && q.prompt.includes(fmt(bottom)));
      assert.doesNotMatch(q.prompt, /(^|\D)1 (points|books|stickers)\b/, `${where}: one point, one book`);
      if (/miles|feet/.test(q.prompt)) assert.ok(top >= 1000 && bottom >= 100, `${where}: plausible distances and heights`);
      break;
    case 'estimate': {
      const u = String(top).length <= 3 ? 10 : 100, R = (x) => Math.round(x / u) * u, est = R(top) - R(bottom);
      assert.ok(top % u !== u / 2 && bottom % u !== u / 2, `${where}: no halfway numbers`);
      assert.ok(q.prompt.includes(u === 10 ? 'nearest ten' : 'nearest hundred'), `${where}: 2- and 3-digit round to tens, 4-digit to hundreds`);
      assert.ok(est >= 3 * u && diff >= 3 * u, `${where}: the estimate is meaningful`);
      if (q.variant !== 'round' && q.answer.startsWith('Yes')) assert.ok(Math.abs(diff - est) <= u, `${where}: a reasonable answer is close to the estimate`);
      if (q.variant === 'round') { assert.equal(q.answer, fmt(est)); assert.equal(q.options.filter((x) => num(x) === est).length, 1); }
      else {
        const claim = num(/= ([\d,]+)\. Estimate/.exec(q.prompt)[1]);
        if (claim === diff) assert.match(q.answer, /^Yes/); else { assert.match(q.answer, /^No/); assert.ok(Math.abs(claim - est) >= 3 * u, `${where}: a wrong claim is clearly unreasonable`); }
      }
      break;
    }
    case 'place':
      if (q.variant === 'value') { assert.equal(q.answer, top); assert.ok(!q.prompt.includes(fmt(top)), `${where}: the prompt does not show the answer`); assert.deepEqual(parseAmounts(q.prompt.split(' is regrouped as ')[1], String(top).length), o.final); }
      else { const p = PLACE[/how many (\w+) does/.exec(q.prompt)[1]]; assert.equal(q.answer, o.final[p]); }
      break;
    case 'strategy':
      if (q.variant === 'countup') {
        // One jump is given; the child finds the second jump and adds.
        const m = /From ([\d,]+) to ([\d,]+) is ([\d,]+)\. Then \w+ counts up from ([\d,]+) to ([\d,]+)\./.exec(q.prompt);
        assert.ok(m, `${where}: ${q.prompt}`);
        assert.equal(num(m[2]) - num(m[1]), num(m[3]), `${where}: the given jump is right`);
        assert.deepEqual([num(m[1]), num(m[4]), num(m[5])], [bottom, num(m[2]), top]);
        assert.ok(num(m[3]) + (top - num(m[2])) === diff && q.answer === diff, `${where}: the jumps add up to the difference`);
      } else {
        const claims = [...q.prompt.matchAll(/(\w+) (?:regrouped|counted|took)[^.]*?got ([\d,]+)/g)].map((m) => [m[1], num(m[2])]);
        assert.equal(claims.length, 3);
        assert.deepEqual(claims.filter(([, v]) => v !== diff).map(([n]) => n), [q.answer], `${where}: only one strategy fails`);
      }
      break;
    case 'model': {
      const val = (s) => { let m; if ((m = /^([\d,]+) − ([\d,]+) = \?$/.exec(s))) return num(m[1]) - num(m[2]); if ((m = /^([\d,]+) \+ ([\d,]+) = \?$/.exec(s))) return num(m[1]) + num(m[2]); if ((m = /^\? − ([\d,]+) = ([\d,]+)$/.exec(s))) return num(m[1]) + num(m[2]); return NaN; };
      assert.deepEqual(q.options.filter((s) => val(s) === diff), [q.answer], `${where}: one equation gives the answer`);
      if (q.variant === 'bar') assert.match(q.visualHtml, new RegExp(`>${fmt(top)}<[\\s\\S]*>${fmt(bottom)}<[\\s\\S]*>\\?<`));
      break;
    }
    default: assert.fail(q.typeId);
  }
}

test('twelve kinds A–L, each tied to a real lesson', () => {
  assert.deepEqual(B.TYPES.map((t) => t.letter).join(''), 'ABCDEFGHIJKL');
  for (const t of B.TYPES) assert.ok(C.learn.some((l) => l.id === t.lesson), t.id);
});

test('every kind at every readiness level: correct answers, one right option, explanations (many seeds)', () => {
  let made = 0;
  const variants = new Set();
  for (const t of B.TYPES) for (const level of [1, 2, 3]) {
    if (t.minLevel > level) { assert.equal(B.makeSession({ seed: 1, count: 5, level, types: [t.id] }).length, 0); continue; }
    let ok = 0;
    for (const s of seeds(120)) {
      const q = B.generate(t.id, M.rng(s), level, new Set());
      if (!q) continue;
      ok++; made++; variants.add(`${t.id}:${q.variant || q.format}`);
      verify(q, `${t.id} L${level} seed ${s}`);
      const n = String(q.top).length;
      if (level === 1) assert.ok(n <= 3 && q.difficulty !== 'hard' && q.difficulty !== 'medium', `${t.id} L1 stays small: ${q.top} − ${q.bottom}`);
      if (level === 2) assert.ok(q.chain <= 1 && !(n === 4 && q.difficulty !== 'easy'), `${t.id} L2: ${q.top} − ${q.bottom}`);
    }
    assert.ok(ok >= 60, `${t.id} L${level}: generated ${ok} of 120`);
  }
  assert.ok(made > 3500, String(made));
  for (const v of ['error:why', 'error:fix', 'inverse:how', 'inverse:sum', 'inverse:judge', 'estimate:round', 'estimate:reasonable', 'place:value', 'place:count', 'zeros:workspace', 'zeros:zero', 'strategy:countup', 'strategy:whose', 'model:bar', 'model:story'])
    assert.ok(variants.has(v), `variant ${v} appears`);
});

test('Lab sessions: 10, 25 and 50 questions, mixed kinds, no repeats, no kind twice in a row, deterministic', () => {
  for (const count of [10, 25, 50]) for (const level of [1, 2, 3]) for (const seed of seeds(15)) {
    const qs = B.makeSession({ seed, count, level });
    assert.equal(qs.length, count, `${count} L${level} seed ${seed}`);
    assert.equal(new Set(qs.map((q) => `${q.top}-${q.bottom}`)).size, count, 'no problem twice');
    for (let i = 1; i < count; i++) assert.notEqual(qs[i].typeId, qs[i - 1].typeId, 'no kind twice in a row');
    const kinds = new Set(qs.map((q) => q.typeId)), allowed = B.typesFor(level).length;
    assert.equal(kinds.size, Math.min(count, allowed), `every allowed kind before any repeats (${count}, L${level})`);
    if (level === 1) assert.ok(qs.every((q) => String(q.top).length <= 3), 'level 1 never shows 4-digit numbers');
    qs.forEach((q, i) => verify(q, `session ${count} L${level} #${i}`));
  }
  assert.deepEqual(B.makeSession({ seed: 42, count: 10, level: 3 }).map((q) => q.key), B.makeSession({ seed: 42, count: 10, level: 3 }).map((q) => q.key));
  assert.deepEqual(B.typesFor(1).includes('zeros'), false);
  const misses = B.makeSession({ seed: 9, count: 6, level: 3, types: ['zeros', 'error'] });
  assert.equal(misses.length, 6); assert.ok(misses.every((q) => ['zeros', 'error'].includes(q.typeId)));
});

test('scoring keeps correct, incorrect and skipped apart', () => {
  const s = B.scoreSession([{ typeId: 'vsub', correct: true }, { typeId: 'vsub', correct: false }, { typeId: 'word', skipped: true, correct: false }, { typeId: 'word', correct: true }]);
  assert.deepEqual([s.total, s.correct, s.incorrect, s.skipped, s.percent], [4, 2, 1, 1, 50]);
  assert.deepEqual(s.byType.vsub, { correct: 1, total: 2 });
});
