/* Galaxy Math division question bank: twelve kinds of division problems (A–L) shared by Practice, the Math
   Thinking Lab and progress tracking. Every problem is an exact division made from a multiplication fact
   (dividend = divisor × quotient), so quotients are whole numbers and the divisor is never 0. Remainders are only
   taught in their own extension lesson and never appear here. Each kind lists its skill, difficulty, answer format
   and Teach lesson; each problem has a prompt, answer, distractors (choice kinds), a picture, a clue, a hint with a
   diagram, and a worked explanation. window.GalaxyDivBank / Node. */
(function (root) {
  'use strict';
  const node = typeof module === 'object' && module.exports;
  const D = node ? require('./div-math.js') : root.GalaxyDiv;
  const Kit = node ? require('./bank-kit.js') : root.GalaxyBankKit;

  /** difficulty: 1 = core idea, 2 = reasoning with it, 3 = challenge (joins Practice after its lesson). */
  const TYPES = [
    { id: 'dfact', letter: 'A', name: 'Division facts', skill: 'Find a quotient using a multiplication fact', difficulty: 1, lesson: 'div-using-mult', format: 'number' },
    { id: 'missdivisor', letter: 'B', name: 'Missing divisor', skill: 'Find how many groups (the divisor)', difficulty: 2, lesson: 'missing-divisors', format: 'number' },
    { id: 'missdividend', letter: 'C', name: 'Missing dividend', skill: 'Find the total that was divided', difficulty: 2, lesson: 'missing-dividends', format: 'number' },
    { id: 'share', letter: 'D', name: 'Equal sharing', skill: 'Share a total equally: how many in each group?', difficulty: 1, lesson: 'equal-sharing', format: 'number' },
    { id: 'group', letter: 'E', name: 'Equal grouping', skill: 'Make groups of a size: how many groups?', difficulty: 1, lesson: 'equal-grouping', format: 'number' },
    { id: 'darray', letter: 'F', name: 'Arrays', skill: 'Use rows and columns to divide', difficulty: 1, lesson: 'div-arrays', format: 'number' },
    { id: 'subtract', letter: 'G', name: 'Repeated subtraction', skill: 'Divide by taking away equal groups', difficulty: 2, lesson: 'repeated-subtraction', format: 'number' },
    { id: 'dfamily', letter: 'H', name: 'Fact families', skill: 'Connect multiplication and division facts', difficulty: 2, lesson: 'div-fact-families', format: 'number|choice' },
    { id: 'related', letter: 'I', name: 'Related multiplication', skill: 'Use or check with a multiplication fact', difficulty: 2, lesson: 'check-with-mult', format: 'number|choice' },
    { id: 'dmatch', letter: 'J', name: 'Match the equation', skill: 'Connect a picture to a division equation', difficulty: 2, lesson: 'div-equations', format: 'choice' },
    { id: 'dword', letter: 'K', name: 'Word problems', skill: 'Decide: sharing or grouping? Then divide', difficulty: 2, lesson: 'div-word-problems', format: 'number' },
    { id: 'derror', letter: 'L', name: 'Who is right?', skill: 'Find and explain a division mistake', difficulty: 3, lesson: 'explain-errors', format: 'choice' }
  ];
  const TYPE = Object.fromEntries(TYPES.map((t) => [t.id, t]));
  const STARTER_TYPES = ['dfact', 'share', 'group', 'darray', 'related', 'dmatch'];
  const ANSWER_FORMATS = { number: 'a whole number typed with the number pad or keyboard (spaces and leading zeros are ignored)', choice: 'one of the listed options' };

  const plural = (n, w, many = w + 's') => `${n} ${n === 1 ? w : many}`;
  const pickFrom = (arr, rng) => arr[Math.floor(rng() * arr.length)];
  const NAMES = ['Sam', 'Ava', 'Leo', 'Mia', 'Noah', 'Zoe', 'Eli', 'Ruby'];
  const near = (n, max) => (n + 1 <= max ? n + 1 : n - 1);
  const uniq = (correct, list, n = 2) => [...new Set(list.filter((x) => x && x !== correct))].slice(0, n);
  function choiceQuestion(base, correct, distractors, rng) {
    return { ...base, format: 'choice', answer: correct, options: D.shuffle([correct, ...distractors], rng), distractors };
  }
  const groupsPic = (g, n) => (g <= 12 ? { kind: 'groups', groups: g, size: n } : { kind: 'array', rows: g, cols: n });
  const firstJumps = (size, total) => { const k = Math.min(2, total / size - 1); return k >= 1 ? { kind: 'jumps', jumps: k, size, labels: false } : null; };

  // Story pieces: sharing (how many in each?) and grouping (how many groups?).
  const SHARE_STORIES = [
    (p, d) => `${p} stickers are shared equally by ${d} friends. How many stickers does each friend get?`,
    (p, d) => `${p} apples are put equally into ${d} baskets. How many apples go in each basket?`,
    (p, d) => `A teacher shares ${p} pencils equally among ${d} tables. How many pencils does each table get?`,
    (p, d) => `The Galaxy Math rocket crew packs ${p} space snacks equally into ${d} lunch boxes for a long trip around the Moon. How many snacks go in each lunch box?`
  ];
  const GROUP_STORIES = [
    (p, d) => `A coach has ${p} baseballs and puts ${d} in each bag. How many bags does the coach fill?`,
    (p, d) => `There are ${p} crayons. Each box holds ${d} crayons. How many boxes are needed?`,
    (p, d) => `${p} children line up in teams of ${d}. How many teams are there?`,
    (p, d) => `At the space museum, ${p} visitors ride the rocket simulator. Each ride takes exactly ${d} visitors. How many rides does it take for everyone to have a turn?`
  ];

  /** Build question \`typeId\` for divisor fam and quotient other (dividend = fam × other), or null if it does not fit. */
  function generate(typeId, fam, other, { rng = Math.random, maxFactor = 12 } = {}) {
    const t = TYPE[typeId];
    if (!t) throw new Error(`unknown question type ${typeId}`);
    if (!(fam >= 1 && other >= 1)) throw new Error('division facts need a divisor and quotient of at least 1');
    const d = fam, q = other, p = d * q;
    const base = { typeId, typeName: t.name, skill: t.skill, difficulty: t.difficulty, lesson: t.lesson, fam, other, product: p,
      dividend: p, divisor: d, quotient: q, factKey: D.factKey(fam, other), extension: D.isExtension(fam, other), format: 'number', accept: ANSWER_FORMATS.number,
      equation: `${p} ÷ ${d} = ${q}`, visual: null };
    const done = (o) => ({ ...base, ...o, key: `${typeId}:${o.variantKey || base.factKey}` });
    const fullShare = groupsPic(d, q);   // d groups with q in each: the finished sharing picture

    switch (typeId) {
      case 'dfact':
        return done({ a: p, b: d, answer: q, prompt: `${p} ÷ ${d} = ?`, big: true,
          hints: [{ text: `Think multiplication: ${d} times what number makes ${p}?` },
            { text: `Count by ${d}s until you reach ${p}, and count the jumps. Here is how it starts.`, visual: firstJumps(d, p) }],
          explain: { text: `${d} × ${q} = ${p}, so ${p} ÷ ${d} = ${q}. ${p} shared into ${plural(d, 'equal group')} gives ${q} in each.`, visual: d <= 10 ? fullShare : null } });
      case 'missdivisor':
        return done({ a: p, b: d, answer: d, prompt: `${p} ÷ ? = ${q}`, big: true, variantKey: `${base.factKey}:d`,
          hints: [{ text: `The missing number is the divisor. ${p} split into how many equal groups gives ${q} in each?` },
            { text: `Think: what number times ${q} makes ${p}? Count by ${q}s up to ${p}.`, visual: firstJumps(q, p) }],
          explain: { text: `${d} × ${q} = ${p}, so ${p} ÷ ${d} = ${q}. The missing divisor is ${d}.`, visual: d <= 10 ? fullShare : null } });
      case 'missdividend':
        return done({ a: p, b: d, answer: p, prompt: `? ÷ ${d} = ${q}`, big: true, variantKey: `${base.factKey}:p`,
          hints: [{ text: `The missing number is the dividend: the total before it was divided.` },
            { text: `Put the ${plural(d, 'group')} of ${q} back together. How many is that in all?`, visual: d <= 10 ? fullShare : null }],
          explain: { text: `${d} groups of ${q} make ${p} (${d} × ${q} = ${p}), so ${p} ÷ ${d} = ${q}.`, visual: d <= 10 ? fullShare : null } });
      case 'share': {
        if (d < 2 || d > 10 || p > 100) return null;
        const story = pickFrom(SHARE_STORIES.slice(0, 3), rng)(p, d);
        return done({ a: p, b: d, answer: q, prompt: story, visual: { kind: 'share', total: p, groups: d }, variantKey: `${base.factKey}:s`,
          hints: [{ text: `This is sharing: you know the number of groups (${d}). Deal the things out one at a time until they are all gone.` },
            { text: `Here is the sharing after two rounds: every group got 2. Keep dealing. How many will each group get?`, visual: q > 2 ? { kind: 'share', total: p, groups: d, dealt: 2 } : null }],
          explain: { text: `Sharing ${p} equally into ${plural(d, 'group')} puts ${q} in each group: ${p} ÷ ${d} = ${q}. Check: ${d} × ${q} = ${p}.`, visual: { kind: 'share', total: p, groups: d, dealt: q } } });
      }
      case 'group': {
        if (d < 2 || q > 12 || p > 100) return null;
        const story = pickFrom(GROUP_STORIES.slice(0, 3), rng)(p, d);
        return done({ a: p, b: d, answer: q, prompt: story, visual: { kind: 'grouping', total: p, size: d }, variantKey: `${base.factKey}:g`,
          hints: [{ text: `This is grouping: you know the size of each group (${d}). Circle groups of ${d} until none are left.` },
            { text: `Here are the first 2 groups of ${d}, circled. Keep circling. How many groups?`, visual: q > 2 ? { kind: 'grouping', total: p, size: d, circled: 2 } : null }],
          explain: { text: `${p} in groups of ${d} makes ${plural(q, 'group')}: ${p} ÷ ${d} = ${q}. Check: ${q} × ${d} = ${p}.`, visual: { kind: 'grouping', total: p, size: d, circled: q } } });
      }
      case 'darray': {
        if (d > 12 || q > 12) return null;
        const askRows = rng() < 0.5;
        // the array always has d rows and q columns; ask for the side that is not given
        return done({ a: p, b: d, answer: askRows ? d : q, variantKey: `${base.factKey}:${askRows ? 'r' : 'c'}`, visual: { kind: 'array', rows: d, cols: q },
          prompt: askRows ? `These ${p} dots are in rows of ${q}. How many rows are there?` : `These ${p} dots are in ${d} equal rows. How many dots are in each row?`,
          hints: [{ text: askRows ? `Each row has ${q}. How many rows of ${q} make ${p}?` : `There are ${d} rows. ${d} times what number makes ${p}?` },
            { text: askRows ? `Count by ${q}s, one row at a time, until you reach ${p}.` : `Count the dots in just the top row.` }],
          explain: { text: askRows ? `${p} ÷ ${q} = ${d}: there are ${d} rows of ${q}.` : `${p} ÷ ${d} = ${q}: each of the ${d} rows has ${q} dots.`, visual: null } });
      }
      case 'subtract': {
        if (d < 2 || q > 10) return null;
        return done({ a: p, b: d, answer: q, prompt: `Start at ${p}. Subtract ${d} again and again until you reach 0. How many times do you subtract ${d}?`,
          hints: [{ text: `Write it out: ${p} − ${d} = ${p - d}, then keep going and count your subtractions.` },
            { text: `Here are the first jumps back from ${p}. Keep jumping back by ${d} to 0, and count the jumps.`, visual: { kind: 'jumpsBack', jumps: q, size: d, labels: false, shown: Math.min(2, q - 1) } }],
          explain: { text: `Taking ${d} away from ${p} again and again reaches 0 after ${q} subtractions, so ${p} ÷ ${d} = ${q}.`, visual: { kind: 'jumpsBack', jumps: q, size: d } } });
      }
      case 'dfamily': {
        if (rng() < 0.5) {   // number form: given the multiplication, use the other division member
          return done({ a: p, b: q, answer: d, prompt: `${d} × ${q} = ${p}. So ${p} ÷ ${q} = ?`, variantKey: `${base.factKey}:n`, equation: `${p} ÷ ${q} = ${d}`,
            hints: [{ text: `A fact family uses the same three numbers: ${d}, ${q} and ${p}.` },
              { text: `${p} ÷ ${q} asks: ${q} times what makes ${p}? The multiplication fact tells you.` }],
            explain: { text: `${d} × ${q} = ${p}, so ${p} ÷ ${q} = ${d} and ${p} ÷ ${d} = ${q}. They are all in the same family.`, visual: null } });
        }
        const correct = `${p} ÷ ${d} = ${q}`;
        const qn = near(q, maxFactor), qm = q - 1;
        // TRUE facts from other families (no false fact is ever offered), each using different numbers.
        const same = (a, b, c) => [a, b, c].sort((x, y) => x - y).join() === [p, d, q].sort((x, y) => x - y).join();
        const third = [[p, d, p - d, `${p} − ${d} = ${p - d}`], [d, q, d + q, `${d} + ${q} = ${d + q}`], [p, d, p + d, `${p} + ${d} = ${p + d}`]]
          .find(([a, b, c]) => c > 0 && !same(a, b, c))[3];
        const ds = uniq(correct, [`${d * qn} ÷ ${d} = ${qn}`, qm >= 1 ? `${d * qm} ÷ ${d} = ${qm}` : null, third]);
        return done({ ...choiceQuestion({ ...base, a: p, b: d, prompt: `Which division fact is in the same family as ${d} × ${q} = ${p}?`, variantKey: `${base.factKey}:c` }, correct, ds, rng),
          hints: [{ text: `A fact family uses the same three numbers. Which choice uses only ${d}, ${q} and ${p}?` },
            { text: `The family is ${d} × ${q} = ${p}, ${q} × ${d} = ${p}, ${p} ÷ ${d} = ${q} and ${p} ÷ ${q} = ${d}.` }],
          explain: { text: `${p} ÷ ${d} = ${q} uses the same three numbers as ${d} × ${q} = ${p}. The other choices use different numbers.`, visual: null } });
      }
      case 'related': {
        const form = rng();
        if (form < 0.4) {
          return done({ a: p, b: d, answer: q, prompt: `${d} × ? = ${p}, so ${p} ÷ ${d} = ?`, variantKey: `${base.factKey}:n`,
            hints: [{ text: `Both blanks are the same number.` }, { text: `Count by ${d}s to ${p} and count the jumps.`, visual: firstJumps(d, p) }],
            explain: { text: `${d} × ${q} = ${p}, so ${p} ÷ ${d} = ${q}. Division undoes multiplication.`, visual: null } });
        }
        const check = form >= 0.7;
        const correct = `${d} × ${q} = ${p}`;
        // Never offer ${q} × ${d}: it would also be right. Distractors are true facts that do not use both ${d} and ${q} to make ${p}.
        const qn = near(q, maxFactor);
        const ds = uniq(correct, [`${d} + ${q} = ${d + q}`, `${d} × ${qn} = ${d * qn}`, d !== q && d * d !== p ? `${d} × ${d} = ${d * d}` : `${p} − ${d} = ${p - d}`]);
        const name = pickFrom(NAMES, rng);
        return done({ ...choiceQuestion({ ...base, a: p, b: d, variantKey: `${base.factKey}:${check ? 'chk' : 'use'}`,
          prompt: check ? `${name} says ${p} ÷ ${d} = ${q}. Which multiplication checks ${name}'s answer?` : `Which multiplication fact helps you solve ${p} ÷ ${d}?` }, correct, ds, rng),
          hints: [{ text: check ? `To check a division, multiply the answer by the divisor.` : `Look for a fact that uses ${d} and makes ${p}.` },
            { text: `${p} ÷ ${d} asks: ${d} times what makes ${p}?` }],
          explain: { text: `${d} × ${q} = ${p}, so ${p} ÷ ${d} = ${q}.${check ? ` The answer checks out.` : ''}`, visual: null } });
      }
      case 'dmatch': {
        if (d < 2 || d > 10) return null;
        const correct = `${p} ÷ ${d}`;
        // Never offer ${p} ÷ ${q}: the same picture could also be read that way. Distractors are common mix-ups.
        const ds = uniq(correct, [`${p} − ${d}`, `${d} ÷ ${p}`, `${p} + ${d}`]);
        return done({ ...choiceQuestion({ ...base, a: p, b: d, prompt: `${p} stars are put into ${d} equal groups. Which division matches the picture?`, visual: groupsPic(d, q), variantKey: `${base.factKey}:m` }, correct, ds, rng),
          hints: [{ text: `Division starts with the total. How many in all? How many groups?` },
            { text: `Total ÷ number of groups = how many in each group.` }],
          explain: { text: `${p} things in ${d} equal groups is ${p} ÷ ${d} = ${q}: each group has ${q}.`, visual: null } });
      }
      case 'dword': {
        if (d < 2 || p > 100) return null;
        const sharing = rng() < 0.5;
        const pool = sharing ? SHARE_STORIES : GROUP_STORIES;
        const story = pickFrom(pool, rng)(p, d);
        return done({ a: p, b: d, answer: q, prompt: story, variantKey: `${base.factKey}:${sharing ? 's' : 'g'}${pool.indexOf(pool.find((f) => f(p, d) === story))}`,
          hints: [{ text: sharing ? `Do you know the number of groups, or the size of each group? Here you know the number of groups (${d}).` : `Do you know the number of groups, or the size of each group? Here you know the size of each group (${d}).` },
            sharing ? { text: `Share ${p} equally into ${d} groups. Each group gets the same number.`, visual: q > 2 ? { kind: 'share', total: p, groups: d, dealt: 2 } : null }
              : { text: `Make groups of ${d} from ${p}. How many groups?`, visual: q > 2 ? { kind: 'grouping', total: p, size: d, circled: 2 } : null }],
          explain: { text: `${sharing ? `Sharing ${p} into ${plural(d, 'group')}` : `${p} in groups of ${d}`} gives ${q}: ${p} ÷ ${d} = ${q}. Check: ${d} × ${q} = ${p}.`,
            visual: sharing ? { kind: 'share', total: p, groups: d, dealt: q } : { kind: 'grouping', total: p, size: d, circled: q } } });
      }
      case 'derror': {
        if (p < 4) return null;
        const names = D.shuffle(NAMES.slice(), rng).slice(0, 3);
        const wrong = [...new Set([q + 1, q > 1 ? q - 1 : null, p - d !== q ? p - d : null].filter((v) => v !== null && v > 0 && v !== q))].slice(0, 2);
        while (wrong.length < 2) wrong.push(q + 1 + wrong.length + 1);
        const claims = [q, ...wrong];
        const options = names.map((n, i) => `${n}: ${p} ÷ ${d} = ${claims[i]}`);
        const correct = options[0];
        const why = (v) => (v === p - d ? `subtracted instead of dividing` : v === q + 1 ? `${v} × ${d} = ${v * d}, too many` : `${v} × ${d} = ${v * d}, too few`);
        return done({ ...choiceQuestion({ ...base, a: p, b: d, prompt: `Which student solved ${p} ÷ ${d} correctly?`, variantKey: `${base.factKey}:e` }, correct, options.slice(1), rng),
          hints: [{ text: `Solve ${p} ÷ ${d} yourself first. Then find the student who got the same answer.` },
            { text: `Check each answer by multiplying it by ${d}. Which one makes ${p}?` }],
          explain: { text: `${p} ÷ ${d} = ${q} because ${d} × ${q} = ${p}. ${names[1]} ${why(claims[1])}; ${names[2]} ${why(claims[2])}.`, visual: null } });
      }
      default: return null;
    }
  }

  const { check, factPool, makeSet, unlockedTypes, skillStatus, scoreSession, practiceTypes } = Kit.createBankKit({ TYPES, STARTER_TYPES, generate, M: D, fallbackType: 'dfact' });

  const api = { TYPES, TYPE, STARTER_TYPES, ANSWER_FORMATS, generate, check, factPool, makeSet, unlockedTypes, skillStatus, scoreSession, practiceTypes, SHARE_STORIES, GROUP_STORIES };
  if (node) module.exports = api;
  else root.GalaxyDivBank = api;
})(this);
