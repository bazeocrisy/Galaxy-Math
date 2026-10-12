# Subtraction 2.0 — Independent QA and Pedagogy Audit

Branch `feature/subtraction-2.0` at `a0d30f5`, compared with baseline `c8a45d8` (live on gh-pages `97c5759`).
The auditor did not write this code. No app code, tests or vendored files were changed. The only file added is this report.

## 1. Scope and method

What was run (Windows 11, Node, headless Chromium through `tests/lib/harness.mjs`, one browser at a time):

| # | What | Result |
|---|------|--------|
| 1 | `git diff c8a45d8 HEAD -- js css index.html tests package.json`, read in full; `git diff --stat` and `git log` on `js/subtractkit`, `css/subtractkit`, `js/subtraction-vendor` | The vendored paths have no diff and no commits since the baseline |
| 2 | `npm test` (all unit suites, including the VENDORED hash test in `tests/subtraction.test.mjs`) | 116/116 pass |
| 3 | An **independent oracle** written by the auditor (scratch `qa-sub2/oracle.cjs`). It uses its own column routine, its own simulations of the four Mathbook mistake types, its own round-half-up rounding, and parsing of the prompt and option text. It covers all 12 kinds × levels 1–3 × 3,000 seeds each, plus 1,800 `makeSession` runs (10/25/50 × 3 levels × 200 seeds) and 1,040 one-kind "misses" sessions | 153,337 questions checked, **0 math failures** (details in §3) |
| 4 | A replica of `flashDeck` (scratch `qa-sub2/flashdeck.cjs`) over 3 mixes × 4 sizes × 900 decks | Found a difficulty bias (S2-02) |
| 5 | `node tests/browser-subtraction2.test.mjs` | 148/148 pass |
| 6 | `node tests/browser-subtraction.test.mjs` (the existing Teach/Practice/Test regression suite) | 143/143 pass |
| 7 | A CDP probe written by the auditor (scratch `qa-sub2/probe.mjs`). It tests a double Submit, reload after Submit and before Next, a double Skip and Next, Enter inside a workspace, "Practice my misses" above the current level, and the Multiplication Lab number pad after the `askQuestion` change | All behaved correctly except "misses above the level" (S2-05) |
| 8 | Screenshot review (`docs/review/subtraction2/shots`): all 24 screens at 390 and at 1280; the workspace, model and flashcard screens at 320 and 768 | See §2, item 8 |
| 9 | Code reading of the `askQuestion` change for Multiplication and Division | No behavior change (item 9) |

All browser work used **simulated viewports in headless Chromium, not physical phones or tablets**. Touch was exercised only as synthetic clicks. Real touch, on-screen keyboards and screen readers were not tested. `tests/browser.test.mjs` and `tests/browser-division.test.mjs` were not run by this audit; the main session runs those.

