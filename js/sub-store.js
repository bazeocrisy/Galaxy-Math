/* Galaxy Math subtraction progress: its own versioned localStorage key ("galaxy-math.subtraction", v: 2), separate
   from multiplication and division ("galaxy-math.progress"), which it never reads or writes.
   Every part of the record is cleaned on its own when read: a bad entry is dropped by itself and never takes good
   entries with it. Problems are not stored, only seeds and indexes (rebuilt with SubtractKit.math / the Mathbook
   content), plus SubtractKit work states, which are checked with SubtractKit.validState by the adapter.
   Help is kept apart from independent work: a practice problem's outcome is one of
   independent · hinted · shown · incorrect · skipped, and it is recorded once (later events cannot change it).
   v2 adds the Math Thinking Lab (its own sessions, results by kind), Flashcards (exposure and self-reported confidence
   only, never mastery) and Subtraction's Parent Settings. v1 records are upgraded with nothing lost.
   window.GalaxySubStore / Node. */
(function (root) {
  'use strict';
  const KEY = 'galaxy-math.subtraction';
  const VERSION = 2;
  const READS = [1, 2];   // versions we can read (v1 is upgraded on read)
  const OUTCOMES = ['independent', 'hinted', 'shown', 'incorrect', 'skipped'];
  const SIZES = [2, 3, 4, 'mixed'], DIFFS = ['easy', 'medium', 'hard', 'mixed'], LENGTHS = [10, 25, 50];
  const MAX_SESSIONS = 30, MAX_TESTS = 20, MAX_LAB = 30, MAX_FLASH = 30;
  const LAB_COUNTS = [10, 25, 50];
  const FLASH_SIZES = [2, 3, 4, 'mixed'];
  /** Parent Settings for Subtraction (kept here, not in galaxy-math.settings, so other subjects are never touched). */
  const DEFAULT_SETTINGS = {
    flash: { reveal: 'auto', cards: 10, mix: 'standard', size: 'mixed' },   // reveal 'auto' = by size (sub-galaxy.js FLASH_AUTO); cards never move on by themselves
    lab: { level: 'auto' }                                                         // 'auto' = grows with the child, or 1–3
  };
  const pickOne = (v, allowed, d) => (allowed.includes(v) ? v : d);

  const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
  const isInt = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
  const isSeed = (x) => isInt(x, 0, 4294967295);
  const isDate = (x) => typeof x === 'string' && x.length <= 40 && !Number.isNaN(Date.parse(x));
  const counts = () => Object.fromEntries(OUTCOMES.map((o) => [o, 0]));

  function blank() {
    return { v: VERSION, lessons: {}, lessonWork: {}, practice: { sessions: [], active: null }, tests: [], testDraft: null,
      lab: { sessions: [], byType: {}, active: null }, flash: { sessions: [] }, settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) };
  }

  // ---------- cleaning: each function returns a clean copy or null ----------
  function cleanCounts(c, max) {
    if (!isObj(c)) return null;
    const out = counts();
    for (const o of OUTCOMES) { if (!isInt(c[o], 0, max)) return null; out[o] = c[o]; }
    return out;
  }
  function cleanLesson(x) {
    if (!isObj(x) || x.done !== true || typeof x.indep !== 'boolean' || typeof x.helped !== 'boolean' || !isDate(x.at)) return null;
    return { done: true, indep: x.indep, helped: x.helped, at: x.at };
  }
  function cleanResult(x) {
    if (!isObj(x) || !OUTCOMES.includes(x.outcome) || !isInt(x.tries, 0, 9999) || !isInt(x.hints, 0, 9999)) return null;
    return { outcome: x.outcome, tries: x.tries, hints: x.hints, helped: x.helped === true, firstTry: x.firstTry === true && x.outcome === 'independent' };
  }
  const validSetup = (x, M) => isObj(x) && SIZES.includes(x.size) && DIFFS.includes(x.difficulty) && LENGTHS.includes(x.length) && !(M && M.unavailableReason(x.size, x.difficulty));
  function cleanActive(a, M) {
    if (!isObj(a) || !validSetup(a, M) || !isSeed(a.seed) || !isInt(a.i, 0, a.length)) return null;
    const out = { seed: a.seed, size: a.size, difficulty: a.difficulty, length: a.length, i: a.i, results: {}, cur: null };
    if (isObj(a.results)) for (const [k, v] of Object.entries(a.results)) {
      const n = Number(k), r = cleanResult(v);
      if (/^\d+$/.test(k) && n < a.length && r) out.results[n] = r;   // a bad result is dropped on its own
    }
    if (isObj(a.cur) && isInt(a.cur.hints, 0, 9999) && isInt(a.cur.tries, 0, 9999) && isInt(a.cur.wrong, 0, 9999) && typeof a.cur.helped === 'boolean') {
      out.cur = { hints: a.cur.hints, tries: a.cur.tries, wrong: a.cur.wrong, helped: a.cur.helped, state: isObj(a.cur.state) ? a.cur.state : null };
    }
    return out;
  }
  function cleanSession(s, M) {
    if (!isObj(s) || !isDate(s.at) || !validSetup(s, M) || !isInt(s.total, 1, 50)) return null;
    const c = cleanCounts(s.counts, 50);
    if (!c || OUTCOMES.reduce((t, o) => t + c[o], 0) !== s.total) return null;
    return { at: s.at, size: s.size, difficulty: s.difficulty, length: s.length, total: s.total, counts: c, firstTry: isInt(s.firstTry, 0, c.independent) ? s.firstTry : 0 };
  }
  // ----- Lab -----
  function cleanLabAnswer(a, types) {
    if (!isObj(a) || !types.includes(a.typeId) || typeof a.correct !== 'boolean' || typeof a.skipped !== 'boolean' || (a.correct && a.skipped)) return null;
    return { typeId: a.typeId, correct: a.correct, skipped: a.skipped };
  }
  function cleanLabActive(a, types) {
    if (!isObj(a) || !isSeed(a.seed) || !LAB_COUNTS.concat([1, 2, 3, 4, 5, 6, 7, 8, 9]).includes(a.count) || !isInt(a.level, 1, 3) || !['challenge', 'misses'].includes(a.kind)) return null;
    const out = { seed: a.seed, count: a.count, level: a.level, kind: a.kind, types: Array.isArray(a.types) ? a.types.filter((x) => types.includes(x)).slice(0, 12) : null, answers: {} };
    if (out.kind === 'misses' && !(out.types && out.types.length)) return null;
    if (isObj(a.answers)) for (const [k, v] of Object.entries(a.answers)) { const n = Number(k), c = cleanLabAnswer(v, types); if (/^\d+$/.test(k) && n < a.count && c) out.answers[n] = c; }
    return out;
  }
  function cleanLabSession(s, types) {
    if (!isObj(s) || !isDate(s.at) || !isInt(s.total, 1, 50) || !isInt(s.correct, 0, 50) || !isInt(s.incorrect, 0, 50) || !isInt(s.skipped, 0, 50)) return null;
    if (s.correct + s.incorrect + s.skipped !== s.total || !['challenge', 'misses'].includes(s.kind) || !isInt(s.level, 1, 3)) return null;
    return { at: s.at, kind: s.kind, level: s.level, total: s.total, correct: s.correct, incorrect: s.incorrect, skipped: s.skipped, pct: Math.round((100 * s.correct) / s.total),
      missedTypes: Array.isArray(s.missedTypes) ? [...new Set(s.missedTypes.filter((x) => types.includes(x)))] : [] };
  }
  function cleanByType(x, types) {
    const out = {};
    if (isObj(x)) for (const [k, v] of Object.entries(x)) if (types.includes(k) && isObj(v) && isInt(v.c, 0, 1e6) && isInt(v.t, 1, 1e6) && v.c <= v.t) out[k] = { c: v.c, t: v.t };
    return out;
  }
  // ----- Flashcards: exposure and the child's own "I knew it / not yet", never mastery -----
  function cleanFlashSession(s) {
    if (!isObj(s) || !isDate(s.at) || !FLASH_SIZES.includes(s.size) || !isInt(s.cards, 0, 1000) || !isInt(s.seconds, 0, 86400) || !isInt(s.knew, 0, 1000) || !isInt(s.notYet, 0, 1000) || !isInt(s.shown, 0, 1000)) return null;
    if (s.knew + s.notYet > s.cards) return null;
    return { at: s.at, size: s.size, cards: s.cards, seconds: s.seconds, knew: s.knew, notYet: s.notYet, shown: s.shown };
  }
  function cleanSettings(x) {
    const d = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    if (!isObj(x)) return d;
    const fl = isObj(x.flash) ? x.flash : {}, lb = isObj(x.lab) ? x.lab : {};
    d.flash = { reveal: pickOne(fl.reveal, ['auto', 0, 5, 10, 15, 20, 30], 'auto'), cards: pickOne(fl.cards, [10, 20, 30], 10),
      mix: pickOne(fl.mix, ['gentle', 'standard', 'challenge'], 'standard'), size: pickOne(fl.size, FLASH_SIZES, 'mixed') };
    d.lab = { level: pickOne(lb.level, ['auto', 1, 2, 3], 'auto') };
    return d;
  }
  const cleanTally = (x) => {
    if (!isObj(x)) return {};
    const out = {};
    for (const [k, v] of Object.entries(x)) if (/^[a-z0-9]{1,20}$/i.test(k) && isObj(v) && isInt(v.c, 0, 50) && isInt(v.t, 1, 50) && v.c <= v.t) out[k] = { c: v.c, t: v.t };
    return out;
  };
  function cleanTest(t) {
    if (!isObj(t) || !isDate(t.at) || !isSeed(t.seed) || !isInt(t.total, 1, 50)) return null;
    if (!isInt(t.correct, 0, t.total) || !isInt(t.incorrect, 0, t.total) || !isInt(t.unanswered, 0, t.total)) return null;
    if (t.correct + t.incorrect + t.unanswered !== t.total) return null;
    return { at: t.at, seed: t.seed, total: t.total, correct: t.correct, incorrect: t.incorrect, unanswered: t.unanswered,
      pct: Math.round((100 * t.correct) / t.total), byCat: cleanTally(t.byCat), byDiff: cleanTally(t.byDiff), missedSkills: Array.isArray(t.missedSkills) ? t.missedSkills.filter((s) => typeof s === 'string' && /^[a-z0-9]{1,20}$/.test(s)).slice(0, 20) : [] };
  }
  function cleanDraft(d) {
    if (!isObj(d) || !isSeed(d.seed) || !isInt(d.i, 0, 49) || !isObj(d.resp)) return null;
    const resp = {};
    for (const [k, v] of Object.entries(d.resp)) if (/^t\d{1,2}$/.test(k) && isObj(v)) resp[k] = v;   // checked against the items by the adapter
    return { seed: d.seed, i: d.i, resp };
  }
  function cleanWork(w) {
    if (!isObj(w) || !isSeed(w.seed)) return null;
    return { seed: w.seed, state: isObj(w.state) ? w.state : null, resp: isObj(w.resp) ? w.resp : null, hinted: w.hinted === true };
  }

  /** Accept what we understand; anything else is left out (per entry), never the whole record. */
  function normalize(raw, lessonIds, M, labTypes = []) {
    const d = blank();
    if (!isObj(raw) || !READS.includes(raw.v)) return d;   // v1 is read and upgraded: everything it has is kept
    if (isObj(raw.lessons)) for (const [id, x] of Object.entries(raw.lessons)) { const c = lessonIds.includes(id) && cleanLesson(x); if (c) d.lessons[id] = c; }
    if (isObj(raw.lessonWork)) for (const [id, x] of Object.entries(raw.lessonWork)) { const c = lessonIds.includes(id) && cleanWork(x); if (c) d.lessonWork[id] = c; }
    if (isObj(raw.practice)) {
      if (Array.isArray(raw.practice.sessions)) d.practice.sessions = raw.practice.sessions.map((s) => cleanSession(s, M)).filter(Boolean).slice(-MAX_SESSIONS);
      d.practice.active = cleanActive(raw.practice.active, M);
    }
    if (Array.isArray(raw.tests)) {
      const seen = new Set();
      d.tests = raw.tests.map(cleanTest).filter((t) => t && !seen.has(t.seed) && seen.add(t.seed)).slice(-MAX_TESTS);
    }
    d.testDraft = cleanDraft(raw.testDraft);
    if (isObj(raw.lab)) {
      if (Array.isArray(raw.lab.sessions)) d.lab.sessions = raw.lab.sessions.map((s) => cleanLabSession(s, labTypes)).filter(Boolean).slice(-MAX_LAB);
      d.lab.byType = cleanByType(raw.lab.byType, labTypes);
      d.lab.active = cleanLabActive(raw.lab.active, labTypes);
    }
    if (isObj(raw.flash) && Array.isArray(raw.flash.sessions)) d.flash.sessions = raw.flash.sessions.map(cleanFlashSession).filter(Boolean).slice(-MAX_FLASH);
    d.settings = cleanSettings(raw.settings);
    return d;
  }

  /** Practice outcome from what happened on one problem. Help is never counted as independent. */
  function outcomeOf({ correct, helped, hints, wrong }) {
    if (helped && correct) return 'shown';   // Show me played to the end (or the full solution, then right)
    if (helped) return wrong > 0 ? 'incorrect' : 'skipped';   // help opened but the problem was not finished: never independent (SI-07)
    if (correct) return hints > 0 ? 'hinted' : 'independent';
    return wrong > 0 ? 'incorrect' : 'skipped';
  }

  /** storage: a localStorage-like object (or null). opts: { lessonIds, math } (math = SubtractKit.math, for setups). */
  function createSubStore(storage, opts = {}) {
    const lessonIds = opts.lessonIds || [], M = opts.math || null, labTypes = opts.labTypes || [];
    let persistent = !!storage, data, raw = null;
    try { raw = storage ? storage.getItem(KEY) : null; } catch (e) { raw = null; persistent = false; }
    let parsed = null, readable = true;
    try { parsed = raw ? JSON.parse(raw) : null; } catch (e) { readable = false; }
    if (parsed !== null && !(isObj(parsed) && READS.includes(parsed.v))) readable = false;
    data = readable ? normalize(parsed, lessonIds, M, labTypes) : blank();
    // A record we cannot read (bad JSON or another version) is kept as a backup before the next save replaces it (SI-09).
    if (raw && !readable) { try { storage.setItem(KEY + '.unreadable', raw); } catch (e) { /* no room: nothing else to do */ } }
    function save() {
      if (!storage) return;
      try { storage.setItem(KEY, JSON.stringify(data)); } catch (e) { persistent = false; }
    }
    const copy = (x) => JSON.parse(JSON.stringify(x));
    const api = {
      KEY,
      get persistent() { return persistent; },
      data: () => copy(data),

      // ----- Teach -----
      lesson: (id) => (data.lessons[id] ? copy(data.lessons[id]) : null),
      /** A lesson is done once its Your Turn is finished. indep stays true once it has been done without help. */
      completeLesson(id, helped) {
        if (!lessonIds.includes(id)) return;
        const was = data.lessons[id];
        data.lessons[id] = { done: true, indep: !!(was && was.indep) || !helped, helped: !!helped, at: new Date().toISOString() };
        save();
      },
      lessonWork: (id) => (data.lessonWork[id] ? copy(data.lessonWork[id]) : null),
      setLessonWork(id, w) { if (!lessonIds.includes(id)) return; const c = cleanWork(w); if (c) data.lessonWork[id] = c; else delete data.lessonWork[id]; save(); },
      lessonsSummary() {
        const done = lessonIds.filter((id) => data.lessons[id]);
        return { total: lessonIds.length, done: done.length, indep: done.filter((id) => data.lessons[id].indep).length };
      },

      // ----- Practice -----
      activePractice: () => (data.practice.active ? copy(data.practice.active) : null),
      startPractice(setup, seed) {
        if (!validSetup(setup, M) || !isSeed(seed)) throw new Error('invalid practice setup');
        data.practice.active = { seed, size: setup.size, difficulty: setup.difficulty, length: setup.length, i: 0, results: {}, cur: null };
        save();
        return copy(data.practice.active);
      },
      /** Track the problem on screen (hints, checks, help, work) so a refresh keeps it. */
      updateCurrent(cur) {
        const a = data.practice.active;
        if (!a || a.results[a.i]) return;
        a.cur = { hints: cur.hints, tries: cur.tries, wrong: cur.wrong, helped: !!cur.helped, state: cur.state || null };
        save();
      },
      /** Record the problem's outcome once. Returns false if it was already recorded (no duplicate events). */
      recordProblem(index, r) {
        const a = data.practice.active;
        if (!a || index !== a.i || a.results[index]) return false;
        const outcome = outcomeOf(r);
        a.results[index] = { outcome, tries: r.tries || 0, hints: r.hints || 0, helped: !!r.helped, firstTry: outcome === 'independent' && !(r.wrong > 0) };   // help opened stays visible even on a skip (SI-12)
        a.cur = null;
        save();
        return outcome;
      },
      /** Move to the next problem (after its outcome is recorded). Returns the finished session when the last one is done. */
      nextProblem() {
        const a = data.practice.active;
        if (!a || !a.results[a.i]) return null;
        a.i += 1; a.cur = null;
        if (a.i < a.length) { save(); return null; }
        const c = counts();
        for (let k = 0; k < a.length; k++) c[a.results[k] ? a.results[k].outcome : 'skipped'] += 1;   // a result lost to damaged data counts as skipped (SI-03)
        const firstTry = Object.values(a.results).filter((x) => x.firstTry).length;
        const session = { at: new Date().toISOString(), size: a.size, difficulty: a.difficulty, length: a.length, total: a.length, counts: c, firstTry, results: copy(a.results), seed: a.seed };
        data.practice.sessions = data.practice.sessions.concat([{ at: session.at, size: a.size, difficulty: a.difficulty, length: a.length, total: a.length, counts: c, firstTry }]).slice(-MAX_SESSIONS);
        data.practice.active = null;   // the session and the end of the active run are saved together, once
        save();
        return session;
      },
      quitPractice() { data.practice.active = null; save(); },
      practiceTotals() {
        const c = counts();
        data.practice.sessions.forEach((s) => OUTCOMES.forEach((o) => { c[o] += s.counts[o]; }));
        return c;
      },
      sessions: () => copy(data.practice.sessions),

      // ----- Test -----
      testDraft: () => (data.testDraft ? copy(data.testDraft) : null),
      startTest(seed) { if (!isSeed(seed)) throw new Error('invalid seed'); data.testDraft = { seed, i: 0, resp: {} }; save(); return copy(data.testDraft); },
      saveTestDraft(d) { const c = cleanDraft(d); if (c && data.testDraft && c.seed === data.testDraft.seed) { data.testDraft = c; save(); } },
      /** Record a finished test once per seed, and clear its draft in the same save. */
      recordTest(t) {
        const c = cleanTest(Object.assign({ at: new Date().toISOString() }, t));
        if (!c) throw new Error('invalid test result');
        if (data.tests.some((x) => x.seed === c.seed)) { if (data.testDraft && data.testDraft.seed === c.seed) { data.testDraft = null; save(); } return false; }
        data.tests = data.tests.concat([c]).slice(-MAX_TESTS);
        if (data.testDraft && data.testDraft.seed === c.seed) data.testDraft = null;
        save();
        return true;
      },
      tests: () => copy(data.tests),

      // ----- Math Thinking Lab (its own records; nothing here counts as Practice or Test) -----
      activeLab: () => (data.lab.active ? copy(data.lab.active) : null),
      startLab({ seed, count, level, kind = 'challenge', types = null }) {
        const a = cleanLabActive({ seed, count, level, kind, types, answers: {} }, labTypes);
        if (!a) throw new Error('invalid Lab session');
        data.lab.active = a; save(); return copy(a);
      },
      /** Record one Lab answer once (a second event for the same question is ignored). */
      recordLabAnswer(index, ans) {
        const a = data.lab.active, c = a && cleanLabAnswer(ans, labTypes);
        if (!a || !c || !isInt(index, 0, a.count - 1) || a.answers[index]) return false;
        a.answers[index] = c; save(); return true;
      },
      /** Finish the Lab session once: the summary is saved, by-kind totals grow, and the active run ends in the same save. */
      finishLab() {
        const a = data.lab.active;
        if (!a) return null;
        const answers = Object.keys(a.answers).map(Number).sort((x, y) => x - y).map((k) => a.answers[k]);
        if (!answers.length) { data.lab.active = null; save(); return null; }
        const correct = answers.filter((x) => x.correct).length, skipped = answers.filter((x) => x.skipped).length;
        const s = { at: new Date().toISOString(), kind: a.kind, level: a.level, total: answers.length, correct, incorrect: answers.length - correct - skipped, skipped,
          missedTypes: [...new Set(answers.filter((x) => !x.correct).map((x) => x.typeId))] };
        answers.forEach((x) => { const b = (data.lab.byType[x.typeId] = data.lab.byType[x.typeId] || { c: 0, t: 0 }); b.t += 1; if (x.correct) b.c += 1; });
        data.lab.sessions = data.lab.sessions.concat([cleanLabSession(s, labTypes)]).filter(Boolean).slice(-MAX_LAB);
        data.lab.active = null; save();
        return cleanLabSession(s, labTypes);
      },
      quitLab() { data.lab.active = null; save(); },
      labSessions: () => copy(data.lab.sessions),
      labByType: () => copy(data.lab.byType),

      // ----- Flashcards (exposure only) -----
      recordFlash(s) { const c = cleanFlashSession(Object.assign({ at: new Date().toISOString() }, s)); if (!c) return false; data.flash.sessions = data.flash.sessions.concat([c]).slice(-MAX_FLASH); save(); return true; },
      flashSessions: () => copy(data.flash.sessions),
      flashTotals() { const tot = { sessions: 0, cards: 0, seconds: 0, knew: 0, notYet: 0, shown: 0 }; data.flash.sessions.forEach((s) => { tot.sessions++; ['cards', 'seconds', 'knew', 'notYet', 'shown'].forEach((k) => { tot[k] += s[k]; }); }); return tot; },

      // ----- Parent Settings (Subtraction only) -----
      settings: () => copy(data.settings),
      setSettings(patch) { data.settings = cleanSettings({ flash: Object.assign({}, data.settings.flash, (patch && patch.flash) || {}), lab: Object.assign({}, data.settings.lab, (patch && patch.lab) || {}) }); save(); return copy(data.settings); },

      /** Erase subtraction progress only (multiplication and division live under another key and are untouched). Settings are kept. */
      reset() { const keepSettings = data.settings; data = blank(); data.settings = keepSettings; save(); if (storage) try { storage.removeItem(KEY + '.unreadable'); } catch (e) { /* ignore */ } }
    };
    return api;
  }

  const api = { KEY, VERSION, OUTCOMES, DEFAULT_SETTINGS, createSubStore, normalize, outcomeOf, blank, cleanSettings };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GalaxySubStore = api;
})(typeof window !== 'undefined' ? window : globalThis);
