# Subtraction (SubtractKit) integration: independent QA audit

Date: 2026-10-11. Auditor: Agent 2, independent QA. I did not write any of the code under review.
Branch: `feature/subtraction-regrouping-integration` at `507f848` (based on `feature/division` `706b972`).

**Verdict: NOT approval-ready.** There is 1 Critical finding (SI-01: Practice gets stuck after a reload or after Exit → Continue). There are 0 High, 2 Medium and 9 Low findings.

## 1. Scope and method

What I ran (all on this Windows machine):

- **Hashes.** I computed the SHA-256 of the five vendored files, of the matching entries in `Downloads\Mathbook-main.zip` (read with `unzip -p`) and of the staged extracted copy. I computed `git hash-object` for each file and `git ls-tree HEAD`. I queried the GitHub contents API at `55b51bdda5a81ed00838433603bfa20daeb10efb`. Mathbook was only read. `/repos/.../commits/main` also returns 55b51bd.
- **Independent math check** (Node, `scratchpad/qa-sub/math-check.cjs`). My own column routine borrows recursively from the left-hand neighbour; it is written differently from both `plan()` and the integrator's oracle. I compared it with `M.plan`, `M.classify` and the exchange sequence:
  - every pair 10 ≤ top ≤ 999, 1 ≤ bottom ≤ top;
  - 400,000 random 4-digit pairs;
  - 899,455 pairs in all.

  The script also checked:
  - 9,240 practice sessions (every size × difficulty × length 10/25/50) against the requested size and difficulty, with no negative problems and no short sessions;
  - 2,000 test seeds against the 15-question blueprint (size, difficulty, chain, minExchanges, the decide key and that each mistake is wrong);
  - the required examples and `solutionLines`, and grading edge cases.
- **Store probes** (Node, `store-check.cjs`). Other keys untouched; partial corruption; garbage JSON, wrong type and wrong version; a bad result inside an active session; the outcome table; duplicate recording; an unavailable setup.
- **Test suites.** `node tests/browser-subtraction.test.mjs` once, in the foreground: **140/140 passed**. `node --test tests/sub-store.test.mjs tests/subtraction.test.mjs tests/registry.test.mjs`: **23/23 passed**. I did not run `browser.test.mjs` or `browser-division.test.mjs`; the main session runs those.
- **Two CDP probes** (`probe1.mjs`, `probe2.mjs`), using `tests/lib/harness.mjs` with one headless Chrome at a time, closed after each run. They covered:
  - real double-clicks on Skip and Next;
  - Show me, then reload, then a correct answer;
  - hint, then reload, then a correct answer;
  - Check and Show me again after an outcome is recorded;
  - reload, and Exit → Continue, after an outcome is recorded;
  - cleanup when leaving during Show me;
  - every test question searched for help, feedback or solution elements;
  - typing in test mode (looking for marks or announcements);
  - test reload and restore;
  - Teach: hint then correct (decide), Show me (mistakes), and guided Show me;
  - finishing a test with nothing answered, the recommendations, and the localStorage keys.
- **Code reading.** `js/sub-galaxy.js` and `js/sub-store.js` in full; the `app.js`, `registry.js`, `index.html` and `galaxy.css` diffs against 706b972; the event, mode and destroy paths of `sub-workspace.js`; and Mathbook's `app.js` (staged copy), to compare the ported Learn forms and the outcome rules.
- **Screenshots** in `docs/review/subtraction/shots/`. I looked at all 27 at 390 and the 1280 set, including all three lesson Your Turn types, practice, test and results. I also looked at the zero-chain, Show me and test screens at 320 and 768.

This is simulated-browser testing: headless Chrome with device-metric emulation. It is **not** testing on physical phones or tablets, and not in Safari or Firefox.

## 2. Hash verification

The SHA-256 of the Galaxy file, the zip entry and the staged copy are identical for every file. The Git blob IDs from Galaxy `git hash-object`, Galaxy `git ls-tree HEAD`, the zip entry and the GitHub API at 55b51bd are also identical, and so are the sizes (Galaxy file and GitHub API).