## 2. Requirements checklist

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1a | SubtractKit core and vendored Mathbook files unchanged | **Met** | There is no diff on the vendored paths, and the VENDORED hash test passes. The only change in `tests/subtraction.test.mjs` is the activity-readiness test; the hash list is untouched. |
| 1b | The bank reuses SubtractKit and does not invent regrouping | **Met** | `js/sub-bank.js` takes its operands from `M.generateOne`. Exchanges come from `M.plan`, wording from `M.describe` and `M.solutionLines`, mistakes from `M.buggyWork` and `C.BUG_TEXT`, and validity from `M.checkAmounts`. Distractors are simple edits of `plan().final`; no new borrow routine was written. |
| 2 | Twelve formats correct; exactly one right option | **Met** | Oracle: 0 failures (§3). |
| 2 | Age-appropriate, plausible wording | **Partly** | The place-value "value" item gives away its own answer (S2-01). Estimation can mean rounding a 2-digit number to the nearest hundred (S2-04). There are a few implausible stories and some grammar slips (S2-07). Pine Mountain now appears only with 4-digit tops (945 of 945). |
| 3 | 10/25/50; one question at a time; kind hidden until answered; Skip; no hints; answer plus explanation; SubtractKit workspace; keyboard and touch | **Met** | The browser suite covers this, and screenshots 390-03, 390-12b and 1280-07b show it. Workspaces use SubtractKit `test` mode, which has no Check or hints (`sub-workspace.js:5,519`). Enter inside the grid does not submit (probe). |
| 3 | Report: counts, accuracy, by skill, missed with explanations, lessons, Practice My Misses, Start another | **Met** | Screenshot 390-15. Results are shown by kind of problem, not by the `skill` text; that is acceptable. |
| 3 | Varied mix, no duplicates | **Met** | 1,800 sessions: every 10-question session had 10 different kinds; there were 0 duplicate problems, 0 cases of the same kind twice in a row, and the sessions were deterministic. |
| 3 | Levels do not force 4 digits early; autoLevel sensible | **Partly** | Level 1 was 100% 2- and 3-digit with one exchange (48,712 questions). Level 2 had no 4-digit multi-exchange problems and no chain longer than 1. But the autoLevel thresholds are loose (S2-03). |
| 3 | Lab separate; assisted work never counted as independent | **Met** | The Lab has its own `lab` record. It has no help before Submit, and its answers are recorded once. Practice and Test are untouched (unit and browser tests). |
| 4 | 2/3/4/Mixed decks, sensible defaults, SubtractKit problems | **Partly** | Decks come from `M.generateOne`. The Mixed deck ties difficulty to size (S2-02). |
| 4 | Auto reveal by size, Show early, Pause, Finish; no auto-advance | **Met** | Browser suite: no flip before 8 s, flip after; it never moves on by itself; pause and resume keep the remaining time. The 15 s timing is discussed in S2-11. |
| 4 | "See the regrouping" uses demo mode; exposure and confidence kept apart from mastery | **Met** | `flashSee` mounts `mode: 'demo'` (screenshots 390-19 and 320-19). `recordFlash` stores only cards, seconds, knew, notYet and shown, and Progress labels them "not counted as mastery". |
| 4 | Parent Settings for timing and selection | **Met** | Screenshot 1280-21. Settings are saved under `galaxy-math.subtraction`, never in `galaxy-math.settings`. |
| 5 | Five activities in order; no new subject cards | **Met** | Screenshot 390-01; `registry.js`; the test confirms there are still 4 subject cards. |
| 6 | Separate records; v1→v2 migration; malformed records dropped individually; other subjects untouched | **Met** | `sub-store.js` cleans each entry separately, and the unit tests cover v1 upgrades and damaged entries. The browser suite checks that `galaxy-math.progress` and `galaxy-math.settings` stay byte-identical. |
| 6 | Partial Lab saved and resumable; no duplicate events | **Met** | Probe: a double Submit saved 1 record; after a reload between Submit and Next the challenge resumed at the next problem; a double Skip+Next advanced by exactly one. Marks still being written in a workspace are not saved on reload (S2-12). |
| 7 | Timers and keydown listener removed; workspaces destroyed | **Met (minor)** | `stop()` clears the timers and `fcKeys`, and the browser suite checks this. Replaced workspaces stay alive until the next `paint` (S2-10). |
| 8 | Responsive at six widths; accessibility | **Met (minor)** | No horizontal overflow (suite). At 320 the D options wrap to 3 lines but stay usable (320-06). Feedback uses `role=status` with `aria-live`. The flash card has an aria-label. The right and wrong choice highlight relies on color, but the feedback text states the answer (S2-13). |
| 9 | No regressions in Teach/Practice/Test; Multiplication and Division unaffected | **Met** | The existing suite passes 143/143. `askQuestion` falls back to the old behavior: `maxDigits` defaults to 3, and `visualHtml`, `mountVisual`, `mountAnswer` and `onFinished` are absent for Multiplication and Division. The probe confirmed the Multiplication Lab pad still caps at 3 digits. |

## 3. Math-verification summary (independent oracle)

All results are over 153,337 generated questions.

