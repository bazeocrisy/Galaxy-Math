/* Galaxy Math question-bank kit: the subject-neutral parts of a question bank (answer checking, mixed sessions,
   unlock rules, constructive skill statuses, session scoring). Multiplication (js/mult-bank.js) and Division
   (js/div-bank.js) each supply their own TYPES and generate(); everything here is shared. window.GalaxyBankKit / Node. */
(function (root) {
  'use strict';

  /** TYPES: [{ id, difficulty, lesson }]; generate(typeId, fam, other, { rng, maxFactor }) → question or null;
      M: the subject's fact engine (cleanFamilies, factsFor, shuffle, CORE_MAX, FAMILIES); fallbackType: always-valid type. */
  function createBankKit({ TYPES, STARTER_TYPES, generate, M, fallbackType }) {
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
          if (!q) q = generate(pr.type, pr.fam, pr.other, { rng, maxFactor }) || generate(fallbackType, pr.fam, pr.other, { rng, maxFactor });
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


    return { check, factPool, makeSet, unlockedTypes, skillStatus, scoreSession, practiceTypes };
  }

  const api = { createBankKit };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GalaxyBankKit = api;
})(this);