| Galaxy file | Mathbook path | SHA-256 | Git blob | Size |
|---|---|---|---|---|
| js/subtractkit/sub-math.js | assets/js/subtract/sub-math.js | 979083c4…c707cd | e71689b69df874b4d25fd7bbc0d643c7d6397688 | 22,425 |
| js/subtractkit/sub-workspace.js | assets/js/subtract/sub-workspace.js | 55622222…0db68 | b9d5fd740d1c957e15ef805d78e5a534a6a2741e | 57,917 |
| css/subtractkit/subtract-workspace.css | assets/css/subtract-workspace.css | 0f1da5fd…90cc35 | 0f837fa017990f58584f4743ff1b3d89bed07a02 | 10,393 |
| js/subtraction-vendor/content.js | curriculum/supplemental/subtract-regrouping/content.js | ec6d6879…9979e8 | 49f52efca034fda46eb1d0b65f8d8811876aacf0 | 17,741 |
| js/subtraction-vendor/place-value.js | assets/js/place-value.js | 5221dc67…487c34 | 39aa2f77f4cf7eeb377c831bd23a695472d0679a | 24,250 |

`.gitattributes` sets `-text` on all three vendored folders (confirmed with `git check-attr`). The hash claims in SOURCE-AUDIT.md §4 are correct.

## 3. Requirements checklist

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 1 | Reuse: core files unchanged; no second engine | **Met** | See §2. The adapter does no generation, classification, plan or grading arithmetic of its own: problems come from `C.testItems`, `M.generateSession` and `L.yourTurn`; grading uses `M.gradeFinal`, `M.checkAmounts` and `M.readAnswer`; difficulty uses `M.classify`; solutions use `M.plan` and `M.solutionLines`. `standardAnn` and `answerDigits` only read `M.plan` output. The ported Learn forms match Mathbook's `app.js` (same `wsMode: 'test'` for non-sub items, same rule that only Show me counts as help). |
| 2 | Math correctness | **Met** | 899,455 pairs: answers, difficulty, exchange count, zero-chain length and the exact exchange sequence all match my routine (0 failures). The required examples are correct: 52−27=25 (easy, 1 exchange); 463−128=335 (easy); 532−168=364 (medium, 2); 4,532−1,768=2,764 (medium, 3); 3,002−1,578=1,424 (hard, chain 2, exchanges thousands→hundreds→tens→ones one at a time, each zero 10 → 9). The demo shows this in screenshots 10/11 at all widths. Sessions: 0 off-spec, 0 short, 0 negative. Test blueprint: 0 violations in 2,000 seeds. 2-digit Medium and Hard: Start is disabled and a reason is shown (screenshot 14); `startPractice` throws for them. |
| 3 | Help and mastery (five outcomes) | **Partly** | Outcomes are recorded separately and Show me is never counted as independent. Help survives a reload (probe B: Show me → reload → correct gives `shown`; probe D: hint → reload → correct gives `hinted`). Check or Show me after recording does not re-record (`recordProblem` returns false). A double-click on Next is harmless. **But** SI-01 blocks a session after reload or Exit → Continue, and SI-02 lets a double-tap on Skip record an unseen problem as skipped. |
| 4 | Test isolation | **Met** | All 15 questions were inspected in the browser: no hint, solution, Check, coach or feedback element is present (probe H). Typing produces no ✓/✗ marks and no live announcements. SubtractKit forces `allowHints`, `allowCheck` and `allowSolution` to false in test mode. Worked answers mount only on the results page. Grading happens once, in `finishTest`, and is recorded once per seed. The report shows correct, not right, unanswered, percentage, by kind, by difficulty and recommendations. The console-only exposure is noted in SI-08. |
| 5 | Storage | **Partly** | Own key `galaxy-math.subtraction` v1. `galaxy-math.progress` and `galaxy-math.settings` are byte-identical after start, complete and reset. Bad entries are dropped one by one, and partial work is saved and restored (practice `cur`, test draft, lesson work). There are no duplicate tests or results, and reset clears subtraction only. **But** one corrupt practice result makes the whole finished session disappear on the next load (SI-03), and an unknown version or unparseable record is overwritten without a backup (SI-09). |
| 6 | Cleanup | **Met** | `stopAll()` calls `GalaxySubtraction.stop()`. Leaving during Show me: `liveCount` goes 1 → 0, `#sub .sk` goes 2 → 0, and `#sub` is emptied and hidden. Workspace listeners use an AbortController, `destroy()` clears the announce timer, and `paint()` destroys before re-rendering. |
| 7 | Layout and design | **Met** | The suite checks no horizontal overflow at all six sizes and that grids stay inside panels. In the screenshots, columns are aligned, crossed-out digits and 10 → 9 chains are correct, and Galaxy's background and light panels are used. Focus styles are in `galaxy.css`. Minor polish issues only (SI-11). |
| 8 | Multiplication and Division unaffected | **Met (by code reading)** | The `route()` subtraction branch runs only when `r.subject === 'subtraction' && r.view !== 'menu'`. `useSubject` returns early for subjects without a profile. The landing label is the same for subjects with all five activities ready. `renderMenu`'s new `progress` and `settings` gating gives the same output for Multiplication and Division, which have both views. All new CSS is scoped to `#sub`, and the vendored CSS is `.sk-*` only. The subtraction store never touches `galaxy-math.progress`. |
| 9 | Classroom quality | **Partly** | The wording is child-friendly and the explanations match what is on screen. Some small wording and labelling issues: SI-05, SI-06, SI-07, SI-10. |