| Kind | Independent check | Result |
|------|-------------------|--------|
| A Vertical | answer = top − bottom; at least 1 exchange | 0 fail |
| B Missing subtrahend | top − ans = shown difference | 0 fail |
| C Missing minuend | ans − bottom = shown difference | 0 fail |
| D Exchanges | Parsed each option into place amounts. Valid means the value equals the top and every place covers the bottom digit. | Exactly 1 valid option every time, and it is the standard final form. Distractors either keep the value but cannot subtract (13,391) or change the value (26,416). |
| E Mistakes ("why") | Re-simulated each offered mistake with the auditor's own routines | Exactly 1 option reproduces the shown wrong answer, every time. In "fix" questions the wrong answer is never the correct one. |
| F Inverse | The sum, the "how" text, and the judge claim + bottom = shown sum; Yes only when the claim is exact | 0 fail; Yes and No are about 50/50 |
| G Word | answer = difference | 0 fail. Pine Mountain appears only with 4-digit tops. |
| H Estimate | Round half up, no ties (exact halves are excluded); exactly 1 option equals the estimate; wrong claims are ≥ 3 units from the estimate | 0 fail. Pedagogy issue in S2-04. |
| I Place value | The amounts in the prompt sum to the top; the count matches the auditor's own regrouping | 0 fail. Giveaway in S2-01. |
| J Zeros | The named place really is 0 in the top; the answer equals the auditor's final amount; a zero chain is present | 0 fail. The answer is always 9 (S2-08). |
| K Strategies | bottom + j1 = landmark; landmark + j2 = top; j1 + j2 = difference; both jumps > 0; landmark is a multiple of 10 or 100. "Whose": the smaller-from-larger answer is never correct, and the three names are different. | 0 fail |
| L Model | Each option evaluated as a statement about whole = top, part = bottom | Exactly 1 option matches. `? − top = bottom` and `top + bottom = ?` never match. |
| Levels | L1: ≤ 3 digits, 1 exchange, no zero chain. L2: no 4-digit multi-exchange, chain ≤ 1. | 0 violations |

## 4. Findings

Totals: Critical 0 · High 0 · Medium 4 · Low 10

### S2-01 — Medium — Place-value "What number is that?" prints the answer in the question
- **Location:** `js/sub-bank.js`, `case 'place'`, `variant: 'value'`.
- **Evidence:** The prompt is `` `${fmt(top)} is regrouped as ${M.describe(p.final)}. What number is that?` `` and the answer is `top`. The oracle found the answer inside the prompt in 6,734 of 6,734 instances. Screenshots 390-11 and 1280-11 show "4,000 is regrouped as 3 thousands, 9 hundreds, 9 tens, 10 ones. What number is that?"
- **Failure scenario:** A child copies the first number and gets credit. Half of the Place value results then measure reading, not place value, and they inflate the Lab score and the "Place value" row in Progress.
- **Fix:** Drop the leading number, for example "A number is regrouped as 3 thousands, 9 hundreds, 9 tens, 10 ones. What number is it?". Or ask for a missing amount, for example "4,000 = 3 thousands, ? hundreds, 9 tens, 10 ones".

### S2-02 — Medium — Mixed flashcard decks tie difficulty to size
- **Location:** `js/sub-galaxy.js` `flashDeck`. Both the size and the difficulty are indexed from the same counter `k` (`[2,3,4][k % 3]` and `diffs[k % diffs.length]`).
- **Evidence:** The replica (900 decks each) gave:
  - **Mixed + Standard** (the default mix): 3-digit cards were 100% one exchange and 4-digit cards were 100% two or more exchanges. There were never any 3- or 4-digit cards without regrouping, and never a 4-digit card with one exchange.
  - **Mixed + Challenge:** 3-digit cards were always "medium" and 4-digit cards were always across zeros. There was never a 3-digit card across a zero.
- **Failure scenario:** The Mixed deck does not match the mix that the Parent Settings help text describes. A child on Mixed never sees an easy 4-digit card.
- **Fix:** Pick the difficulty with its own counter per size, or with `pick(r, diffs)`. Add a unit test on the size × difficulty spread.

