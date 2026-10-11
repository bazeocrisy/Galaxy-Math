/* Galaxy Math division facts engine. A division fact is stored as (fam = divisor, other = quotient), so the
   dividend is always fam × other: every quotient is a whole number and the divisor is never 0.
   Core facts: divisor and quotient 1–10 (dividends within 100); 11 and 12 are extensions.
   Reuses the subject-neutral parts of the multiplication engine (families, quotas, scoring, mastery).
   window.GalaxyDiv / Node. */
(function (root) {
  'use strict';
  const M = (typeof module === 'object' && module.exports) ? require('./mult-math.js') : root.GalaxyMult;

  /** One basic division fact as a test question: dividend ÷ divisor = ? */
  function makeFact(fam, other) {
    if (!(fam >= 1)) throw new Error('divisor must be at least 1');
    const p = fam * other;
    return { type: 'fact', fam, other, a: p, b: fam, dividend: p, divisor: fam, quotient: other, product: p, answer: other,
      key: `fact:${M.factKey(fam, other)}`, factKey: M.factKey(fam, other), extension: M.isExtension(fam, other),
      prompt: `${p} ÷ ${fam} = ?`, equation: `${p} ÷ ${fam} = ${other}` };
  }

  /** Test deck: same even sharing between families and no back-to-back repeats as multiplication, as division facts. */
  function makeTestSet(opts = {}) {
    return M.makeTestSet(opts).map((q) => makeFact(q.fam, q.other));
  }

  /** "÷ 6" family label and "dividing by 6" wording helpers. */
  const famLabel = (n) => `÷${n}`;

  const api = Object.assign({}, M, { makeFact, makeTestSet, famLabel, subject: 'division' });
  delete api.makeQuestion; delete api.makePracticeSet; delete api.hintFor; delete api.explainFor;   // multiplication-only
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GalaxyDiv = api;
})(this);
