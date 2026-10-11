/* Galaxy Math local progress (multiplication). Saved in localStorage under one versioned key; if storage is
   blocked or broken, everything keeps working in memory for the visit and `persistent` is false.
   No names, accounts or network: only lesson/practice/test numbers and missed facts. window.GalaxyProgress / Node. */
(function (root) {
  'use strict';

  const KEY = 'galaxy-math.progress';
  const VERSION = 1;
  const MAX_TESTS = 60;
  const M = (typeof module === 'object' && module.exports) ? require('./mult-math.js') : root.GalaxyMult;

  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  const num = (v) => (Number.isFinite(v) && v >= 0 ? v : 0);
  function blank() {
    return { v: VERSION, mult: { lessons: {}, practice: { sessions: 0, questions: 0, firstTry: 0, hints: 0, byFamily: {} },
      tests: [], facts: {}, misses: {}, flash: { sessions: 0, seconds: 0, cards: 0 } } };
  }
  function cleanCounts(obj) {
    const out = {};
    if (isObj(obj)) for (const [k, v] of Object.entries(obj)) if (isObj(v)) out[k] = { correct: num(v.correct), total: num(v.total) };
    return out;
  }
  /** Accept only data we understand; anything else is replaced by safe defaults. */
  function normalize(raw) {
    const d = blank();
    if (!isObj(raw) || raw.v !== VERSION || !isObj(raw.mult)) return d;
    const m = raw.mult, out = d.mult;
    if (isObj(m.lessons)) for (const [id, l] of Object.entries(m.lessons)) if (isObj(l)) out.lessons[id] = { completed: l.completed === true, best: num(l.best), attempts: num(l.attempts), completedAt: typeof l.completedAt === 'string' ? l.completedAt : null };
    if (isObj(m.practice)) { for (const k of ['sessions', 'questions', 'firstTry', 'hints']) out.practice[k] = num(m.practice[k]); out.practice.byFamily = cleanCounts(m.practice.byFamily); }
    if (Array.isArray(m.tests)) out.tests = m.tests.filter(isObj).slice(-MAX_TESTS).map((t) => ({
      at: typeof t.at === 'string' ? t.at : '', kind: t.kind === 'retry' ? 'retry' : 'test', total: num(t.total), correct: num(t.correct),
      incorrect: num(t.incorrect), unanswered: num(t.unanswered), percent: num(t.percent), timed: num(t.timed),
      families: Array.isArray(t.families) ? t.families.filter((f) => Number.isInteger(f) && f >= 1 && f <= 12) : [],
      byFamily: Object.fromEntries(Object.entries(isObj(t.byFamily) ? t.byFamily : {}).filter(([, v]) => isObj(v)).map(([k, v]) => [k, { correct: num(v.correct), total: num(v.total), ms: num(v.ms), timedCorrect: num(v.timedCorrect) }])),
      avgCorrectMs: Number.isFinite(t.avgCorrectMs) ? t.avgCorrectMs : null }));
    out.facts = cleanCounts(m.facts);
    if (isObj(m.misses)) for (const [k, v] of Object.entries(m.misses)) if (M.parseFactKey(k) && num(v) > 0) out.misses[k] = num(v);
    if (isObj(m.flash)) for (const k of ['sessions', 'seconds', 'cards']) out.flash[k] = num(m.flash[k]);
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
      const k = M.factKey(fam, other), f = (mult().facts[k] ||= { correct: 0, total: 0 });
      f.total++; if (ok) f.correct++;
      if (ok) delete mult().misses[k]; else mult().misses[k] = (mult().misses[k] || 0) + 1;
    }

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
      recordPracticeAnswer(q, firstTryCorrect, usedHint) {
        const p = mult().practice, f = (p.byFamily[q.fam] ||= { correct: 0, total: 0 });
        p.questions++; f.total++;
        if (firstTryCorrect) { p.firstTry++; f.correct++; }
        if (usedHint) p.hints++;
        countFact(q.fam, q.other, firstTryCorrect);
        save();
      },
      recordPracticeSession() { mult().practice.sessions++; save(); },
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
      summary() {
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
        const lessonsDone = Object.values(m.lessons).filter((l) => l.completed).length;
        const coreMastered = families.filter((f) => !f.extension && f.mastered).length;
        const milestones = [];
        if (lessonsDone >= 1) milestones.push('Finished a first Teach lesson');
        if (lessonsDone >= 10) milestones.push('Finished all 10 Teach lessons');
        for (const f of families) if (f.mastered) milestones.push(`Mastered the ${f.fam}s${f.extension ? ' (extension)' : ''}`);
        if (coreMastered === 10) milestones.push('Mastered all core tables 1–10');
        return { lessonsDone, lessons: m.lessons, practice: m.practice, tests: m.tests, testsTaken: tests.length, families, coreMastered,
          misses: this.missedFacts(), flash: m.flash, milestones };
      },
      reset() { data = blank(); save(); }
    };
  }

  function browserStorage() { try { return root.localStorage || null; } catch (e) { return null; } }

  const api = { KEY, VERSION, createStore, normalize, browserStorage };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GalaxyProgress = api;
})(this);