### S2-03 — Medium — "Grow with my child" moves up on weak evidence
- **Location:** `js/sub-galaxy.js` `autoLevel`.
- **Evidence:**
  - `prac([3])` only needs `counts.independent >= 7` in any 3-digit session, of any difficulty and any length. So 7 of 50 (14%) on 3-digit Easy unlocks level 2, and 7 of 50 on 4-digit or Mixed unlocks level 3.
  - `done('multi')` counts a lesson finished **with help**.
  - `labOk` also counts "misses" sessions.
  - Level 3 then brings in 4-digit problems across two zeros, which is beyond the Grade 3 standard of working within 1,000.
- **Failure scenario:** A struggling child does one long 3-digit practice session and starts getting 4-digit multi-exchange Lab problems. The difficulty jumps sharply after a weak result.
- **Fix:**
  - Use a rate, for example ≥ 70% independent with at least 10 problems, and require the practice difficulty to match the level (Medium or Hard for level 2 to 3).
  - Count only lessons finished on the child's own (`indep`).
  - Count only `kind === 'challenge'` Lab sessions.

### S2-04 — Medium — Estimation sometimes rounds a 2-digit number to the nearest hundred, so "reasonable" is a stretch
- **Location:** `js/sub-bank.js` `case 'estimate'`. The rounding unit is chosen from the top number only.
- **Evidence:**
  - With a 3- or 4-digit top, a bottom of 50–99 is rounded to 100: 218 − 63 becomes 200 − 100 = 100, while the exact answer is 155.
  - 77 of about 2,700 "Yes, it is reasonable" items are 50% or more off the estimate, for example 781 − 747 (estimate 100, exact 34, keyed "Yes, it is close") and 23 − 7 (estimate 10, exact 16).
  - In 18% of "Yes" items the exact answer is more than half a rounding unit from the estimate.
  - Math is never wrong: wrong claims are always ≥ 3 units away.
- **Failure scenario:** The child is taught that 34 is "close to" 100. That works against building number sense.
- **Fix:**
  - Round a 2-digit number to the nearest ten even when the other number has 3 or 4 digits, or choose the unit from the smaller number.
  - Reject items where |exact − estimate| / estimate > ~0.35.
  - Phrase it as "Is X a reasonable answer?" rather than "close to the estimate".

### S2-05 — Low — "Practice my misses" silently does nothing when the missed kinds are above the current level
- **Location:** The `#ldMisses` handler and `startLab` in `sub-galaxy.js`, and `makeSession` in `sub-bank.js`, which filters the pool by `minLevel <= level`.
- **Evidence:** The probe missed only "zeros" in a level-3 session, set Lab level to Small, then clicked Practice my misses. Result: the active Lab was `null` and the screen went back to Lab setup with no message.
- **Fix:** Start the misses session at the level of the session it came from (or at `max(level, minLevel)`). If nothing can be built, show a message.

### S2-06 — Low — Answer line formatting in feedback
- **Location:** `js/app.js` `askQuestion`: `The answer is ${esc(q.answer)}.`
- **Evidence:**
  - Numbers appear without a thousands comma ("The answer is 4977."), while the explanation says "4,977".
  - For a choice that is a full sentence, the line reads "The answer is Subtracted the smaller digit … exchanging.." with a double period, and the sentence is then repeated (screenshots 390-07b and 1280-07b).
- **Fix:** Let the bank supply `answerText` (formatted). For E "why" questions, use "The mistake: …" and drop the repeated sentence.

### S2-07 — Low — Story wording and plausibility
- **Location:** `sub-bank.js` `case 'word'`.
- **Evidence:**
  - "Leo has scored 1 points" (a 1-digit bottom is possible).
  - "The rocket must fly 87 miles to reach the space station" with 2-digit tops (835 of 3,000).
  - "Cedar Hill is 56 feet tall" in 166 of 945 Pine Mountain stories.
  - "A video game level is worth 50 points … How many more points can he score?" is fine.
- **Fix:** Singular and plural for 1. Use a floor for the bottom in the Pine/Cedar story (≥ 100). Use a different 2-digit rocket context (for example "fuel cells").

