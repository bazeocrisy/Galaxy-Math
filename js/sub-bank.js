/* Galaxy Math subtraction reasoning bank for the Math Thinking Lab (and its "Practice my misses").
   A small question adapter around SubtractKit.math (unchanged, from Mathbook): every problem, regrouping, difficulty,
   mistake and worked line comes from SubtractKit (generateOne, plan, classify, describe, checkAmounts, buggyWork,
   solutionLines) and Mathbook's content (BUG_TEXT, CHECK_CHOICES). No regrouping algorithm is written here.
   Twelve kinds (A–L). Each question has a stable type id, skill, lesson, difficulty, answer format, prompt, answer,
   options (choice), a worked explanation, and optionally a model (SubtractKit view of the problem or a bar model).
   Formats: 'number' (typed), 'choice' (one right option), 'workspace' (solved in SubtractKit's test-mode grid).
   Readiness levels keep sizes appropriate: 1 = 2- and 3-digit, one exchange; 2 = adds 3-digit multi-exchange,
   across one zero, and 4-digit one exchange; 3 = everything up to 4-digit across zeros next to each other.
   window.GalaxySubBank / Node. */
(function (root) {
  'use strict';
  const node = typeof module === 'object' && module.exports;
  const M = node ? require('./subtractkit/sub-math.js') : root.SubtractKit.math;
  if (node && !globalThis.SubtractKit) globalThis.SubtractKit = { math: M };
  const C = node ? (require('./subtraction-vendor/content.js'), globalThis.Mathbook.subtractRegrouping) : root.Mathbook.subtractRegrouping;
  const fmt = M.fmt, P = M.PLACES;

  const TYPES = [
    { id: 'vsub', letter: 'A', name: 'Vertical subtraction', skill: 'Subtract in columns, regrouping when needed', lesson: 'one', format: 'workspace', minLevel: 1 },
    { id: 'missub', letter: 'B', name: 'Missing number taken away', skill: 'Find the missing subtrahend', lesson: 'check', format: 'number', minLevel: 1 },
    { id: 'missmin', letter: 'C', name: 'Missing starting number', skill: 'Find the missing minuend with addition', lesson: 'check', format: 'number', minLevel: 1 },
    { id: 'exchange', letter: 'D', name: 'Correct exchanges', skill: 'Recognize a correct regrouping of the top number', lesson: 'value', format: 'choice', minLevel: 1 },
    { id: 'error', letter: 'E', name: 'Find and fix mistakes', skill: 'Analyze and correct a subtraction mistake', lesson: 'mistakes', format: 'choice|number', minLevel: 1 },
    { id: 'inverse', letter: 'F', name: 'Check with addition', skill: 'Use addition to check subtraction', lesson: 'check', format: 'choice|number', minLevel: 1 },
    { id: 'word', letter: 'G', name: 'Word problems', skill: 'Choose and solve a subtraction in a story', lesson: 'one', format: 'number', minLevel: 1 },
    { id: 'estimate', letter: 'H', name: 'Estimate and check', skill: 'Estimate to judge whether an answer is reasonable', lesson: 'decide', format: 'choice', minLevel: 1 },
    { id: 'place', letter: 'I', name: 'Place value', skill: 'Read a regrouped number by place value', lesson: 'value', format: 'number', minLevel: 1 },
    { id: 'zeros', letter: 'J', name: 'Regrouping across zeros', skill: 'Regroup through places that have 0', lesson: 'zeros2', format: 'workspace|number', minLevel: 2 },
    { id: 'strategy', letter: 'K', name: 'Compare strategies', skill: 'Compare different ways to subtract', lesson: 'check', format: 'choice|number', minLevel: 1 },
    { id: 'model', letter: 'L', name: 'Match a model', skill: 'Match a story or bar model to an equation', lesson: 'one', format: 'choice', minLevel: 1 }
  ];
  const TYPE = Object.fromEntries(TYPES.map((t) => [t.id, t]));
  const NAMES = ['Sam', 'Ava', 'Leo', 'Mia', 'Noah', 'Zoe', 'Eli', 'Ruby'];
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const shuffle = (r, a) => M.shuffle(r, a.slice());
  const LEVELS = {
    1: [{ size: 2, difficulty: 'easy' }, { size: 3, difficulty: 'easy' }],
    2: [{ size: 3, difficulty: 'easy' }, { size: 3, difficulty: 'medium' }, { size: 4, difficulty: 'easy' }, { size: 2, difficulty: 'easy' }],
    3: [{ size: 3, difficulty: 'medium' }, { size: 4, difficulty: 'easy' }, { size: 4, difficulty: 'medium' }, { size: 4, difficulty: 'hard', chain: 1 }, { size: 4, difficulty: 'hard', chain: 2 }]
  };
  const ZERO_SPECS = { 2: [{ size: 3, difficulty: 'hard', chain: 1 }], 3: [{ size: 3, difficulty: 'hard', chain: 1 }, { size: 4, difficulty: 'hard', chain: 1 }, { size: 4, difficulty: 'hard', chain: 2 }] };

  /** A regrouping problem (top, bottom) from SubtractKit's own generator, avoiding keys already used. */
  function operands(r, spec, avoid) {
    for (let k = 0; k < 6; k++) {
      const q = M.generateOne(r, Object.assign({ avoid }, spec)) || M.generateOne(r, Object.assign({ avoid }, spec, { chain: undefined }));
      if (q && q.bottom > 0 && q.top > q.bottom) return q;
    }
    return null;
  }
  const workLines = (top, bottom) => M.solutionLines(top, bottom);
  const shortExplain = (top, bottom) => {
    const p = M.plan(top, bottom), ex = p.exchanges.length;
    return `${ex ? `${ex} exchange${ex === 1 ? '' : 's'}: ${M.describe(p.final)}. ` : 'No exchange is needed. '}${fmt(top)} − ${fmt(bottom)} = ${fmt(top - bottom)}.`;
  };
  const sizeOf = (n) => M.lengthOf(n);
  const roundTo = (n, u) => Math.floor(n / u + 0.5) * u;

  /** A simple part–whole bar model (SVG text, no DOM): the whole on top, the known part and "?" below. */
  function barModel(whole, part) {
    const W = 300, pw = Math.max(70, Math.min(W - 70, Math.round((part / whole) * W)));
    const cell = (x, w, y, label, fill) => `<rect x="${x}" y="${y}" width="${w}" height="40" rx="6" fill="${fill}" stroke="#1B1F4B" stroke-width="2"/><text x="${x + w / 2}" y="${y + 26}" text-anchor="middle" font-size="18" font-weight="700" fill="#1B1F4B">${label}</text>`;
    return `<svg class="viz sr-bar" viewBox="0 0 ${W + 4} 96" width="${W + 4}" height="96" role="img" aria-label="Bar model: the whole is ${fmt(whole)}; one part is ${fmt(part)}; the other part is unknown.">` +
      cell(2, W, 2, fmt(whole), '#E9E3FF') + cell(2, pw, 52, fmt(part), '#FFF3C9') + cell(2 + pw, W - pw, 52, '?', '#FFFFFF') + '</svg>';
  }

  /** Build one question of a kind. r: random function; level 1–3; avoid: Set of used problem keys. Returns null if it cannot. */
  function generate(typeId, r, level = 3, avoid = new Set()) {
    const t = TYPE[typeId];
    if (!t) throw new Error(`unknown type ${typeId}`);
    const lv = Math.max(1, Math.min(3, level));
    const spec = () => Object.assign({}, pick(r, LEVELS[lv]));
    const q = (typeId === 'zeros') ? (ZERO_SPECS[lv] ? operands(r, pick(r, ZERO_SPECS[lv]), avoid) : null) : operands(r, spec(), avoid);
    if (!q) return null;
    const top = q.top, bottom = q.bottom, diff = top - bottom, p = M.plan(top, bottom), cls = M.classify(top, bottom);
    const base = { typeId, typeName: t.name, skill: t.skill, lesson: t.lesson, top, bottom, size: sizeOf(top), difficulty: cls.difficulty, chain: cls.chain, level: lv,
      key: `${typeId}:${top}-${bottom}`, sk: null, visualHtml: null };
    const done = (o) => { avoid.add(`${top}-${bottom}`); return Object.assign(base, o, { maxDigits: 4 }); };
    const choice = (prompt, correct, distractors, extra) => {
      const opts = [...new Set([correct, ...distractors.filter((d) => d !== correct)])];
      if (opts.length < 3) return null;
      return done(Object.assign({ format: 'choice', prompt, answer: correct, options: shuffle(r, opts.slice(0, 4)) }, extra));
    };
    switch (typeId) {
      case 'vsub':
        return done({ format: 'workspace', prompt: `Subtract ${fmt(top)} − ${fmt(bottom)}. Write regroup marks if you need them.`, answer: diff,
          explain: { text: shortExplain(top, bottom), lines: workLines(top, bottom) } });
      case 'missub':
        return done({ format: 'number', prompt: `${fmt(top)} − ? = ${fmt(diff)}`, big: true, answer: bottom,
          explain: { text: `${fmt(top)} − ${fmt(diff)} = ${fmt(bottom)}, so the missing number is ${fmt(bottom)}. Check: ${fmt(top)} − ${fmt(bottom)} = ${fmt(diff)}.` } });
      case 'missmin':
        return done({ format: 'number', prompt: `? − ${fmt(bottom)} = ${fmt(diff)}`, big: true, answer: top,
          explain: { text: `Add back what was taken away: ${fmt(diff)} + ${fmt(bottom)} = ${fmt(top)}. Check: ${fmt(top)} − ${fmt(bottom)} = ${fmt(diff)}.` } });
      case 'exchange': {
        if (!p.exchanges.length) return null;
        const orig = M.digitsOf(top, p.size), fin = p.final;
        const cands = [];
        const noReduce = orig.slice(); p.exchanges.forEach((e) => { noReduce[e.to] += 10; }); cands.push(noReduce);   // got 10 more, nothing given
        cands.push(orig.slice());   // no regrouping at all
        if (cls.chain > 0) { const z = fin.slice(); p.exchanges.forEach((e) => { if (orig[e.from] === 0) z[e.from] += 1; }); cands.push(z); }   // a zero left as 10
        const twice = fin.slice(); const g = p.exchanges[0].from; if (twice[g] >= 1) { twice[g] -= 1; cands.push(twice); }   // gave 2 away
        const bad = cands.filter((a) => a.every((x) => x >= 0) && !M.checkAmounts(top, bottom, a).ok).map((a) => M.describe(a));
        const exLines = workLines(top, bottom).filter((l) => /^Exchange/.test(l));
        return choice(`To subtract ${fmt(bottom)} from ${fmt(top)}, which shows the top number correctly regrouped?`, M.describe(fin), bad,
          { sk: { top, bottom, view: true, answer: false }, explain: { text: `${exLines.join(' ')} The value is still ${fmt(top)}, and every column can now subtract.` } });
      }
      case 'error': {
        const bugs = ['smaller-from-larger', 'no-reduce', 'original-digit', 'zero-ten'].filter((b) => b !== 'zero-ten' || cls.chain > 0);
        const bug = pick(r, bugs), work = M.buggyWork(top, bottom, bug);
        if (!work || work.answer === diff) return null;
        const who = pick(r, NAMES);
        const sk = { top, bottom, view: true, work, caption: `${who}'s work` };
        if (r() < 0.5) {
          // Which mistake? Only mistakes that would NOT give the same wrong answer are offered, so one choice is right.
          const others = Object.keys(C.BUG_TEXT).filter((b) => b !== bug && b !== 'misaligned').filter((b) => { const w = M.buggyWork(top, bottom, b); return !w || w.answer !== work.answer; });
          return choice(`${who} worked ${fmt(top)} − ${fmt(bottom)} and got ${fmt(work.answer)}. What went wrong?`, C.BUG_TEXT[bug], shuffle(r, others).slice(0, 3).map((b) => C.BUG_TEXT[b]),
            { sk, variant: 'why', explain: { text: `${C.BUG_TEXT[bug]} The right answer is ${fmt(diff)}.`, lines: workLines(top, bottom) } });
        }
        return done({ format: 'number', variant: 'fix', prompt: `${who} worked ${fmt(top)} − ${fmt(bottom)} and got ${fmt(work.answer)}. That is not right. What is the right answer?`, answer: diff, sk,
          explain: { text: `${who}'s mistake: ${C.BUG_TEXT[bug]} Worked correctly: ${shortExplain(top, bottom)}`, lines: workLines(top, bottom) } });
      }
      case 'inverse': {
        const v = r();
        if (v < 0.4) {
          const ch = C.CHECK_CHOICES(top, bottom);
          return choice(`You worked out ${fmt(top)} − ${fmt(bottom)}. How can you check your answer with addition?`, ch[0], ch.slice(1),
            { variant: 'how', explain: { text: `Addition undoes subtraction: ${fmt(diff)} + ${fmt(bottom)} = ${fmt(top)}.` } });
        }
        if (v < 0.7) {
          return done({ format: 'number', variant: 'sum', prompt: `${fmt(top)} − ${fmt(bottom)} = ${fmt(diff)}. To check, add ${fmt(diff)} + ${fmt(bottom)}. What should you get?`, answer: top,
            explain: { text: `${fmt(diff)} + ${fmt(bottom)} = ${fmt(top)}, the number you started with, so the subtraction checks out.` } });
        }
        // A wrong claim is off by 10 or 100 (a typical slip); it can never equal the right answer.
        const right = r() < 0.5, offsets = [10, -10, 100, -100].filter((d) => diff + d > 0);
        const claim = right ? diff : diff + pick(r, offsets);
        const who = pick(r, NAMES), sum = claim + bottom;
        return choice(`${who} says ${fmt(top)} − ${fmt(bottom)} = ${fmt(claim)}. ${who} checks: ${fmt(claim)} + ${fmt(bottom)} = ${fmt(sum)}. Is ${who} right?`, right ? 'Yes' : 'No', [right ? 'No' : 'Yes', 'You cannot tell'],
          { variant: 'judge', explain: { text: right ? `${fmt(claim)} + ${fmt(bottom)} = ${fmt(top)}, the starting number, so ${fmt(claim)} is right.` : `${fmt(claim)} + ${fmt(bottom)} = ${fmt(sum)}, not ${fmt(top)}, so ${fmt(claim)} is not right. ${fmt(top)} − ${fmt(bottom)} = ${fmt(diff)}.` } });
      }
      case 'word': {
        const stories = [
          [`A school library has ${fmt(top)} books. ${fmt(bottom)} books are checked out. How many books are still on the shelves?`, 'books'],
          [`The rocket must fly ${fmt(top)} miles to reach the space station. It has flown ${fmt(bottom)} miles. How many miles are left?`, 'miles'],
          [`Ava wants to collect ${fmt(top)} stickers. She has ${fmt(bottom)} stickers. How many more stickers does she need?`, 'stickers'],
          [`A video game level is worth ${fmt(top)} points. Leo has scored ${fmt(bottom)} points so far. How many more points can he score?`, 'points']
        ];
        // Heights of hills only make sense with big numbers.
        if (top >= 1000) stories.push([`Pine Mountain is ${fmt(top)} feet tall. Cedar Hill is ${fmt(bottom)} feet tall. How much taller is Pine Mountain?`, 'feet']);
        const [prompt, unit] = pick(r, stories);
        return done({ format: 'number', prompt, answer: diff, unit,
          explain: { text: `${fmt(top)} − ${fmt(bottom)} = ${fmt(diff)} ${unit}. ${shortExplain(top, bottom)}`, lines: workLines(top, bottom) } });
      }
      case 'estimate': {
        const u = sizeOf(top) <= 2 ? 10 : 100, word = u === 10 ? 'ten' : 'hundred';
        const half = (n) => (n % u) === u / 2;   // avoid numbers exactly halfway (no rounding-rule surprises)
        if (half(top) || half(bottom) || bottom < u / 2) return null;
        const est = roundTo(top, u) - roundTo(bottom, u);
        if (est <= 0) return null;
        if (r() < 0.5) {
          return choice(`Round each number to the nearest ${word} to estimate ${fmt(top)} − ${fmt(bottom)}. What is the estimate?`, fmt(est),
            [est + u, est - u, est + 2 * u, roundTo(top, u) + roundTo(bottom, u)].filter((x) => x > 0 && x !== est).map(fmt),
            { variant: 'round', explain: { text: `${fmt(top)} rounds to ${fmt(roundTo(top, u))} and ${fmt(bottom)} rounds to ${fmt(roundTo(bottom, u))}. ${fmt(roundTo(top, u))} − ${fmt(roundTo(bottom, u))} = ${fmt(est)}. The exact answer, ${fmt(diff)}, is close to it.` } });
        }
        // Is a claimed answer reasonable? Wrong claims are far from the estimate (3 or more rounding units away).
        const right = r() < 0.5, who = pick(r, NAMES);
        const far = [top + bottom, diff + 3 * u, diff + 5 * u, diff - 3 * u].filter((x) => x > 0 && Math.abs(x - est) >= 3 * u && x !== diff);
        if (!right && !far.length) return null;
        const claim = right ? diff : pick(r, far);
        return choice(`${who} says ${fmt(top)} − ${fmt(bottom)} = ${fmt(claim)}. Estimate by rounding to the nearest ${word}. Is ${who}'s answer reasonable?`,
          right ? 'Yes, it is close to the estimate' : 'No, it is far from the estimate', [right ? 'No, it is far from the estimate' : 'Yes, it is close to the estimate', 'You cannot estimate subtraction'],
          { variant: 'reasonable', explain: { text: `Estimate: ${fmt(roundTo(top, u))} − ${fmt(roundTo(bottom, u))} = ${fmt(est)}. ${right ? `${fmt(claim)} is close to ${fmt(est)}, so it is reasonable (and it is right).` : `${fmt(claim)} is far from ${fmt(est)}, so it cannot be right. The answer is ${fmt(diff)}.`}` } });
      }
      case 'place': {
        if (!p.exchanges.length) return null;
        if (r() < 0.5) {
          return done({ format: 'number', variant: 'value', prompt: `${fmt(top)} is regrouped as ${M.describe(p.final)}. What number is that?`, answer: top,
            explain: { text: `${p.final.map((a, i) => a * 10 ** i).filter(Boolean).reverse().map(fmt).join(' + ')} = ${fmt(top)}. Regrouping never changes the value.` } });
        }
        const changed = [...new Set(p.exchanges.flatMap((e) => [e.from, e.to]))];
        const i = pick(r, changed);
        return done({ format: 'number', variant: 'count', prompt: `To subtract ${fmt(bottom)} from ${fmt(top)}, you regroup. After all the exchanges, how many ${P[i].name} does the top number have?`, answer: p.final[i],
          sk: { top, bottom, view: true, answer: false },
          explain: { text: `${workLines(top, bottom).filter((l) => /^Exchange/.test(l)).join(' ')} So the ${P[i].name} have ${p.final[i]}.` } });
      }
      case 'zeros': {
        if (!cls.chain) return null;
        if (r() < 0.6) {
          return done({ format: 'workspace', prompt: `Subtract ${fmt(top)} − ${fmt(bottom)}. Watch out for the zeros.`, answer: diff,
            explain: { text: shortExplain(top, bottom), lines: workLines(top, bottom) } });
        }
        const orig = M.digitsOf(top, p.size), zs = p.exchanges.map((e) => e.from).filter((k) => orig[k] === 0);
        if (!zs.length) return null;
        const i = pick(r, zs);
        return done({ format: 'number', variant: 'zero', prompt: `In ${fmt(top)} − ${fmt(bottom)}, the ${P[i].name} place has 0. After all the regrouping, what number is in the ${P[i].name} place?`, answer: p.final[i],
          sk: { top, bottom, view: true, answer: false },
          explain: { text: `The ${P[i].name} gets 10 from the place on its left, then gives 1 to the place on its right: 10 − 1 = ${p.final[i]}. ${workLines(top, bottom).filter((l) => /^Exchange/.test(l)).join(' ')}` } });
      }
      case 'strategy': {
        if (r() < 0.5) {
          const u = sizeOf(bottom) >= 3 ? 100 : 10, m = (Math.floor(bottom / u) + 1) * u;
          if (m >= top) return null;
          const who = pick(r, NAMES);
          return done({ format: 'number', variant: 'countup', prompt: `${who} finds ${fmt(top)} − ${fmt(bottom)} by counting up: from ${fmt(bottom)} to ${fmt(m)} is ${fmt(m - bottom)}, then from ${fmt(m)} to ${fmt(top)} is ${fmt(top - m)}. What is ${fmt(top)} − ${fmt(bottom)}?`, answer: diff,
            explain: { text: `Add the two jumps: ${fmt(m - bottom)} + ${fmt(top - m)} = ${fmt(diff)}. Counting up and regrouping give the same answer.` } });
        }
        if (!p.exchanges.length) return null;
        const w = M.buggyWork(top, bottom, 'smaller-from-larger');
        if (!w || w.answer === diff) return null;
        const [a, b2, c] = shuffle(r, NAMES).slice(0, 3);
        return choice(`${a} regrouped in columns and got ${fmt(diff)}. ${b2} counted up from ${fmt(bottom)} to ${fmt(top)} and got ${fmt(diff)}. ${c} subtracted the smaller digit from the larger digit in each column and got ${fmt(w.answer)}. Whose strategy does NOT work?`,
          c, [a, b2, 'They all work'], { variant: 'whose', explain: { text: `${c} cannot turn a column around: when the top digit is smaller, exchange first. Regrouping and counting up both give ${fmt(diff)}.` } });
      }
      case 'model': {
        const opts = [`${fmt(top)} − ${fmt(bottom)} = ?`, `${fmt(bottom)} − ${fmt(top)} = ?`, `${fmt(top)} + ${fmt(bottom)} = ?`, `? − ${fmt(top)} = ${fmt(bottom)}`];
        if (r() < 0.5) {
          return choice(`Which equation matches the bar model?`, opts[0], opts.slice(1),
            { variant: 'bar', visualHtml: barModel(top, bottom), explain: { text: `The whole is ${fmt(top)} and one part is ${fmt(bottom)}. Take the part away from the whole: ${fmt(top)} − ${fmt(bottom)} = ${fmt(diff)}.` } });
        }
        const story = pick(r, [`A farm has ${fmt(top)} apples. The farmers sell ${fmt(bottom)} of them. Which equation shows how many apples are left?`,
          `A puzzle has ${fmt(top)} pieces. Zoe has put in ${fmt(bottom)} pieces. Which equation shows how many pieces are left to put in?`]);
        return choice(story, opts[0], opts.slice(1), { variant: 'story', explain: { text: `Start with ${fmt(top)} and take away ${fmt(bottom)}: ${fmt(top)} − ${fmt(bottom)} = ${fmt(diff)}.` } });
      }
      default: return null;
    }
  }

  const typesFor = (level) => TYPES.filter((t) => t.minLevel <= level).map((t) => t.id);
  /**
   * A Lab session: `count` questions, every allowed kind used before any repeats (so a 10-question session has 10
   * different kinds), no problem twice, never the same kind twice in a row. Deterministic for a seed.
   * opts.types: limit to these kinds (Practice my misses).
   */
  function makeSession({ seed, count, level = 3, types = null }) {
    const r = M.rng(seed >>> 0), avoid = new Set(), out = [];
    const pool = (types && types.length ? types : typesFor(level)).filter((id) => TYPE[id] && TYPE[id].minLevel <= level);
    if (!pool.length) return [];
    let bag = [];
    for (let i = 0, tries = 0; out.length < count && tries < count * 40; tries++) {
      if (!bag.length) bag = shuffle(r, pool);
      let k = bag.findIndex((id) => !out.length || id !== out[out.length - 1].typeId || pool.length === 1);
      if (k < 0) k = 0;
      const id = bag.splice(k, 1)[0];
      const q = generate(id, r, level, avoid);
      if (!q || out.some((x) => x.key === q.key || (x.top === q.top && x.bottom === q.bottom))) { bag.push(id); continue; }
      out.push(Object.assign(q, { id: `l${++i}` }));
    }
    return out;
  }

  /** Grade a submitted answer (number text, an option, or a SubtractKit result value). */
  function check(q, given) {
    if (given === null || given === undefined || given === '') return false;
    if (q.format === 'choice') return given === q.answer;
    const s = String(given).replace(/[,\s]/g, '');
    return /^\d+$/.test(s) && Number(s) === q.answer;
  }

  /** Session score: correct / incorrect / skipped, by kind, and the missed questions. */
  function scoreSession(answers) {
    const byType = {};
    let correct = 0, incorrect = 0, skipped = 0;
    for (const a of answers) {
      const t = (byType[a.typeId] = byType[a.typeId] || { correct: 0, total: 0 });
      t.total += 1;
      if (a.skipped) skipped += 1; else if (a.correct) { correct += 1; t.correct += 1; } else incorrect += 1;
    }
    const total = answers.length;
    return { total, correct, incorrect, skipped, percent: total ? Math.round((100 * correct) / total) : 0, byType };
  }

  const api = { TYPES, TYPE, LEVELS, generate, makeSession, check, scoreSession, typesFor, barModel };
  if (node) module.exports = api;
  else root.GalaxySubBank = api;
})(typeof window !== 'undefined' ? window : globalThis);
