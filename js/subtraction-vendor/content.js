/*
 * Subtract with Regrouping: teaching content and configuration only (no DOM, no storage).
 * Learn steps, the Practice Together set, targeted skills, the test blueprint, item builders and the Parent Guide.
 * Uses SubtractKit.math for every answer; numbers are checked in tests/subtract-regrouping.test.js.
 */
(function (root) {
  'use strict';
  const MB = (root.Mathbook = root.Mathbook || {});
  const M = root.SubtractKit.math;
  const P = M.PLACES;
  const fmt = M.fmt;
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // ---------- Item kinds ----------
  // sub: a subtraction worked in the workspace (final answer). steps: write the regrouped top number (amounts only).
  // decide: does it need regrouping, and which column first? mistake: what went wrong in someone's work + the right answer.
  // check: solve, then choose the addition that checks it. exchange: Learn 1 (one exchange keeps the value).
  const NAMES = ['Sam', 'Ivy', 'Leo', 'Ana', 'Max', 'Nia', 'Omar', 'Zoe'];
  const BUG_TEXT = {
    'smaller-from-larger': 'Subtracted the smaller digit from the larger one instead of exchanging.',
    'no-reduce': 'Added 10 to a place but did not take 1 from the place on its left.',
    'original-digit': 'Used the original digit after that place gave 1 away.',
    'zero-ten': 'Passed an exchange through a zero but left it as 10 instead of 9.',
    misaligned: 'Did not line up the ones under the ones.'
  };
  const BUGS = Object.keys(BUG_TEXT);

  function decideItem(top, bottom, extra) {
    const c = M.classify(top, bottom), first = M.plan(top, bottom).columns.find((x) => x.needs);
    const placeChoices = P.slice(0, M.lengthOf(top)).map((p) => cap(p.name)).concat('No column');
    return Object.assign({ kind: 'decide', top, bottom, needs: c.exchanges > 0 ? 'Yes' : 'No', first: first ? cap(P[first.place].name) : 'No column', placeChoices }, extra || {});
  }
  function mistakeItem(r, top, bottom, bug, extra) {
    const work = M.buggyWork(top, bottom, bug);
    if (!work) return null;
    const others = M.shuffle(r, BUGS.filter((b) => b !== bug)).slice(0, 3); // always 4 choices; any mistake is a fair wrong choice
    const choices = M.shuffle(r, [bug].concat(others)).map((b) => BUG_TEXT[b]);
    return Object.assign({ kind: 'mistake', top, bottom, bug, who: NAMES[Math.floor(r() * NAMES.length)], work, wrong: work.answer, choices, answer: BUG_TEXT[bug] }, extra || {});
  }
  const CHECK_CHOICES = (a, b) => [`Add your answer to ${fmt(b)}. You should get ${fmt(a)}.`, `Add your answer to ${fmt(a)}. You should get ${fmt(b)}.`,
    `Add ${fmt(a)} and ${fmt(b)}. You should get your answer.`, `Subtract ${fmt(b)} from your answer. You should get ${fmt(a)}.`];
  function checkItem(r, top, bottom) { const ch = CHECK_CHOICES(top, bottom); return { kind: 'check', top, bottom, choices: M.shuffle(r, ch), answer: ch[0] }; }

  /** A problem of a given kind, or a fallback. */
  function gen(r, spec, avoid) { return M.generateOne(r, Object.assign({ avoid }, spec)) || M.generateOne(r, Object.assign({ avoid }, spec, { chain: undefined })); }
  /** Someone's work with this mistake (tries several problems). */
  function mistakeFor(r, bug, size, avoid) {
    for (let k = 0; k < 400; k++) {
      const spec = bug === 'zero-ten' ? { size, difficulty: 'hard' } : bug === 'misaligned' ? { size, difficulty: 'none' } : { size, difficulty: (k < 200 ? r() < 0.5 : k % 2) ? 'medium' : 'easy' };
      const q = M.generateOne(r, Object.assign({ avoid }, spec));
      if (!q) continue;
      if (bug === 'misaligned' && M.lengthOf(q.bottom) === size) continue;
      const it = mistakeItem(r, q.top, q.bottom, bug);
      if (it) return it;
    }
    return null;
  }
  function decideFor(r, needs, size, avoid) {
    const q = gen(r, { size, difficulty: needs ? (r() < 0.5 ? 'easy' : 'medium') : 'none' }, avoid);
    return decideItem(q.top, q.bottom);
  }

  // ---------- Learn ----------
  const learn = [
    {
      id: 'value', title: 'Regrouping keeps the value', topics: [1],
      explain: 'Regrouping changes how a number is shown. Its value stays the same.',
      // Start small: one two-digit number, one exchange, one action at a time (larger numbers and zeros come later).
      examples: [{ kind: 'blocks', n: 49 }, { kind: 'blocks', n: 72 }],
      yourTurn: (r) => { const t = 2 + Math.floor(r() * 8), o = Math.floor(r() * 10); return { kind: 'exchange', n: t * 10 + o, tens: t, ones: o }; }
    },
    {
      id: 'one', title: 'One exchange', topics: [2, 3],
      explain: 'Start with the ones. If the top is less than the bottom, exchange 1 from the place on the left.',
      examples: [{ kind: 'demo', top: 52, bottom: 27 }, { kind: 'demo', top: 463, bottom: 128 }],
      yourTurn: (r) => Object.assign({ kind: 'guided' }, gen(r, { size: r() < 0.5 ? 2 : 3, difficulty: 'easy' }, new Set(['52-27', '463-128'])))
    },
    {
      id: 'multi', title: 'More than one exchange', topics: [4],
      explain: 'After an exchange, check every column again from right to left. A place that gave 1 away has 1 less.',
      examples: [{ kind: 'demo', top: 532, bottom: 168 }],
      yourTurn: (r) => Object.assign({ kind: 'guided' }, gen(r, { size: 3, difficulty: 'medium' }, new Set(['532-168'])))
    },
    {
      id: 'four', title: 'Four-digit numbers', topics: [5, 6],
      explain: 'Four-digit numbers work the same way: ones, tens, hundreds, thousands. One exchange at a time.',
      examples: [{ kind: 'demo', top: 4352, bottom: 2126 }, { kind: 'demo', top: 4532, bottom: 1768 }],
      yourTurn: (r) => Object.assign({ kind: 'guided' }, gen(r, { size: 4, difficulty: r() < 0.5 ? 'easy' : 'medium' }, new Set(['4352-2126', '4532-1768'])))
    },
    {
      id: 'zero1', title: 'Regrouping across a zero', topics: [7],
      explain: 'A place with 0 has nothing to give. Exchange into it from the left first, then pass 1 on.',
      examples: [{ kind: 'demo', top: 4305, bottom: 1268 }],
      yourTurn: (r) => Object.assign({ kind: 'guided' }, gen(r, { size: 4, difficulty: 'hard', chain: 1 }, new Set(['4305-1268'])))
    },
    {
      id: 'zeros2', title: 'Across zeros next to each other', topics: [8],
      explain: 'Go through each zero, one exchange at a time. Each zero gets 10, gives 1 away, and ends with 9.',
      examples: [{ kind: 'demo', top: 3002, bottom: 1578 }],
      yourTurn: (r) => Object.assign({ kind: 'guided' }, gen(r, { size: 4, difficulty: 'hard', chain: 2 }, new Set(['3002-1578'])))
    },
    {
      id: 'decide', title: 'Do I need to regroup?', topics: [9],
      explain: 'Look at each column from right to left. Regroup only when the top amount is less than the bottom digit.',
      examples: [{ kind: 'demo', top: 6487, bottom: 2135 }, { kind: 'demo', top: 5264, bottom: 1839 }],
      yourTurn: (r) => decideFor(r, r() < 0.6, 4, new Set(['6487-2135', '5264-1839']))
    },
    {
      id: 'mistakes', title: 'Find and fix mistakes', topics: [10],
      explain: 'Check someone\'s work column by column. Did each exchange take 1 away and give 10? Did they use the new amounts?',
      examples: [
        { kind: 'mistake', top: 5264, bottom: 1839, bug: 'smaller-from-larger', who: 'Ivy', note: 'Ivy wrote 4,635. In the ones she did 9 − 4 instead of exchanging, and in the hundreds 8 − 2. Exchange first: the right answer is 3,425.' },
        { kind: 'mistake', top: 3002, bottom: 1578, bug: 'zero-ten', who: 'Leo', note: 'Leo wrote 1,534. He exchanged through the zeros but left them as 10. Each zero gets 10 and gives 1 away, so it ends with 9: the right answer is 1,424.' }
      ],
      yourTurn: (r) => mistakeFor(r, BUGS[Math.floor(r() * 4)], 4, new Set(['5264-1839', '3002-1578']))
    },
    {
      id: 'check', title: 'Check with addition', topics: [11],
      explain: 'Addition undoes subtraction. Add your answer to the number you took away; you should get the top number.',
      examples: [{ kind: 'check', top: 3002, bottom: 1578 }],
      yourTurn: (r) => { const q = gen(r, { size: 4, difficulty: r() < 0.5 ? 'medium' : 'hard' }, new Set(['3002-1578'])); return checkItem(r, q.top, q.bottom); }
    }
  ];

  // ---------- Practice Together (guided; verified by hand and in tests) ----------
  const together = [
    { top: 83, bottom: 47 }, { top: 652, bottom: 318 }, { top: 724, bottom: 386 }, { top: 6483, bottom: 2157 },
    { top: 5316, bottom: 2758 }, { top: 7405, bottom: 3168 }, { top: 6003, bottom: 2847 }, { top: 800, bottom: 356 }
  ];
  const togetherTips = [
    'Ask: is the top digit in the ones enough to take away the bottom digit?',
    'Ask: which place is just to the left of the ones?',
    'After the first exchange, ask: how many tens are there now?',
    'Ask: which columns still need an exchange?',
    'Ask: the tens gave 1 away. How many does it have now?',
    'Ask: the tens has 0. Where can it get some?',
    'Ask: what happens to each zero when the exchange passes through it?',
    'Ask: how many exchanges does it take to get from the hundreds to the ones?'
  ];

  /** A Parent Help prompt built from the problem's own method (for "New problems"). */
  function tipFor(top, bottom) {
    const p = M.plan(top, bottom), need = p.columns.filter((c) => c.needs);
    if (!need.length) return 'Ask: does any column need an exchange? Check each one from the ones.';
    const z = need.find((x) => x.chain > 0); // a zero chain is the prompt that matters most
    const c = z || need[0], place = P[c.place].name;
    if (c.chain > 0) {
      const zeros = [];
      for (let k = c.place + 1; k < c.supplier; k++) zeros.push(P[k].name);
      return `Ask: the ${zeros.join(' and ')} ${zeros.length > 1 ? 'have' : 'has'} 0. Which place can give, and what happens to each zero?`;
    }
    if (need.length > 1) return `Ask: after the exchange in the ${place}, how many ${P[c.place + 1].name} are left? Which other columns need an exchange?`;
    return `Ask: is the top digit in the ${place} enough to take away the bottom digit? Which place can give?`;
  }

  // ---------- Targeted skills ----------
  const skills = [
    { id: 'one', title: 'One exchange', desc: 'Problems that need exactly one exchange.', make: (r, avoid, k) => sub(gen(r, { size: k % 2 ? 4 : 3, difficulty: 'easy' }, avoid)) },
    { id: 'multi', title: 'More than one exchange', desc: 'Two or more exchanges, no zeros in the way.', make: (r, avoid, k) => sub(gen(r, { size: k % 2 ? 4 : 3, difficulty: 'medium' }, avoid)) },
    { id: 'zero1', title: 'Across one zero', desc: 'An exchange passes through one zero.', make: (r, avoid, k) => sub(gen(r, { size: k % 3 === 2 ? 3 : 4, difficulty: 'hard', chain: 1 }, avoid)) },
    { id: 'zeros2', title: 'Across zeros next to each other', desc: 'An exchange passes through two or more zeros.', make: (r, avoid) => sub(gen(r, { size: 4, difficulty: 'hard', chain: 2 }, avoid)) },
    { id: 'four', title: 'Four-digit regrouping', desc: 'Four-digit numbers: easy, medium and hard.', make: (r, avoid, k) => sub(gen(r, { size: 4, difficulty: ['easy', 'medium', 'hard'][k % 3] }, avoid)) },
    { id: 'decide', title: 'Do I need to regroup?', desc: 'Decide before you subtract.', make: (r, avoid, k) => decideFor(r, k % 3 !== 2, k % 2 ? 4 : 3, avoid) },
    { id: 'mistakes', title: 'Find and fix mistakes', desc: 'Spot what went wrong and find the right answer.', make: (r, avoid, k) => mistakeFor(r, BUGS[k % BUGS.length], 4, avoid) || mistakeFor(r, BUGS[0], 4, avoid) }
  ];
  function sub(q) { return { kind: 'sub', top: q.top, bottom: q.bottom }; }
  const SKILL_LENGTH = 6;
  function skillSession(skillId, seed) {
    const sk = skills.find((s) => s.id === skillId), r = M.rng(seed >>> 0), avoid = new Set(), items = [];
    for (let k = 0; k < SKILL_LENGTH; k++) { const it = sk.make(r, avoid, k); if (it) items.push(Object.assign(it, { id: 'q' + (k + 1) })); }
    return items;
  }

  // ---------- Test (15 questions, new numbers each attempt) ----------
  const BLUEPRINT = [
    { kind: 'sub', size: 2, difficulty: 'easy', cat: 'final', skill: 'one' },
    { kind: 'sub', size: 3, difficulty: 'easy', cat: 'final', skill: 'one' },
    { kind: 'sub', size: 3, difficulty: 'medium', cat: 'final', skill: 'multi' },
    { kind: 'sub', size: 4, difficulty: 'easy', cat: 'final', skill: 'four' },
    { kind: 'sub', size: 4, difficulty: 'medium', cat: 'final', skill: 'four' },
    { kind: 'sub', size: 4, difficulty: 'medium', minExchanges: 3, cat: 'final', skill: 'multi' },
    { kind: 'sub', size: 4, difficulty: 'hard', chain: 1, cat: 'final', skill: 'zero1' },
    { kind: 'sub', size: 4, difficulty: 'hard', chain: 2, cat: 'final', skill: 'zeros2' },
    { kind: 'sub', size: 3, difficulty: 'hard', chain: 1, cat: 'final', skill: 'zero1' },
    { kind: 'steps', size: 4, difficulty: 'hard', chain: 1, cat: 'steps', skill: 'zero1' },
    { kind: 'steps', size: 4, difficulty: 'hard', chain: 2, cat: 'steps', skill: 'zeros2' },
    { kind: 'decide', size: 4, cat: 'decide', skill: 'decide' },
    { kind: 'mistake', size: 4, bugs: ['smaller-from-larger', 'no-reduce', 'original-digit'], cat: 'mistake', skill: 'mistakes' },
    { kind: 'mistake', size: 4, bugs: ['zero-ten'], cat: 'mistake', skill: 'mistakes' },
    { kind: 'sub', size: 4, difficulty: 'mixed', cat: 'final', skill: 'four' }
  ];
  function testItems(seed) {
    const r = M.rng(seed >>> 0), avoid = new Set();
    return BLUEPRINT.map((b, k) => {
      let it;
      if (b.kind === 'decide') it = decideFor(r, r() < 0.65, b.size, avoid);
      else if (b.kind === 'mistake') it = mistakeFor(r, b.bugs[Math.floor(r() * b.bugs.length)], b.size, avoid);
      else {
        const diff = b.difficulty === 'mixed' ? ['easy', 'medium', 'hard'][Math.floor(r() * 3)] : b.difficulty;
        const q = gen(r, { size: b.size, difficulty: diff, chain: b.chain, minExchanges: b.minExchanges }, avoid);
        it = { kind: b.kind, top: q.top, bottom: q.bottom };
      }
      return Object.assign(it, { id: 't' + (k + 1), cat: b.cat, skill: b.skill });
    });
  }

  // ---------- Practice setup ----------
  const SETUP = {
    sizes: [{ v: 2, label: '2-digit' }, { v: 3, label: '3-digit' }, { v: 4, label: '4-digit' }, { v: 'mixed', label: 'Mixed' }],
    difficulties: [
      { v: 'easy', label: 'Easy', desc: 'One exchange.' },
      { v: 'medium', label: 'Medium', desc: 'Two or more exchanges.' },
      { v: 'hard', label: 'Hard', desc: 'Exchanges across zeros.' },
      { v: 'mixed', label: 'Mixed', desc: 'Some of each, plus a few with no regrouping.' }],
    lengths: [10, 25, 50],
    defaults: { size: 4, difficulty: 'easy', length: 10 }
  };

  // ---------- Parent Guide ----------
  const parent = {
    goal: 'Your child subtracts numbers up to 9,999 in columns, regrouping (exchanging) whenever a column\'s top amount is less than the bottom digit, including across zeros, and checks the answer with addition.',
    meaning: [
      'Regrouping changes how we represent the number. Its value stays the same: 52 is 5 tens 2 ones or 4 tens 12 ones.',
      'An exchange always goes to the place next door: 1 ten for 10 ones, 1 hundred for 10 tens, 1 thousand for 10 hundreds.',
      'The giving place goes down by 1; the receiving place goes up by 10. Amounts above 9 (12 ones, 10 hundreds) are fine while regrouping.'
    ],
    progression: ['Why an exchange keeps the value', 'One exchange (2- and 3-digit)', 'More than one exchange', 'Four-digit numbers', 'Across one zero', 'Across zeros next to each other', 'Deciding whether to regroup', 'Finding and fixing mistakes', 'Checking with addition'],
    workedTop: 4532, workedBottom: 1768,
    zerosTop: 3002, zerosBottom: 1578,
    mistakes: [
      'Subtracting the smaller digit from the larger one in a column (8 − 2 instead of exchanging for 2 − 8).',
      'Adding 10 to a place without taking 1 from the place on its left.',
      'Jumping straight from the thousands to the ones across zeros, or leaving a zero as 10 instead of 9.',
      'Using the original digit after that place gave 1 away.',
      'Not lining up the ones under the ones when the numbers have different lengths.'
    ],
    prompts: ['"Which column are you working on?"', '"Is the top amount enough to take away the bottom digit?"', '"Which place can give? Does it have anything?"', '"What does that place have now? And the one that got 10?"', '"Did the value stay the same?"', '"How can you check with addition?"'],
    checklist: ['Explains that an exchange keeps the value.', 'Subtracts 2-, 3- and 4-digit numbers with one exchange.', 'Handles more than one exchange.', 'Regroups across one zero and across zeros next to each other.', 'Decides when regrouping is needed.', 'Finds and fixes mistakes in someone\'s work.', 'Checks a difference with addition.', 'Scores 90% or more on the Regrouping Test.'],
    results: [
      'My Results shows final answers separately from the regrouping-step questions, the regrouping decision and error analysis.',
      'Each missed question names its kind (for example "Across zeros next to each other") and links to that skill\'s targeted practice. A wrong final answer alone does not tell us which mistake was made; watch your child work one, or use the targeted practice with feedback.',
      'Practice on My Own lets you choose the number size, difficulty and length. Start with 4-digit Easy, then move up.'
    ]
  };

  MB.subtractRegrouping = {
    id: 'sr', title: 'Subtract with Regrouping', storagePrefix: 'mathbook:v2:subtract-regrouping',
    learn, together, togetherTips, tipFor, skills, skillSession, SKILL_LENGTH, BLUEPRINT, testItems, SETUP, parent, BUG_TEXT, CHECK_CHOICES,
    decideItem, mistakeItem, checkItem
  };
})(typeof window !== 'undefined' ? window : globalThis);