### S2-08 — Low — Predictable answers and weak distractors in a few formats
- **Evidence:**
  - J's "what number is in the zero place" is 9 in 3,614 of 3,614 items.
  - E offers "Passed an exchange through a zero…" for problems that have no zero (5,417 items), which is an easy elimination.
  - K "count up" gives both jumps, so it is really a 2-addend addition. The second jump can be large and unexplained ("from 90 to 5,001 is 4,911", screenshot 390-13).
- **Fix:**
  - J: sometimes ask about the place left of the zero chain, or about the ones.
  - E: offer the zero-ten mistake only when the problem has a zero chain.
  - K: use landmarks with two or three friendly jumps, or ask for one missing jump.

### S2-09 — Low — Long prompts for 8-to-9-year-olds
- **Evidence:** Every K "whose strategy does NOT work?" prompt is over 200 characters, with three names, three methods and three results (report screenshot 390-15). D options at 320 px wrap to 3 lines (320-06).
- **Fix:** Show the three children as three short cards and ask "Whose way does NOT work?".

### S2-10 — Low — Replaced workspaces are not destroyed right away
- **Location:** The Lab `onFinished` handler (`box.innerHTML = ''` over the `test` workspace) and `flashSeeClose` (`#sfDemoWs.innerHTML = ''`).
- **Evidence:** These instances stay in `live` until the next `paint` or `stop()`. During a 30-card deck, every "See the regrouping" adds one. Their listeners are on their own elements, so nothing leaks past the screen and the browser-suite cleanup checks still pass.
- **Fix:** Call `inst.destroy()` and remove the instance from `live` before clearing the container.

### S2-11 — Low — Flashcard timing and small details
- **Evidence:**
  - The 15 s auto reveal for 4-digit multi-exchange cards is short for mental work at Grade 3. There is no auto-advance, so this is not real time pressure, but "The answer shows in 15 seconds" can feel timed.
  - While paused after a flip, "I knew it", "Not yet" and "Next" look enabled but do nothing.
  - Progress shows "0 minutes" for short sessions, because of `Math.round(seconds/60)`.
  - `if (d === 'none' && sz > 2 && k % 2) spec.equal = false;` is dead code.
- **Fix:**
  - Consider 20 s, or Tap only by default, for 4-digit and Mixed decks.
  - Disable the after-flip buttons while paused.
  - Show "under 1 minute".

### S2-12 — Low — Workspace marks for the current Lab question are not restored after a reload
- **Evidence:** Answered questions resume exactly (probe). The question on screen restarts with an empty grid. Nothing is double-counted.
- **Fix:** Optional: save `wsInst.getState()` on change, as Practice does with `cur.state`.

### S2-13 — Low — Right and wrong choice highlighting relies on color alone
- **Location:** `css/galaxy.css:194-195`. This is the shared component, so it predates this work.
- **Evidence:** After answering, the right option is green and the chosen wrong option is coral, with no icon or text marker. The feedback text does state the answer, so this is mitigated.
- **Fix:** Add ✓ and ✗ markers (or `aria-label` suffixes) to `.right` and `.wrong`.

### S2-14 — Low — Code nits
- **Evidence:**
  - The old one-line JSDoc above `askQuestion` remains next to the new block, so there are two doc comments.
  - The bank's `explain.lines` is built but `askQuestion` never renders it; the demo covers the same ground.
- **Fix:** Remove the duplicate comment. Either render the lines or drop them.

## 5. Verdict

- **Critical: 0. High: 0.**
- The math is correct in all 12 formats over 153k independently checked questions, with exactly one right option in every choice question.
- The core and vendored files are unchanged.
- The Lab and Flashcards meet the owner's experience, storage, cleanup and navigation requirements.
- The existing Subtraction suites, Multiplication and Division are unaffected.

**Approval-ready.** It is recommended that the four Mediums be fixed before or soon after publishing:
- S2-01: the place-value giveaway;
- S2-02: the Mixed deck bias;
- S2-03: the autoLevel thresholds;
- S2-04: rounding a 2-digit number to the nearest hundred.

Each is small and local to `sub-bank.js` or `sub-galaxy.js`.