## 4. Findings

### SI-01: Critical. Practice "Next problem" does nothing after a reload or after Exit → Continue

- **Location:** `js/sub-galaxy.js:540` (`if (recorded) return;`) runs before the `#spSkip` and `#spNext` listeners are attached at `:558–559`.
- **Evidence:** probe2.
  1. Solve problem 1. Its outcome is recorded as `independent`.
  2. Press ✕ Exit, then ▶ Continue practice. "Next problem ▶" is visible.
  3. Click it: `activePractice().i` stays 0 and the screen still says "Problem 1 of 10".
  4. Reload and Continue, then Next: still `i = 0`.
- **Failure scenario:** a child solves a problem and leaves (Exit, a tablet discarding the tab, an accidental refresh, coming back the next day). The session can never continue. The only way out is "Start over", which throws the session away. This blocks the activity and loses data.
- **Fix:** attach the Next (and Skip) handlers before the `recorded` early return, for example by moving `if (recorded) return;` below the listener wiring and guarding only the workspace event hooks. Add a browser test for "record → reload / Exit+Continue → Next advances".

### SI-02: Medium. A double-tap on "Skip this one" also skips the next, unseen problem

- **Location:** `js/sub-galaxy.js:536, 558`. After a skip, the new problem's Skip button is drawn in exactly the same place.
- **Evidence:** a real CDP double-click on `#spSkip` gives `i = 2` with results `{0: skipped, 1: skipped}` (probe1 A).
- **Failure scenario:** young children often double-tap. A problem they never saw is recorded as "Skipped", which skews the session and the Progress totals.
- **Fix:** ignore clicks on the new problem's Skip for about 400 ms after rendering, or disable Skip until the workspace has had an interaction or focus. A confirm step would also work.

### SI-03: Medium. One bad practice result makes a whole finished session disappear later

- **Location:** `js/sub-store.js:48` drops the bad result; `:174–176` builds counts from the results that remain; `:58` then rejects the session because the counts no longer add up to `total`.
- **Evidence:** store-check (4). Corrupt result #3 in an active 10-problem session and finish it. The session is saved with counts summing to 9 and total 10. After a reload, `sessions().length` is 0.
- **Failure scenario:** one damaged entry silently deletes an otherwise good session from Progress. This breaks the "one bad record never destroys others" requirement.
- **Fix:** in `nextProblem`, count indexes with no result as `skipped`, so the counts always sum to `length`. Alternatively, have `cleanSession` accept the session and fill in the shortfall.

### SI-04: Low. A recorded problem reopened after a reload shows an empty workspace with working Hint, Show me and Check

