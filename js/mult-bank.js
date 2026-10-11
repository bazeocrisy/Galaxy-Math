/* Galaxy Math multiplication question bank: twelve question types (A–L) shared by Practice, the Math Thinking Lab
   and progress tracking. Each type documents its skill, difficulty, answer format and related Teach lesson; each
   generated question carries its prompt, answer, accepted formats, distractors (choice questions), picture,
   two-level hints and a worked explanation. Pure functions (window.GalaxyBank / Node). */
(function (root) {
  'use strict';
  const M = (typeof module === 'object' && module.exports) ? require('./mult-math.js') : root.GalaxyMult;

  /** The twelve question types. difficulty: 1 = core concept, 2 = reasoning with the concept, 3 = stretch (reasoning about
      relationships; multiplicative comparison is a stretch toward grade 4). */
  const TYPES = [
    { id: 'fact', letter: 'A', name: 'Multiplication facts', skill: 'Recall or work out a product', difficulty: 1, lesson: 'strategies', format: 'number' },
    { id: 'missing', letter: 'B', name: 'Missing factor', skill: 'Find an unknown factor', difficulty: 2, lesson: 'missing-factors', format: 'number' },
    { id: 'repeated', letter: 'C', name: 'Repeated addition', skill: 'Add equal groups', difficulty: 1, lesson: 'repeated-addition', format: 'number' },
    { id: 'match', letter: 'D', name: 'Match the equation', skill: 'Connect addition or a picture to a multiplication equation', difficulty: 2, lesson: 'connecting', format: 'choice' },
    { id: 'groups', letter: 'E', name: 'Equal groups', skill: 'Find the total of equal groups', difficulty: 1, lesson: 'equal-groups', format: 'number' },
    { id: 'array', letter: 'F', name: 'Arrays', skill: 'Use rows and columns to multiply', difficulty: 1, lesson: 'arrays', format: 'number' },
    { id: 'turnaround', letter: 'G', name: 'Switch the order', skill: 'Use the commutative property', difficulty: 2, lesson: 'commutative', format: 'number|choice' },
    { id: 'family', letter: 'H', name: 'Fact families', skill: 'Connect multiplication and division facts', difficulty: 2, lesson: 'fact-families', format: 'number|choice' },
    { id: 'word', letter: 'I', name: 'Word problems', skill: 'Find equal groups in a story', difficulty: 2, lesson: 'word-problems', format: 'number' },
    { id: 'error', letter: 'J', name: 'Check the work', skill: 'Decide whether an answer is right and fix it', difficulty: 3, lesson: 'check-the-work', format: 'choice' },
    { id: 'compare', letter: 'K', name: 'Times as many (challenge)', skill: 'Multiplicative comparison', difficulty: 3, lesson: 'times-as-many', format: 'number' },
    { id: 'equal', letter: 'L', name: 'Equal products', skill: 'Find the missing number that keeps an equation balanced', difficulty: 3, lesson: 'equations', format: 'number' }
  ];
  const TYPE = Object.fromEntries(TYPES.map((t) => [t.id, t]));
  // Always in the Lab: the first ideas taught, plus two low-risk reasoning kinds (switch the order, match the equation).
  const STARTER_TYPES = ['fact', 'groups', 'array', 'repeated', 'turnaround', 'match'];
  const ANSWER_FORMATS = { number: 'a whole number typed with the number pad or keyboard (spaces and leading zeros are ignored)', choice: 'one of the listed options' };

  const plural = (n, w, many = w + 's') => `${n} ${n === 1 ? w : many}`;
  const pickFrom = (arr, rng) => arr[Math.floor(rng() * arr.length)];
  const NAMES = ['Sam', 'Ava', 'Leo', 'Mia', 'Noah', 'Zoe', 'Eli', 'Ruby'];

  function choiceQuestion(base, correct, distractors, rng) {
    const options = M.shuffle([correct, ...distractors], rng);
    return { ...base, format: 'choice', answer: correct, options, distractors };
  }
  /** A neighbour of n (n + 1, or n − 1 when n + 1 would go past maxFactor). Keeps distractors inside the chosen range. */
  const near = (n, maxFactor) => (n + 1 <= maxFactor ? n + 1 : n - 1);
  /** Three distinct distractors from a candidate list (drops any equal to the answer or to each other). */
  const uniq = (correct, list, n = 2) => [...new Set(list.filter((x) => x && x !== correct))].slice(0, n);

  /** Build question `typeId` for the fact fam × other, or null when that type does not fit the fact.
      maxFactor limits any extra numbers the type introduces (10 = core facts only). */
  function generate(typeId, fam, other, { rng = Math.random, maxFactor = 12 } = {}) {
    const t = TYPE[typeId];
    if (!t) throw new Error(`unknown question type ${typeId}`);
    const p = fam * other;
    const base = { typeId, typeName: t.name, skill: t.skill, difficulty: t.difficulty, lesson: t.lesson, fam, other, product: p,
      factKey: M.factKey(fam, other), extension: M.isExtension(fam, other), format: 'number', accept: ANSWER_FORMATS.number };
    const finish = (q) => ({ ...q, key: `${typeId}:${q.variantKey || q.factKey}` });

    // A, B, C, E, F, I reuse the original generators (their wording, pictures and explanations are kept).
    if (['fact', 'missing', 'groups', 'array', 'repeated', 'word'].includes(typeId)) {
      if ((typeId === 'groups' || typeId === 'repeated') && !M.groupShape(fam, other)) return null;
      if (typeId === 'repeated' && (fam === 1 || other === 1)) return null;
      const q = M.makeQuestion(typeId, fam, other, rng);
      const h = M.hintFor(q), e = M.explainFor(q);
      const out = { ...base, a: q.a, b: q.b, answer: q.answer, prompt: q.prompt, visual: q.visual || null, equation: q.equation, unit: q.unit,
        big: ['fact', 'missing', 'repeated'].includes(typeId), explain: e, variantKey: `${q.factKey}:${q.hidden || ''}` };
      if (typeId === 'repeated') { out.sub = `That is ${plural(q.a, 'group')} with ${q.b} in each group.`; out.subIsHint = true; }
      out.hints = HINTS[typeId](q, h);
      return finish(out);
    }

    if (typeId === 'match') {
      if (fam < 2 || other < 2) return null;   // 1 + 1 + 1 + … is not a useful match problem
      const [g, n] = M.groupShape(fam, other) && M.groupShape(fam, other)[0] >= 2 ? M.groupShape(fam, other) : [Math.max(fam, other), Math.min(fam, other)];
      if (g < 2) return null;
      const fromPicture = rng() < 0.5;
      const correct = `${g} × ${n}`;
      // Never offer the turned-around fact (n × g): it has the same value and would make two right answers.
      const ds = uniq(correct, [g !== n ? `${n} × ${n}` : `${near(g, maxFactor)} × ${n}`, `${g} + ${n}`, `${g} × ${near(n, maxFactor)}`]);
      const visual = fromPicture ? (rng() < 0.5 && g <= 10 ? { kind: 'groups', groups: g, size: n } : { kind: 'array', rows: g, cols: n }) : null;
      const what = visual ? (visual.kind === 'groups' ? `There are ${plural(g, 'group')} with ${n} in each group` : `There are ${plural(g, 'row')} with ${n} in each row`) : `${n} is added ${g} times, which is ${plural(g, 'group')} of ${n}`;
      const q = choiceQuestion({ ...base, a: g, b: n, prompt: visual ? 'Which multiplication matches this picture?' : 'Which multiplication matches this addition?', expr: visual ? undefined : Array(g).fill(n).join(' + '),
        visual, equation: `${g} × ${n} = ${g * n}`, variantKey: `${g}x${n}:${visual ? visual.kind : 'add'}` }, correct, ds, rng);
      q.hints = [{ text: visual ? 'Count the groups (or rows). Then count how many are in one group (or row).' : `Count how many times ${n} is added.` },
        { text: `In Galaxy Math the first number tells how many groups, and the second tells how many in each group.` }];
      q.explain = { text: `${what}, so it is ${g} × ${n}. (${g} + ${n} would only add the two numbers once.)`, visual: visual ? null : g <= 10 ? { kind: 'groups', groups: g, size: n } : { kind: 'array', rows: g, cols: n } };
      return finish(q);
    }

    if (typeId === 'turnaround') {
      if (fam === other) return null;
      const [a, b] = rng() < 0.5 ? [fam, other] : [other, fam];
      if (rng() < 0.5) {
        const q = { ...base, a, b, answer: p, prompt: `${a} × ${b} = ${p}. What is ${b} × ${a}?`, big: false, equation: `${b} × ${a} = ${p}`, variantKey: `${a}x${b}:n`,
          visual: null,
          hints: [{ text: 'Look closely: the same two numbers are being multiplied.' },
            { text: 'Switching the order of the factors does not change the product. Picture an array turned on its side.', visual: { kind: 'set', items: [{ visual: { kind: 'array', rows: Math.min(a, 12), cols: b }, caption: `${a} × ${b}` }, { visual: { kind: 'array', rows: b, cols: a }, caption: `${b} × ${a}` }] } }],
          explain: { text: `${b} × ${a} uses the same factors as ${a} × ${b}, just switched. The product stays ${p}.`, visual: null } };
        return finish(q);
      }
      const correct = `${b} × ${a}`;
      const ds = uniq(correct, [`${a} + ${b}`, `${b} × ${b}`, `${a} × ${a}`]);
      const q = choiceQuestion({ ...base, a, b, prompt: `Which is equal to ${a} × ${b}?`, visual: null, equation: `${a} × ${b} = ${b} × ${a} = ${p}`, variantKey: `${a}x${b}:c` }, correct, ds, rng);
      q.hints = [{ text: 'Look for the same two numbers being multiplied.' }, { text: 'Switching the order of the factors keeps the product the same.' }];
      q.explain = { text: `${b} × ${a} = ${p} and ${a} × ${b} = ${p}: switching the order does not change the product. (${a} + ${b} = ${a + b}.)`, visual: { kind: 'set', items: [{ visual: { kind: 'array', rows: a, cols: b }, caption: `${a} × ${b}` }, { visual: { kind: 'array', rows: b, cols: a }, caption: `${b} × ${a}` }] } };
      return finish(q);
    }

    if (typeId === 'family') {
      const [a, b] = rng() < 0.5 ? [fam, other] : [other, fam];
      if (rng() < 0.5) {
        const q = { ...base, a, b, answer: b, prompt: `${a} × ${b} = ${p}. So ${p} ÷ ${a} = ?`, big: false, equation: `${p} ÷ ${a} = ${b}`, variantKey: `${a}x${b}:div`, visual: null,
          hints: [{ text: `A fact family uses the same three numbers: ${a}, ${b} and ${p}.` },
            { text: `${p} ÷ ${a} asks: ${a} times what number makes ${p}? Use the multiplication fact you were given.` }],
          explain: { text: `${a} × ${b} = ${p}, so splitting ${p} into ${plural(a, 'equal group')} puts ${b} in each group: ${p} ÷ ${a} = ${b}.`, visual: a <= 10 ? { kind: 'groups', groups: a, size: b } : null } };
        return finish(q);
      }
      // For squares (3 × 3 = 9) the turned-around fact is the same as the one given, so use the division member.
      const correct = a === b || rng() < 0.5 ? `${p} ÷ ${a} = ${b}` : `${b} × ${a} = ${p}`;
      // Distractors are TRUE facts from other families (so no false fact is ever shown as an option), each using
      // a different set of three numbers. a + b = p happens only for 2 + 2 = 4, which would share the numbers, so skip it.
      const nb = near(b, maxFactor), na = near(a, maxFactor);
      const ds = uniq(correct, [a + b !== p ? `${a} + ${b} = ${a + b}` : null, `${a} × ${nb} = ${a * nb}`, a !== b ? `${b} × ${b} = ${b * b}` : `${na} × ${b} = ${na * b}`]);
      const q = choiceQuestion({ ...base, a, b, prompt: `Which fact is in the same family as ${a} × ${b} = ${p}?`, visual: null, equation: `${a} × ${b} = ${p}`, variantKey: `${a}x${b}:fam` }, correct, ds, rng);
      q.hints = [{ text: `A fact family uses the same three numbers. Which choice uses only ${a}, ${b} and ${p}?` },
        { text: `Its members are ${a} × ${b} = ${p}, ${b} × ${a} = ${p}, ${p} ÷ ${a} = ${b} and ${p} ÷ ${b} = ${a}.` }];
      q.explain = { text: `The family of ${a}, ${b} and ${p} is: ${a} × ${b} = ${p}, ${b} × ${a} = ${p}, ${p} ÷ ${a} = ${b}, ${p} ÷ ${b} = ${a}. The other choices use different numbers.`, visual: null };
      return finish(q);
    }

    if (typeId === 'error') {
      const [a, b] = rng() < 0.5 ? [fam, other] : [other, fam];
      const wrongs = [...new Set([b + 1 <= maxFactor ? a * (b + 1) : null, b > 1 ? a * (b - 1) : null, a + b].filter((v) => v !== null && v !== p && v > 0))];
      const name = pickFrom(NAMES, rng);
      const right = rng() < 0.34;
      const claim = right ? p : pickFrom(wrongs, rng);
      const yes = `Yes, ${name} is right`;
      const fix = (v) => `No, ${a} × ${b} = ${v}`;
      const correct = right ? yes : fix(p);
      const others = wrongs.filter((v) => v !== claim);
      const ds = right ? uniq(correct, others.map(fix)) : uniq(correct, [yes, ...others.map(fix)]);
      for (let k = 1; ds.length < 2; k++) { const v = fix(p + k); if (v !== correct && !ds.includes(v) && v !== fix(claim)) ds.push(v); }
      const reason = claim === a + b ? `${name} added instead of multiplying` : claim === a * (b + 1) ? `${claim} is ${a} × ${b + 1}, one group of ${a} too many` : claim === a * (b - 1) ? `${claim} is ${a} × ${b - 1}, one group of ${a} too few` : '';
      const q = choiceQuestion({ ...base, a, b, prompt: `${name} says ${a} × ${b} = ${claim}. Is ${name} right?`, visual: null, equation: `${a} × ${b} = ${p}`, variantKey: `${a}x${b}:${claim}` }, correct, ds, rng);
      q.hints = [{ text: `Work out ${a} × ${b} yourself first. Then compare.` },
        { text: b === 1 ? `Anything times 1 stays the same: ${a} × 1 is just ${a}.` : a === 1 ? `1 × ${b} is just one group of ${b}.`
          : `Use a fact you know: ${a} × ${b - 1} = ${a * (b - 1)}. Then add one more ${a}.` }];
      q.explain = { text: right ? `${a} × ${b} really is ${p}, so ${name} is right.` : `${a} × ${b} = ${p}, not ${claim}. ${reason ? reason[0].toUpperCase() + reason.slice(1) + '.' : ''}`.trim(), visual: a <= 12 ? { kind: 'array', rows: a, cols: b } : null };
      return finish(q);
    }

    if (typeId === 'compare') {
      // "times" must be at least 2; the smaller amount is the other factor.
      const options = [[fam, other], [other, fam]].filter(([times]) => times >= 2 && times <= 10);
      if (!options.length) return null;
      const [times, small] = pickFrom(options, rng);
      const [n1, n2] = [pickFrom(NAMES, rng), pickFrom(NAMES, rng)];
      const [kid1, kid2] = n1 === n2 ? [n1, NAMES[(NAMES.indexOf(n1) + 1) % NAMES.length]] : [n1, n2];
      const thing = pickFrom([['sticker', 'stickers'], ['shell', 'shells'], ['marble', 'marbles'], ['star badge', 'star badges']], rng);
      const q = { ...base, a: times, b: small, answer: times * small, big: false, variantKey: `${times}x${small}`,
        prompt: `${kid1} has ${plural(small, thing[0], thing[1])}. ${kid2} has ${times} times as many. How many ${thing[1]} does ${kid2} have?`,
        visual: null, equation: `${times} × ${small} = ${times * small}`, unit: thing[1],
        hints: [{ text: `“${times} times as many” means ${times} groups the size of ${kid1}'s amount.` },
          { text: `Look at the bars: ${kid2}'s amount is made of ${plural(times, 'bar')}, each the size of ${kid1}'s. How much is that altogether?`, visual: { kind: 'compare', times, size: small, names: [kid1, kid2] } }],
        explain: { text: `${kid1} has ${small}. ${times} times as many is ${times} × ${small} = ${times * small} ${thing[1]}.`, visual: { kind: 'compare', times, size: small, names: [kid1, kid2] } } };
      return finish(q);
    }

    if (typeId === 'equal') {
      // a × b = c × ?  where c × d is another way to make the same product (no repeats of a or b).
      const lim = maxFactor;
      const pairs = [];
      for (let c = 2; c <= lim; c++) if (p % c === 0) { const d = p / c; if (d >= 2 && d <= lim && c !== fam && c !== other) pairs.push([c, d]); }
      if (!pairs.length) return null;
      const [c, d] = pickFrom(pairs, rng);
      const [a, b] = rng() < 0.5 ? [fam, other] : [other, fam];
      const q = { ...base, a, b, answer: d, big: true, prompt: `${a} × ${b} = ${c} × ?`, equation: `${a} × ${b} = ${c} × ${d} = ${p}`, variantKey: `${a}x${b}=${c}`, visual: null,
        hints: [{ text: 'Both sides of the = sign must be worth the same amount.' },
          { text: `First find ${a} × ${b}. Then ask: ${c} times what number makes that much?` }],
        explain: { text: `${a} × ${b} = ${p}, and ${c} × ${d} = ${p} too, so the missing number is ${d}.`, visual: { kind: 'set', items: [{ visual: { kind: 'array', rows: a, cols: b }, caption: `${a} × ${b} = ${p}` }, { visual: { kind: 'array', rows: c, cols: d }, caption: `${c} × ${d} = ${p}` }] } } };
      return finish(q);
    }
    return null;
  }

  // Two-level hints for the original types: a clue first, then a strategy with a picture that never shows the total.
  const countStart = (step, times) => { const n = Math.min(times - 1, 3); return n >= 1 ? `${M.skipCount(step, n).join(', ')}, …` : `${step}`; };
  const HINTS = {
    fact: (q) => [{ text: `${q.a} × ${q.b} means ${plural(q.a, 'group')} of ${q.b}.` },
      { text: q.a === 1 ? `One group of ${q.b} is just ${q.b} things.` : `Skip-count by ${q.b}s, ${q.a} times: ${countStart(q.b, q.a)} Or use a fact you know and add one more group.`, visual: q.a <= 10 ? { kind: 'array', rows: q.a, cols: q.b } : null }],
    missing: (q) => { const known = q.hidden === 'a' ? q.b : q.a; return [{ text: `What number times ${known} makes ${q.product}?` },
      q.answer > 1 ? { text: `Count by ${known}s and keep going until you reach ${q.product}. Count how many jumps it takes. Here is how it starts.`, visual: { kind: 'jumps', jumps: Math.min(2, q.answer - 1), size: known, labels: false } }
        : { text: `${known} is already ${q.product}. How many ${known}s is that?` }]; },
    groups: (q, h) => [{ text: 'How many groups are there? How many are in each group?' }, { text: h.text }],
    array: (q, h) => [{ text: 'How many rows are there? How many dots are in each row?' }, { text: h.text }],
    repeated: (q, h) => [{ text: `Count how many ${q.b}s are added.` }, { text: h.text, visual: { kind: 'groups', groups: q.a, size: q.b } }],
    word: (q) => [{ text: 'Find the equal groups in the story: how many groups, and how many in each group?' },
      q.a <= 10 ? { text: 'Look at this picture: each circle is one group. How many groups? How many in each? Then find the total.', visual: { kind: 'groups', groups: q.a, size: q.b } }
        : { text: 'Draw the groups on paper: how many groups, and how many in each? Then find the total.' }]
  };

  /** Is the given answer right? Numbers: whole numbers only (spaces and leading zeros ignored). Choices: exact option. */
  function check(q, given) {
    if (given === null || given === undefined) return false;
    if (q.format === 'choice') return given === q.answer;
    const s = String(given).trim();
    return /^\d+$/.test(s) && Number(s) === q.answer;
  }

  /** Every fact a session may use: the chosen tables × 1…maxFactor (maxFactor 10 = core facts within 100). */
  function factPool(families, extension) {
    const fams = M.cleanFamilies(families).filter((f) => extension || f <= M.CORE_MAX);
    return M.factsFor(fams.length ? fams : M.FAMILIES.filter((f) => f <= M.CORE_MAX), extension ? 12 : M.CORE_MAX);
  }

  /** A mixed session: count questions spread across `types` as evenly as possible, never the same type twice in a row
      (when more than one type is available), and no identical question twice unless the pool runs out.
      pairs: specific [{ type, fam, other }] to revisit (Practice my misses); otherwise facts × types. */
  function makeSet({ types = TYPES.map((t) => t.id), families, extension = false, count = 10, pairs = null, rng = Math.random } = {}) {
    const maxFactor = extension ? 12 : M.CORE_MAX;
    const out = [], used = new Set();
    if (pairs && pairs.length) {
      let bag = [];
      for (let i = 0; out.length < count && i < count * 20; i++) {
        if (!bag.length) bag = M.shuffle(pairs.slice(), rng);
        const pr = bag.shift();
        const alt = [pr.type, ...M.shuffle(types.filter((t) => t !== pr.type), rng)];
        let q = null;
        for (const t of alt) { const c = generate(t, pr.fam, pr.other, { rng, maxFactor }); if (c && !used.has(c.key)) { q = c; break; } }
        if (!q) q = generate(pr.type, pr.fam, pr.other, { rng, maxFactor }) || generate('fact', pr.fam, pr.other, { rng, maxFactor });
        if (out.length && out[out.length - 1].key === q.key && pairs.length > 1) continue;
        used.add(q.key); out.push(q);
      }
      return out;
    }
    const facts = factPool(families, extension);
    let typeBag = [], factBag = [];
    let guard = 0;
    while (out.length < count && guard++ < count * 60) {
      if (!typeBag.length) typeBag = M.shuffle(types.slice(), rng);
      const prevType = out.length ? out[out.length - 1].typeId : null;
      let ti = typeBag.findIndex((t) => t !== prevType || types.length === 1);
      if (ti < 0) ti = 0;
      const type = typeBag.splice(ti, 1)[0];
      let q = null;
      for (let tries = 0; tries < facts.length * 2 && !q; tries++) {
        if (!factBag.length) factBag = M.shuffle(facts.slice(), rng);
        const f = factBag.shift();
        const c = generate(type, f.fam, f.other, { rng, maxFactor });
        if (c && !used.has(c.key)) q = c;
      }
      if (!q) {   // this type has no fresh questions left: allow a repeat rather than a short session
        for (let tries = 0; tries < 50 && !q; tries++) { const f = facts[Math.floor(rng() * facts.length)]; q = generate(type, f.fam, f.other, { rng, maxFactor }); }
        if (!q) continue;
      }
      used.add(q.key); out.push(q);
    }
    return out;
  }

  /** Which types a child has had a chance to learn: the starter types, any type whose Teach lesson is complete, and any
      type answered correctly (first try) at least 3 times in Practice. Challenge kinds (difficulty 3) need their lesson. */
  function unlockedTypes(completedLessons = [], practiceCorrect = {}) {
    const done = new Set(completedLessons);
    return TYPES.filter((t) => STARTER_TYPES.includes(t.id) || done.has(t.lesson) || (t.difficulty < 3 && (practiceCorrect[t.id] || 0) >= 3)).map((t) => t.id);
  }

  /** Constructive status for a question type from all its attempts (never "weak"/"poor"; never from one short session). */
  function skillStatus({ correct = 0, total = 0, sessions = 0 } = {}) {
    if (!total) return { id: 'new', label: 'Not tried yet' };
    if (total < 5) return { id: 'starting', label: 'Just starting' };
    const pct = correct / total;
    if (pct >= 0.9 && total >= 10 && sessions >= 2) return { id: 'strong', label: 'Strong' };
    if (pct >= 0.7) return { id: 'stronger', label: 'Getting stronger' };
    return { id: 'growing', label: 'Growing — keep practicing' };
  }

  /** Score a Lab session: answers [{ q, given, correct }]; unanswered = given null. */
  function scoreSession(answers) {
    const byType = {};
    let correct = 0, incorrect = 0, unanswered = 0;
    for (const a of answers) {
      const t = (byType[a.q.typeId] ||= { correct: 0, total: 0 });
      t.total++;
      if (a.given === null || a.given === undefined || a.given === '') unanswered++;
      else if (check(a.q, a.given)) { correct++; t.correct++; }
      else incorrect++;
    }
    const total = answers.length;
    return { total, correct, incorrect, unanswered, percent: total ? Math.round((correct / total) * 100) : 0, byType,
      missed: answers.filter((a) => !check(a.q, a.given)) };
  }

  /** Kinds of problems Practice uses: every core kind (difficulty 1–2), plus a challenge kind once its lesson is done. */
  function practiceTypes(completedLessons = []) {
    const done = new Set(completedLessons);
    return TYPES.filter((t) => t.difficulty < 3 || done.has(t.lesson)).map((t) => t.id);
  }

  const api = { practiceTypes, TYPES, TYPE, STARTER_TYPES, ANSWER_FORMATS, generate, check, factPool, makeSet, unlockedTypes, skillStatus, scoreSession };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GalaxyBank = api;
})(this);
