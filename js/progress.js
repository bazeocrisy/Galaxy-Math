/* Galaxy Math local progress (multiplication). Saved in localStorage under one versioned key; if storage is
   blocked or broken, everything keeps working in memory for the visit and `persistent` is false.
   No names, accounts or network: only lesson/practice/lab/test numbers and missed questions. window.GalaxyProgress / Node.
   v2 adds results by question type, Math Thinking Lab sessions and recently missed questions; v1 data is upgraded. */
(function (root) {
  'use strict';

  const KEY = 'galaxy-math.progress';
  const VERSION = 2;
  const MAX_TESTS = 60, MAX_LAB = 60, MAX_MISSED_QS = 40;
  const node = typeof module === 'object' && module.exports;
  const M = node ? require('./mult-math.js') : root.GalaxyMult;
  const B = node ? require('./mult-bank.js') : root.GalaxyBank;

  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const num = (v) => (Number.isFinite(v) && v >= 0 ? v : 0);
  const pair = () => ({ correct: 0, total: 0 });
  function blank() {
    return { v: VERSION, mult: { lessons: {}, practice: { sessions: 0, questions: 0, firstTry: 0, hints: 0, byFamily: {} },
      tests: [], facts: {}, misses: {}, flash: { sessions: 0, seconds: 0, cards: 0 },
      types: {}, lab: [], missedQs: [] } };
  }
  function cleanCounts(obj) {
    const out = {};
    if (isObj(obj)) for (const [k, v] of Object.entries(obj)) if (isObj(v)) out[k] = { correct: num(v.correct), total: num(v.total) };
    return out;
  }
  const validFact = (fam, other) => Number.isInteger(fam) && Number.isInteger(other) && fam >= 1 && fam <= 12 && other >= 1 && other <= 12;

  /** Accept only data we understand (v1 or v2); anything else is replaced by safe defaults. */
  function normalize(raw) {
    const d = blank();
    if (!isObj(raw) || (raw.v !== 1 && raw.v !== VERSION) || !isObj(raw.mult)) return d;
    const m = raw.mult, out = d.mult;
    if (isObj(m.lessons)) for (const [id, l] of Object.entries(m.lessons)) if (isObj(l)) out.lessons[id] = { completed: l.completed === true, best: num(l.best), attempts: num(l.attempts), completedAt: typeof l.completedAt === 'string' ? l.completedAt : null };
    if (isObj(m.practice)) { for (const k of ['sessions', 'questions', 'firstTry', 'hints']) out.practice[k] = num(m.practice[k]); out.practice.byFamily = cleanCounts(m.practice.byFamily); }
    if (Array.isArray(m.tests)) out.tests = m.tests.filter(isObj).slice(-MAX_TESTS).map((t) => ({
      at: typeof t.at === 'string' ? t.at : '', kind: t.kind === 'retry' ? 'retry' : 'test', total: num(t.total), correct: num(t.correct),
      incorrect: num(t.incorrect), unanswered: num(t.unanswered), percent: num(t.percent), timed: num(t.timed),
      families: Array.isArray(t.families) ? t.families.filter((f) => Number.isInteger(f) && f >= 1 && f <= 12) : [],
      byFamily: Object.fromEntries(Object.entries(isObj(t.byFamily) ? t.byFamily : {}).filter(([, v]) => isObj(v)).map(([k, v]) => [k, { correct: num(v.correct), total: num(v.total), ms: num(v.ms), timedCorrect: num(v.timedCorrect) }])),
      avgCorrectMs: Number.isFinite(t.avgCorrectMs) ? t.avgCorrectMs : null }));
    out.facts = Object.fromEntries(Object.entries(cleanCounts(m.facts)).filter(([k]) => M.parseFactKey(k)));   // unknown keys would break summary()
    if (isObj(m.misses)) for (const [k, v] of Object.entries(m.misses)) if (M.parseFactKey(k) && num(v) > 0) out.misses[k] = num(v);
    if (isObj(m.flash)) for (const k of ['sessions', 'seconds', 'cards']) out.flash[k] = num(m.flash[k]);
    // v2 fields (absent in v1 data, which simply starts them empty)
    if (isObj(m.types)) for (const [id, t] of Object.entries(m.types)) if (B.TYPE[id] && isObj(t)) {
      out.types[id] = { practice: { correct: num(t.practice && t.practice.correct), total: num(t.practice && t.practice.total) },
        lab: { correct: num(t.lab && t.lab.correct), total: num(t.lab && t.lab.total) }, sessions: num(t.sessions) };
    }
    if (Array.isArray(m.lab)) out.lab = m.lab.filter(isObj).slice(-MAX_LAB).map((s) => ({ at: typeof s.at === 'string' ? s.at : '', total: num(s.total), correct: num(s.correct),
      incorrect: num(s.incorrect), unanswered: num(s.unanswered), percent: num(s.percent),
      byType: Object.fromEntries(Object.entries(isObj(s.byType) ? s.byType : {}).filter(([k, v]) => B.TYPE[k] && isObj(v)).map(([k, v]) => [k, { correct: num(v.correct), total: num(v.total) }])) }));
    if (Array.isArray(m.missedQs)) out.missedQs = m.missedQs.filter((q) => isObj(q) && B.TYPE[q.type] && validFact(q.fam, q.other)).slice(0, MAX_MISSED_QS).map((q) => ({ type: q.type, fam: q.fam, other: q.other }));
    return d;
  }

  function createStore(storage) {
    let persistent = !!storage;
    let data = blank();
    try { const s = storage && storage.getItem(KEY); data = normalize(s ? JSON.parse(s) : null); } catch (e) { persistent = false; data = blank(); }
    function save() {
      if (!persistent) return false;
      try { storage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { persistent = false; return false; }
    }
    const mult = () => data.mult;
    function countFact(fam, other, ok) {
      const k = M.factKey(fam, other), f = (mult().facts[k] ||= pair());
      f.total++; if (ok) f.correct++;
      if (ok) delete mult().misses[k]; else mult().misses[k] = (mult().misses[k] || 0) + 1;
    }
    const typeRec = (id) => (mult().types[id] ||= { practice: pair(), lab: pair(), sessions: 0 });
    /** Remember a missed question (type + fact) until it is answered right; newest first, at most 40. */
    function noteQuestion(q, ok) {
      if (!q.typeId) return;
      const same = (x) => x.type === q.typeId && x.fam === q.fam && x.other === q.other;
      mult().missedQs = mult().missedQs.filter((x) => !same(x));
      if (!ok) mult().missedQs.unshift({ type: q.typeId, fam: q.fam, other: q.other });
      mult().missedQs = mult().missedQs.slice(0, MAX_MISSED_QS);
    }
    const countSessions = (types) => { for (const id of new Set(types)) if (B.TYPE[id]) typeRec(id).sessions++; };

    return {
      get persistent() { return persistent; },
      data: () => data,
      /** A lesson is completed only by passing its independent check — never by opening it. */
      recordLesson(id, score, passed) {
        const l = (mult().lessons[id] ||= { completed: false, best: 0, attempts: 0, completedAt: null });
        l.attempts++; l.best = Math.max(l.best, score);
        if (passed && !l.completed) { l.completed = true; l.completedAt = new Date().toISOString(); }
        save();
      },
      /** One Practice question, judged on the first try (hints allowed). */
      recordPracticeAnswer(q, firstTryCorrect, usedHint) {
        const p = mult().practice, f = (p.byFamily[q.fam] ||= pair());
        p.questions++; f.total++;
        if (firstTryCorrect) { p.firstTry++; f.correct++; }
        if (usedHint) p.hints++;
        countFact(q.fam, q.other, firstTryCorrect);
        if (q.typeId) { const t = typeRec(q.typeId).practice; t.total++; if (firstTryCorrect) t.correct++; }
        noteQuestion(q, firstTryCorrect);
        save();
      },
      recordPracticeSession(types = []) { mult().practice.sessions++; countSessions(types); save(); },
      /** A finished Math Thinking Lab challenge. answers: [{ q, given }]; score from GalaxyBank.scoreSession. */
      recordLab(score, answers) {
        for (const a of answers) {
          const ok = B.check(a.q, a.given);
          const t = typeRec(a.q.typeId).lab; t.total++; if (ok) t.correct++;
          countFact(a.q.fam, a.q.other, ok);
          noteQuestion(a.q, ok);
        }
        countSessions(answers.map((a) => a.q.typeId));
        mult().lab.push({ at: new Date().toISOString(), total: score.total, correct: score.correct, incorrect: score.incorrect,
          unanswered: score.unanswered, percent: score.percent, byType: score.byType });
        mult().lab = mult().lab.slice(-MAX_LAB);
        save();
      },
      /** score: result of GalaxyMult.scoreTest. kind 'retry' (missed facts only) is kept but never counts toward mastery. */
      recordTest(score, { kind = 'test', timed = 0, families = [], responses = [] } = {}) {
        for (const r of responses) countFact(r.q.fam, r.q.other, M.isCorrect(r.q, r.given));
        mult().tests.push({ at: new Date().toISOString(), kind, timed, families, total: score.total, correct: score.correct, incorrect: score.incorrect,
          unanswered: score.unanswered, percent: score.percent, byFamily: score.byFamily, avgCorrectMs: score.avgCorrectMs });
        mult().tests = mult().tests.slice(-MAX_TESTS);
        save();
      },
      recordFlash(seconds, cards) { const f = mult().flash; f.sessions++; f.seconds += Math.round(num(seconds)); f.cards += num(cards); save(); },
      /** Facts still waiting to be answered correctly, most-missed first. */
      missedFacts() {
        return Object.entries(mult().misses).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ ...M.parseFactKey(k), misses: n }));
      },
      /** Questions (type + fact) missed in Practice or the Lab and not yet answered right, newest first. */
      missedQuestions() { return mult().missedQs.slice(); },
      /** Practice attempts per question type (used to decide which types the Lab may include). */
      practiceAttempts() { return Object.fromEntries(Object.entries(mult().types).map(([id, t]) => [id, t.practice.total])); },
      completedLessons() { return Object.entries(mult().lessons).filter(([, l]) => l.completed).map(([id]) => id); },
      summary({ lessonsTotal = 13 } = {}) {
        const m = mult();
        const tests = m.tests.filter((t) => t.kind === 'test');
        const families = M.FAMILIES.map((fam) => {
          let correct = 0, total = 0;
          for (const [k, v] of Object.entries(m.facts)) if (M.parseFactKey(k).fam === fam) { correct += v.correct; total += v.total; }
          let ms = 0, timedCorrect = 0;
          for (const t of tests) if (t.timed && t.byFamily[fam]) { ms += t.byFamily[fam].ms || 0; timedCorrect += t.byFamily[fam].timedCorrect || 0; }
          return { fam, extension: fam > M.CORE_MAX, correct, total, accuracy: total ? Math.round((correct / total) * 100) : null,
            ...M.masteryFor(tests, fam), avgSeconds: timedCorrect ? Math.round(ms / timedCorrect / 100) / 10 : null };
        });
        const types = B.TYPES.map((t) => {
          const r = m.types[t.id] || { practice: pair(), lab: pair(), sessions: 0 };
          const correct = r.practice.correct + r.lab.correct, total = r.practice.total + r.lab.total;
          return { id: t.id, letter: t.letter, name: t.name, lesson: t.lesson, practice: r.practice, lab: r.lab, sessions: r.sessions,
            correct, total, accuracy: total ? Math.round((correct / total) * 100) : null, status: B.skillStatus({ correct, total, sessions: r.sessions }) };
        });
        const lessonsDone = Object.values(m.lessons).filter((l) => l.completed).length;
        const coreMastered = families.filter((f) => !f.extension && f.mastered).length;
        const milestones = [];
        if (lessonsDone >= 1) milestones.push('Finished a first Teach lesson');
        if (lessonsDone >= lessonsTotal) milestones.push('Finished every Teach lesson');
        if (m.lab.length >= 1) milestones.push('Completed a first Math Thinking Lab challenge');
        if (m.lab.some((s) => s.total >= 50)) milestones.push('Finished a 50-problem Big Challenge');
        for (const t of types) if (t.status.id === 'strong') milestones.push(`Strong at ${t.name}`);
        for (const f of families) if (f.mastered) milestones.push(`Mastered the ${f.fam}s${f.extension ? ' (extension)' : ''}`);
        if (coreMastered === 10) milestones.push('Mastered all core tables 1–10');
        return { lessonsDone, lessonsTotal, lessons: m.lessons, practice: m.practice, tests: m.tests, testsTaken: tests.length, families, coreMastered, types,
          lab: m.lab, labSessions: m.lab.length, misses: this.missedFacts(), missedQuestions: m.missedQs.slice(), flash: m.flash, milestones };
      },
      reset() { data = blank(); save(); }
    };
  }

  function browserStorage() { try { return root.localStorage || null; } catch (e) { return null; } }

  const api = { KEY, VERSION, createStore, normalize, browserStorage };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GalaxyProgress = api;
})(this);