- **Location:** `js/sub-store.js:163` (`a.cur = null` when recording) and `js/sub-galaxy.js:539–540`.
- **Evidence:** probe1 E. The answer boxes are empty, yet the note says "✓ You solved it with hints", and the help buttons are still active (nothing is recorded if they are used).
- **Fix:** keep the final state in the result, or mount the recorded problem in `view` mode with the solved answer.

### SI-05: Low. Hint counts are mislabelled

- **Location:**
  - `js/sub-galaxy.js:544`: Show me also adds to `hints`, so results say "Completed with Show me (2 hints)" when one hint plus Show me was used (screenshots 19 at 390 and 1280).
  - `js/sub-galaxy.js:725`: the Progress column "Hints" shows the number of *hinted problems*, not the number of hints.
- **Fix:** count only `d.level < 5` as hints, and rename the column to "With hints".

### SI-06: Low. In Teach, a Your Turn finished after using 💡 Hint is recorded as "done on own"

- **Location:** `js/sub-galaxy.js:292, 332` and `sub-store.js:132`.
- **Evidence:** probe2 (3): hint, then correct, gives `{indep: true, helped: false}`. This matches Mathbook's behaviour, but it is inconsistent with Practice, where hints give "Right after hints".
- **Fix:** decide on a policy and document it. Optionally record hints in the lesson record and show them in Progress.

### SI-07: Low. Skip after opening Show me (without finishing it) is recorded as "Completed with Show me"

- **Location:** `js/sub-store.js:105` (`helped` takes precedence over `correct`).
- **Fix:** when `!correct && helped`, record `skipped` (or a "with help, not finished" note), keeping the help flag.

### SI-08: Low. Answers can be reached from the browser console during a test

- **Location:** `js/sub-galaxy.js:757` (`GalaxySubtraction._test.items`, `.grade`, `.finishTest` in production). A SubtractKit test-mode instance's `check()` and `result()` also return correctness, but those instances are not reachable from `window`.
- **Impact:** a third-grader cannot reach this through the UI.
- **Fix:** expose `_test` only when a test flag is set (for example `?test=1`), or remove it from the shipped build.

### SI-09: Low. An unreadable or other-version record is overwritten without a backup

- **Location:** `js/sub-store.js:88, 114–118`.
- **Evidence:** garbage JSON, `[]` and `{v: 2, …}` all load as blank. The raw value is replaced at the next save.
- **Fix:** before the first save, copy an unrecognised raw value to `galaxy-math.subtraction.bak`, or refuse to save over a higher `v`.

### SI-10: Low. Wording in the test review for "Finding mistakes" rows

- **Location:** `js/sub-galaxy.js:681`.
- **Evidence:** it reads "Right answer: Added 10 to a place but did not take 1 from the place on its left. Answer 4,772" (probe2 (6)).
- **Fix:** use "What went wrong: …. Right answer: 4,772."

### SI-11: Low. Polish

These are cosmetic and do not block use:

- **Missing addition picture.** The "Check with addition" example drops Mathbook's addition picture (the `MB.fig` stack). The adapter shows only the subtraction grid and a sentence (`exampleHTML`, `js/sub-galaxy.js:382–384`).
- **Two Back buttons.** Lesson "See it" screens have two "◀ Back" buttons, one for the demo and one for the lesson, stacked at phone width (screenshots 06–11 at 320 and 390).
- **Empty space in test questions.** Decide questions in the test leave empty regroup rows above the digits (768-23).
- **No first-try credit.** Getting a problem wrong and then right without help counts as "On your own" (probe1 F logic; `outcomeOf`). `tries` and `wrong` are stored but never shown, so the first-try information Mathbook had is lost.

## 5. Verdict

**Not approval-ready.** Critical = 1 (SI-01) and High = 0. The reuse, the math, test isolation, cleanup and layout are solid and confirmed with evidence. After SI-01 is fixed and has a regression test, and ideally after SI-02 and SI-03 are fixed, a short re-check of the Practice flow and the store should be enough to approve.
