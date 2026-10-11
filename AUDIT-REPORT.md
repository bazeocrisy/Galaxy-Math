# Galaxy Math: Multiplication 2.0 Independent Audit

- **Auditor role:** Agent 2, independent educational UX and QA auditor. I did not write this code.
- **Date:** 2026-10-11
- **Commit audited:** `6e1a185` (branch `feature/galaxy-math-foundation`). I did not change any source file. During the audit, `README.md` showed up modified in the working tree. That change came from someone else, not from this audit.
- **What I ran:**
  - `npm test`: 62/62 pass.
  - `npm run test:browser`: run once, 580/580 checks pass.
  - Node probe scripts that call `GalaxyBank.generate()` exhaustively: all 12 types × every fact (1–10 with extension off, 1–12 with it on) × 40 seeded RNGs, 107,920 questions in total. The scripts checked answer keys, duplicate or equal-valued options, false facts, numbers out of range, grammar, how picture sizes compare with products, and whether hints give the answer away. Further probes covered `makeSet`, `scoreSession`, `scoreTest`, `masteryFor`, `tableQuotas`, `unlockedTypes`, v1→v2 migration and the blocked-storage store.
  - Headless Chrome through `tests/lib/harness.mjs`, one browser at a time:
    - Screenshots at 320×640 and 1366×768 of: menu, Lab setup, Lab questions for 10 kinds of problems (before answering and after a wrong answer), Lab report, Parent Settings, Progress, Practice hints, Flashcards, Test and Test results, Teach.
    - Menu screenshots at 375×812, 390×844, 768×1024 and 1280×800.
    - Targeted checks: where the hint box and feedback land on screen, keyboard flow and focus in the Lab, flashcard reveal and advance timing, timer cleanup on exit, routes for Division and Addition, the Lab's "Learn …" link.
  - Screenshot names below refer to my scratch folder (`…/scratchpad/audit/`). They are not committed.
- **Honest limitation:** I had no real phones or tablets. Every "mobile" result comes from Chrome viewport and touch emulation. I did not test real touch behaviour, on-screen keyboard behaviour, iOS Safari, or font rendering on real devices. Reading-level remarks are expert judgement, not a formal readability score.

---

## Checklist

| # | Question | Answer | Evidence |
|---|---|---|---|
| 1 | Can a third grader navigate without parental instruction? | **Partly** | The menu is clear: five large cards with short "Show me how / Let me try…" labels (`320x640-menu.png`). Each activity has a single Start. Exit and Back are always visible. Problems: at 320×640 the "Not quite — try again" message and hints appear below the fold, so the child sees the number pad clear with no visible message (A-03). Some child screens contain adult text (A-17). |
| 2 | Does each question type exercise a different reasoning skill? | **Partly** | B (missing factor), D (match), G (switch the order), H (fact family incl. ÷), J (error analysis), K (times as many) and L (equal products) are genuinely different. A, C, E, F and I all come down to "compute a × b" with different framing. C (repeated addition) also prints "That is 7 groups with 4 in each group" under the prompt, so it turns into E (A-21). G's number version shows the answer in the prompt ("7 × 4 = 28. What is 4 × 7?"). That is a valid commutativity check but is answered by copying. |
| 3 | Are all math prompts and correct answers accurate? | **Mostly yes, with one wrong-math hint** | 107,920 generated questions: every answer key passes `check()`. No duplicate options. No two options with equal value in D or G. No false fact among the options in H. No "1 groups", NaN, undefined or ÷0. Every choice question has 3 options. **But:** the J hint is mathematically wrong when the second factor is 1 (A-01). Distractors bring in 11s when the extension is off (A-14). One extension diagram does not match its text (A-13). |
| 4 | Are hints educational, and do they avoid giving the answer away? | **Partly** | Clue → strategy → worked explanation is a sound progression. The skip-count hints stop before the answer (`countStart`). But hint 2 for B draws exactly *answer* jumps, so counting arcs gives the answer (A-04; it happened in 9,760 of 9,760 generated missing-factor questions). Hint 2 for I and K states the multiplication ("Multiply 4 × 7"), which removes the reasoning step (A-22). The J hint is wrong for ×1 (A-01). |
| 5 | Are visual diagrams consistent with the equations? | **Yes, except one extension case** | Probe: every question array has rows×cols = product. Every groups picture has groups×size = product. Array prompt text matches the picture rows and columns. Bar model for K: `times` bars of `size` (`320x640-lab-compare-wrong.png`). Exception: Match explanations for 11×11, 11×12 and 12×12 draw 10 groups (A-13). Number lines in hints are very small at 320 px (A-19). |
| 6 | Is the Math Thinking Lab different enough from Practice? | **Partly** | Different mechanics: no hints, one try, Skip, type named only afterwards (verified: no type badge and no Hint button before answering; `revealType` appears in feedback), plus a report by type. But the questions come from the same generator, and Practice already mixes all 12 types. A new child's Lab offers only the 4 starter types, all of which are "compute a × b" (A-06). |
| 7 | Are child-facing controls simple? | **Mostly yes** | One Start per activity. Large number pad. Flashcards have Show answer / Pause / I'm done. Lab Exit is one tap and silently discards a 25- or 50-problem session (A-11). The Test Quit button needs two taps, which is good. |
| 8 | Are mobile and desktop layouts usable? | **Partly** | No horizontal page overflow at any viewport tested (scrollWidth equals clientWidth on every screen). 1366×768 and 1280×800 look good (`1366x768-lab-report.png`, `1366x768-progress.png`). At 320×640, Submit/Check is below the fold on several types (A-07) and feedback and hints are off screen (A-03). The Test results tally label "unanswered" overflows its box and the Mastery column needs a sideways scroll (A-20). 375, 390 and 768: menus fit. At 390×844 the feedback lands at y≈700 and is visible. |
| 9 | Are test scores mathematically correct? | **Yes** | `scoreTest` probe: 1 correct, 2 incorrect, 1 blank → 25%. Unanswered counts in the total. Speed comes only from timed correct answers. `masteryFor` needs ≥5 questions per table and ≥90% in 2 tests, and excludes retries. Lab `scoreSession` counts skipped as unanswered. A browser test run gave 6/10 = 60% with tally 6/4/0 (`320x640-test-results.png`). **But** with default settings no test can ever count toward mastery (A-02). |
| 10 | Are existing capabilities preserved? | **Yes** | Browser suite 580/580. Flashcards default reveal measured at 5,023 ms and next card at 7,015 ms (5 s + 2 s). `T.ids.size` is 0 after leaving Flashcards and the Lab. A flash session is recorded on Exit. v1 progress migrates (lessons and tests kept). A store with blocked storage keeps working in memory (`persistent: false`) and Progress shows a notice. Keyboard: digits, Enter submits, and focus moves to Next. Lessons still need 2 of 3 to complete. |

### Other required checks (short)

- **Reading level:** Most prompts are short and concrete. The Strategies lesson's explanation step is a dense symbol list and includes "factors up to 10 (products within 100)" (A-16). The long word-problem template (about 30 words) is fine on purpose but is the hardest text. "One challenge is a snapshot. Skills are marked 'Strong' only after several sessions." is on the child's Lab report (A-17).
- **"Times as many" lesson (grade 4):** The lesson handles it well. The title says "(challenge)" and the text says "gets you ready for 4th grade". But Practice serves K problems to every child from the first session with no challenge label (A-08), and the Lab unlock is bypassed through Practice (A-09).
- **Does the Lab hide the strategy?** Yes for the badge and hints. One leak: the C sub-line (A-21).
- **Recommended lessons:** The mapping from type to lesson is sensible, except L → "Multiplication equations", which barely teaches equal products (A-10). Ties are ordered by question order, so a child who missed everything can be sent to the challenge lesson first (A-12).
- **Practice my misses:** Works. The badge count is correct. A missed (type, fact) leaves the list only when the same type and fact is right on the first try. Facts missed in Tests are cleared by any correct answer for that fact. A session of 2 per miss mixes in other types for variety (probe: 1 missed `missing` → missing, equal, missing, repeated).
- **Parent Settings:** Clear and honest ("not locked"). It warns live when a test will not count toward mastery. Small gap: 11s and 12s can be chosen while the extension is off, and they are silently ignored (A-24).
- **Progress wording:** "Not tried yet / Just starting / Getting stronger / Growing — keep practicing / Strong". No "weak" or "poor" anywhere in `js/`.
- **Accessibility:** Visible 4 px focus ring. Headings get focus when the screen changes. Number-pad display is `aria-live`. Choices use `aria-pressed`. Measured contrast of key colours is all ≥5.3:1: btn-go navy on coral end 5.32, primary 6.72, type badge 5.62, muted text 7.1+, feedback 7.3–8.2. Number-pad answer box is a `div` with `aria-label` and no role (A-25).
- **Broken things:** No console errors in any run. Division opens to an all-"Coming soon" menu (shown as "Lessons on the way" on landing). That is acceptable but not "locked" (A-26).

---

## Findings

> **Developer pass (Agent 1, 2026-10-11):** all 26 findings were answered below. 25 are fixed, and A-26 was kept on purpose at the owner’s request. One extra issue found while fixing them (not in this audit) was also fixed: Match problems no longer use ×1 facts (“1 + 1 + 1 + …”). Tests after the fixes: `npm test` 68/68, `npm run test:browser` 604/604.

Severity counts: **Critical 1 · High 2 · Medium 11 · Low 12** (26 total)

### A-01: Critical: "Check the work" hint gives wrong arithmetic for ×1 facts
- **Area:** Question bank, type J hints
- **Finding:** Hint 2 always says "use a fact you know (like a × (b−1), then add a)" but clamps b−1 to 1. When b = 1 it prints, for example, "like 7 × 1 = 7, then add 7". That gives 14, but 7 × 1 = 7. A child following the hint gets the wrong product and may then reject a correct claim.
- **Evidence:** `js/mult-bank.js:135` (`Math.max(1, b - 1)`). Probe output: `Eli says 7 × 1 = 7. Is Eli right? :: Skip-count by 1s, 7 times, or use a fact you know (like 7 × 1 = 7, then add 7).` This affects every J question whose second factor is 1, which is common in the 1s table and in ×1 facts from every table.
- **Recommended fix:** When b = 1, use a different strategy line ("a × 1 is just a"), or use (a−1) × b + b. Add a unit test that evaluates the hint's suggested computation.
- Developer response: **Fixed.** The hint now says “Anything times 1 stays the same: a × 1 is just a” when b = 1, “1 × b is just one group of b” when a = 1, and otherwise “Use a fact you know: a × (b−1) = …. Then add one more a.” A unit test checks that hint 2 does correct arithmetic for every J question, all facts 1–12 (`tests/bank.test.mjs`, “A-01”).
- Retest result: _pending_

### A-02: High: With default settings no Test ever counts toward mastery
- **Area:** Test / Progress
- **Finding:**
  - The defaults are 10 questions across tables 1–10, so each table gets 1 question. Mastery needs ≥5 per table, so a child using the app as shipped can never master a table, and Progress shows "0/10 core tables mastered" indefinitely.
  - The child's Test start screen gives no hint of this. Only Parent Settings and the per-table "needs 5+ questions" note on the results screen show it.
  - Even the largest test (36 questions) covers only 7 tables, so mastering all 10 core tables needs several parent reconfigurations.
- **Evidence:** `js/app.js:57` (defaults `count 10`, `families CORE`). `js/mult-math.js:201` (`masteryTableLimit(10) = 2`). Probe output: `mastery limit 10q: 2 20q: 4 36q: 7`. Screenshots `320x640-settings.png` ("Practice test: … will not count toward mastery") and `320x640-test-results.png` (every row "needs 5+ questions").
- **Recommended fix:** Make the default test count toward mastery (for example, 10 questions on 2 tables, or a "mastery test" that rotates tables automatically). Show "This test counts / is practice" on the Test start screen.
- Developer response: **Fixed.** Test tables now default to **Automatic**: each test covers as many tables as can get 5+ questions (10 → 2, 20 → 4, 36 → 7). It starts with tables that have one passing test, then the lowest unmastered tables, and moves on as tables are mastered. The child’s Test screen says “⭐ This test can help you master these tables” or “This is a practice test.” Parents can switch to “I choose” in Parent Settings, which keeps the live mastery note. Browser checks: “default test can count toward mastery (A-02)” and the settings checks.
- Retest result: _pending_

### A-03: High: At 320×640 a wrong answer and requested hints appear off screen
- **Area:** Practice / Teach question layout (mobile)
- **Finding:** On a phone-sized screen:
  - The hint box and feedback sit below the Check button.
  - After a wrong first try, the number pad clears and "Not quite — try again. Read the help above." (and the clue) render below the visible area.
  - Pressing 💡 Hint changes only the button label.
  
  A child sees the answer vanish with no message. The message text "help above" is also wrong for this layout, because the help is *below*. The page scrolls only after the final answer (`finish()`).
- **Evidence:** Measured at 320×640: hint box top = 684 px and feedback top = 780 px, with viewport height = 640 and scrollY = 0. Screenshot `320-practice-after-wrong-viewport.png` shows no message visible. Code: `js/app.js:184-198` (layout), `js/app.js:210-216` (`revealHints` never scrolls), `js/app.js:249-255`. At 390×844 the feedback lands at about 700 px, so it is visible.
- **Recommended fix:** Scroll the feedback and hint box into view on every miss and hint (as `finish()` does), or place the feedback above the number pad on narrow screens. Change the message to "Read the help below" or make it position-neutral.
- Developer response: **Fixed.** After every miss and every Hint tap, the feedback area scrolls into view when it is below the screen. A short status line also appears right under the answer box (“Not quite. Try again. Help is below.” / “💡 Help is below.”). The message no longer says “above”. A browser check at all six viewports confirms that the message is on screen after a miss (“after a miss the child can see a message (A-03)”; screenshot `practice-miss-320`).
- Retest result: _pending_

### A-04: Medium: Missing-factor strategy hint shows the answer as a count of jumps
- **Area:** Hints, type B
- **Finding:** Hint 2 draws a number line with exactly `answer` hops (each labelled "+7", for example). Counting the arcs gives the missing factor without any reasoning. A child can press Hint twice before even trying.
- **Evidence:** `js/mult-bank.js:180` (`jumps: q.answer`). The probe flagged 9,760 of 9,760 B questions. Screenshot `320x640-practice-missing-hints.png` (`? × 7 = 42` with 6 arcs).
- **Recommended fix:** Show the jumps only part of the way (for example, the first 2–3), as the text hints already do with `countStart`. Or show the number line to the product without the hops.
- Developer response: **Fixed.** The strategy picture now shows only the first one or two jumps (“Here is how it starts”), never the full count. A unit test checks that the picture has fewer jumps than the answer for every fact.
- Retest result: _pending_

### A-05: Medium: Feedback says "This was a Arrays problem"
- **Area:** Lab feedback grammar
- **Finding:** `typeLine` hard-codes "a" before plural type names. It produces "a Arrays", "a Equal groups", "a Fact families", "a Word problems", "a Equal products" and "a Multiplication facts". Children read this after every Lab answer.
- **Evidence:** `js/app.js:219`. Measured feedback text: "…There are 9 dots.This was a Arrays problem." There is also no space before "This", because the text is joined directly.
- **Recommended fix:** Use a phrasing such as "Kind of problem: **Arrays**", or add a singular display name for each type.
- Developer response: **Fixed.** The feedback line now reads “Kind of problem: **Arrays**” as its own paragraph.
- Retest result: _pending_

### A-06: Medium: The Lab is mostly Practice without hints; for a new child it is only "compute a × b"
- **Area:** Math Thinking Lab design
- **Finding:**
  - The Lab draws from the same generator and the same items as Practice. Practice already mixes all 12 types (A-08).
  - A new child's Lab is limited to the starter types: facts, groups, arrays and repeated addition. All four are direct product computation, so the "Make me think" activity starts as the least thinking-oriented mix.
  - There are no Lab-only reasoning items (explain why, which strategy is better, multi-step).
- **Evidence:** `js/mult-bank.js:26` (STARTER_TYPES), `js/app.js:477`, `js/app.js:494`. Lab setup shows "4 of 12" for a new child.
- **Recommended fix:** Start the Lab with at least one reasoning type (G or D, which are low-risk). Consider Lab-only formats (for example, "Which way would you use?" or "Is this always true?"), or harder variants of the same type.
- Developer response: **Fixed in part.** The Lab’s starter kinds now include two reasoning kinds, Switch the order and Match the equation (6 starters). A new child’s Lab therefore mixes reasoning with computing. The Lab still differs from Practice by mechanics: no hints, one try, the kind is not named before answering, report by kind, recommended lessons. Lab-only formats (“which way would you use?”) are noted as a recommendation for a later milestone (see STATUS.md).
- Retest result: _pending_

### A-07: Medium: Submit/Check is below the fold at 320×640 for several types
- **Area:** Mobile layout
- **Finding:** The bottom of the Check/Submit button is beyond 640 px for picture and longer questions, so the child must scroll to submit.
- **Evidence:** Measured bottom of `#qCheck`: array 9×8 = 777, compare = 649, match = 649, missing = 622 (fits). Practice first question = 649 or more. Screenshots: `320x640-lab-array-q.png`, `320x640-lab-compare-q.png`.
- **Recommended fix:** Make the number pad smaller or two-column, or the answer row sticky, on short viewports. Cap array picture height at narrow widths.
- Developer response: **Fixed.** On phones shorter than 700 px, the brand bar is hidden during activities (Exit and the heading stay). Pictures, the number pad (44 px keys) and the prompt are more compact. The browser suite now checks that Submit is fully on screen for all 12 kinds at all six viewports, **including 320×640**.
- Retest result: _pending_

### A-08: Medium: Default Practice serves grade-4 "Times as many" and stretch types to every child
- **Area:** Practice content / grade level
- **Finding:** Practice calls `makeSet` without `types`, so all 12 types are used. Over 500 simulated default sessions each type made up about 1/12 of problems, including K (multiplicative comparison, a grade-4 standard) and L. The Practice badge shows "Times as many" with no challenge label, unlike the lesson title. This also contradicts the cautious Lab unlocking.
- **Evidence:** `js/app.js:435`. `js/mult-bank.js:205`. Probe: `compare: 417 / 5000`. Screenshot `320-practice-after-wrong-viewport.png` (question 1 of a fresh practice is a K problem).
- **Recommended fix:** Apply the same unlock rule (or "core types only") to Practice by default. Label K as "challenge", or add a parent toggle.
- Developer response: **Fixed.** Practice uses the 9 core kinds (difficulty 1–2). The challenge kinds (J Check the work, K Times as many, L Equal products) join only after their Teach lesson is finished. “Times as many” is labelled “(challenge)” everywhere it is named. The parent option “All 12 kinds now” covers both Practice and the Lab.
- Retest result: _pending_

### A-09: Medium: The Lab's "as they learn them" unlock is bypassed through Practice
- **Area:** Lab unlock rule
- **Finding:** A type unlocks after it has been tried 3 times in Practice. Because Practice serves all 12 types (A-08), about 3 ordinary 10-problem practices unlock every type, including "Times as many", without any lesson. "Tried" counts attempts, not success.
- **Evidence:** `js/mult-bank.js:249-252`. `js/app.js:445` (`recordPracticeAnswer` counts every attempt).
- **Recommended fix:** Unlock on lesson completion, or on N correct answers (not attempts) in Practice. Keep K behind its lesson.
- Developer response: **Fixed.** Practice unlocks a Lab kind only after **3 right first-try answers** (not attempts). Challenge kinds unlock only through their lesson. Covered by unit tests.
- Retest result: _pending_

### A-10: Medium: "Equal products" (L) is tied to a lesson that barely teaches it
- **Area:** Teach ↔ question bank mapping
- **Finding:** Type L ("4 × 6 = 8 × ?") maps to the "Multiplication equations" lesson. That lesson teaches factor and product vocabulary, and has only one sentence on "4 × 6 = 3 × 8 is true". None of its guided or check questions is an equal-products item. Completing it unlocks L in the Lab, and missing L recommends it.
- **Evidence:** `js/mult-bank.js:23`. `js/mult-lessons.js:114-139`.
- **Recommended fix:** Add a worked example and a check question on balancing both sides, or create a dedicated short lesson.
- Developer response: **Fixed.** The Equations lesson explains equal products in its own sentence (“The = sign can sit between two multiplications too…”). Its third check question is now an equal-products item (“Make both sides equal: 2 × 6 = 3 × ?”), and its explanation shows both arrays.
- Retest result: _pending_

### A-11: Medium: Lab Exit discards the whole session in one tap without warning
- **Area:** Lab controls
- **Finding:** "✕ Exit" during a 25- or 50-problem Lab immediately leaves, and nothing is saved: no report, no misses, no session. Test Quit asks for a second tap, but the Lab does not.
- **Evidence:** `js/app.js:499` (plain `data-nav`). Browser check: after starting a Lab and pressing Exit, `labSessions` = 0.
- **Recommended fix:** Use a two-tap confirmation as in Test. Better still, offer "Finish now and see my report" so the answered problems count.
- Developer response: **Fixed.** Exit now asks first and offers three buttons: “Finish now and see my report” (answered problems count), “Keep going” and “Leave without saving”. Browser checks cover all three.
- Retest result: _pending_

### A-12: Medium: Recommended lessons ignore difficulty when misses are tied
- **Area:** Lab report
- **Finding:** Recommendations are sorted by miss count only. Ties keep insertion order, so they follow question order. A child who missed one of each type (a common pattern in a 10-problem Lab) can be sent to "Times as many (challenge)" before "Equal groups".
- **Evidence:** `js/app.js:518`. Screenshot `320x640-lab-report.png` (recommends Equal groups, Times as many (challenge), Pictures…), and `1366x768-lab-report.png`.
- **Recommended fix:** Break ties by type difficulty and lesson order (foundational first). Consider never recommending the challenge lesson while core lessons are unfinished.
- Developer response: **Fixed.** Recommendations are sorted by number of misses, then by difficulty (foundational first), then by lesson order.
- Retest result: _pending_

### A-13: Medium: Match-explanation picture does not match the equation for 11×11, 11×12 and 12×12 (extension)
- **Area:** Visuals
- **Finding:** When both factors are greater than 10, the non-picture Match explanation draws `Math.min(g, 10)` groups. For "12 × 12" it shows 10 groups of 12 under text saying 12 is added 12 times.
- **Evidence:** `js/mult-bank.js:65`, `js/mult-bank.js:77`.
- **Recommended fix:** Use an array (rows = g) when g > 10, or omit the picture.
- Developer response: **Fixed.** Match explanations use an array (rows = groups) when there are more than 10 groups. A unit test checks that the picture’s total equals the product for 11×11, 11×12 and 12×12.
- Retest result: _pending_

### A-14: Medium: Distractors and claims bring in ×11 numbers when the extension is off
- **Area:** Question bank range
- **Finding:** With core-only settings, these items still show 11s and products over 100:
  - Match options such as "11 × 10"
  - Fact-family options such as "1 × 11 = 11" and "10 × 11 = 110"
  - Check-the-work claims such as "2 × 10 = 22" (with the explanation "22 is 2 × 11")
  
  These are not wrong math, but they fall outside the range the parent selected.
- **Evidence:** `js/mult-bank.js:70`, `js/mult-bank.js:112`, `js/mult-bank.js:122`. Probe (extension off): match 12, family 117 and error 93 distinct items mention ×11. Example: `Which fact is in the same family as 10 × 10 = 100? [10 + 10 = 20 / 10 × 11 = 110 / 100 ÷ 10 = 10]`.
- **Recommended fix:** When `maxFactor` is 10, use b−1 instead of b+1 for b = 10 (and similar), and pass `maxFactor` into these branches.
- Developer response: **Fixed.** Distractors and wrong claims stay within the chosen range (a nearby factor is n − 1 when n + 1 would pass the limit). A unit test checks every kind × every core fact with extension off: no factor above 10 and no number above 100 in any prompt or option.
- Retest result: _pending_

### A-15: Low: Awkward phrasing in explanations ("Adding 4 7 times", "There are 4 added 7 times")
- **Area:** Content wording
- **Finding:** Two numbers sit side by side and are hard to parse for 8-year-olds.
- **Evidence:** `js/mult-math.js:142` (repeated explanation). `js/mult-bank.js:72`, `js/mult-bank.js:77` (match explanation). Probe sample: "Adding 4 7 times is 7 × 4."
- **Recommended fix:** "Adding seven 4s is 7 × 4" or "4 is added 7 times, so…".
- Developer response: **Fixed.** The wording is now “4 added 7 times is 7 × 4” and “4 is added 7 times, which is 7 groups of 4”.
- Retest result: _pending_

### A-16: Low: The Strategies lesson explanation is too dense for grade 3
- **Area:** Reading level
- **Finding:** One step lists 12 strategies as symbol shorthand ("**×3** double, then add one more group · **×4** double, then double again · …"). It also includes adult framing: "Third graders learn to multiply quickly with factors up to 10 (products within 100)."
- **Evidence:** `js/mult-lessons.js:217-221`.
- **Recommended fix:** Split it into a few short paragraphs or a table, and drop the curriculum sentence (it belongs in Parent Settings).
- Developer response: **Fixed.** The Strategies explanation is now short lines, one strategy each (×2, ×4, ×5, ×10, ×9, then splitting for ×3, ×6, ×7, ×8, then the extension line). The curriculum sentence was removed; it remains in Parent Settings.
- Retest result: _pending_

### A-17: Low: Adult wording on child screens
- **Area:** Lab report / Test results
- **Finding:** Some text on child-facing screens is written for adults:
  - "One challenge is a snapshot. Skills are marked 'Strong' only after several sessions."
  - "Speed: 0.1 s per correct answer (5 s timer). Speed is tracked separately from mastery."
  - "A table is mastered after 90% or better in two separate tests…"
- **Evidence:** `js/app.js:525`, `js/app.js:760`, `js/app.js:769`. Screenshot `320x640-test-results.png`.
- **Recommended fix:** Move these lines to Progress, or reword them for children.
- Developer response: **Fixed.** The adult lines are gone from the Lab report and Test results. Speed now reads “You answered in about 2.1 seconds each.” The rules (“Strong” after 10+ problems in 2+ sessions; mastery = 90% in two separate tests) are on the Progress page.
- Retest result: _pending_

### A-18: Low: Fact family with equal factors makes the prompt itself the answer
- **Area:** Type H
- **Finding:** For squares, the correct option can be `b × a = p`, which is identical to the given fact ("Which fact is in the same family as 3 × 3 = 9?" → "3 × 3 = 9").
- **Evidence:** `js/mult-bank.js:109`.
- **Recommended fix:** For a = b, always use the division member.
- Developer response: **Fixed.** For squares, the fact-family choice always uses the division member. Covered by a unit test.
- Retest result: _pending_

### A-19: Low: Number-line hint pictures are tiny at 320 px
- **Area:** Visuals (mobile)
- **Finding:** The 520-wide jumps SVG scales down to about 240 px, and the "+7" hop labels become about 5 px tall and unreadable.
- **Evidence:** Screenshot `320x640-practice-missing-hints.png`. `js/visuals.js:61`.
- **Recommended fix:** Set a minimum font size, or reduce the SVG width for few jumps.
- Developer response: **Fixed.** Number lines with few jumps are drawn narrower (240–520 px wide), and labels are larger (16 px / 15 px), so they stay readable when shrunk on phones.
- Retest result: _pending_

### A-20: Low: Test results at 320 px: tally label overflows and the Mastery column is cut off
- **Area:** Mobile layout
- **Finding:** "unanswered" runs out of its tally box. The Mastery column ("needs 5+ questions") is cut off and needs a hidden sideways scroll inside `.table-wrap`.
- **Evidence:** Screenshot `320x640-test-results.png`. `css/galaxy.css:254`, `css/galaxy.css:384`.
- **Recommended fix:** Use smaller tally labels at narrow widths, and shorten the mastery note (for example, "need 5+").
- Developer response: **Fixed.** Tally labels are smaller and wrap at ≤420 px. The table columns are now “Table · Right · % · Star”, with the short notes “⭐ counts” / “not yet” / “–”.
- Retest result: _pending_

### A-21: Low: Repeated-addition prompt reveals its structure before answering (also in the Lab)
- **Area:** Lab "no strategy before answering"
- **Finding:** C questions print "That is 7 groups with 4 in each group." under the sum. This turns the item into an equal-groups item and tells the child the multiplication structure in the Lab.
- **Evidence:** `js/mult-bank.js:58`.
- **Recommended fix:** Drop the sub-line in the Lab (it can stay as a Practice hint).
- Developer response: **Fixed.** The “That is 7 groups with 4 in each group” line now shows in Practice only, as support. It is hidden in the Lab (browser check: no `.q-sub` in the Lab before answering).
- Retest result: _pending_

### A-22: Low: Word-problem and times-as-many hint 2 hand over the equation
- **Area:** Hints
- **Finding:** "There are 4 groups with 7 in each. Multiply 4 × 7." and "Multiply: 7 × 4." remove the modelling step that these types exist to practise.
- **Evidence:** `js/mult-bank.js:185`, `js/mult-bank.js:152`.
- **Recommended fix:** Ask the child to name the groups and the size ("How many groups? How many in each?") together with the picture, and keep the equation for the explanation.
- Developer response: **Fixed.** Word-problem hint 2 asks the child to find the groups and the size using the picture. Times-as-many hint 2 points at the bars. Neither states the equation, which stays in the worked explanation. Covered by a unit test.
- Retest result: _pending_

### A-23: Low: Choice questions in Practice allow 2 tries with only 3 options
- **Area:** Practice
- **Finding:** After one wrong pick, the second try is a 50/50 guess, so "You got it!" can be reached by elimination. First-try scoring is still correct.
- **Evidence:** `js/app.js:444` (`tries: q.format === 'choice' ? 2 : 3`).
- **Recommended fix:** Use 1 try plus an explanation for choice questions, or add a 4th option.
- Developer response: **Fixed.** Choice questions in Practice now have one try, then the answer and explanation. The Hint button is still available before answering.
- Retest result: _pending_

### A-24: Low: 11s and 12s can be selected while the extension is off, and are silently ignored
- **Area:** Parent Settings
- **Finding:** Selecting only "11" with the extension off quietly falls back to tables 1–10.
- **Evidence:** `js/app.js:63` (`usableTables`). `js/app.js:113` (11 and 12 always clickable).
- **Recommended fix:** Disable 11 and 12 while the extension is off, or turn the extension on when they are picked, with a note.
- Developer response: **Fixed.** The 11, 12 and “All 1–12” buttons are disabled while the extension is off, and they enable as soon as it is turned on. A browser check covers this.
- Retest result: _pending_

### A-25: Low: The answer box is not an input for assistive technology
- **Area:** Accessibility
- **Finding:** `#qAnswer` and `#tAns` are `div`s with `aria-label` and `aria-live` but no role. Typing works only through a document-level keydown handler. Screen-reader users get no editable field, and mobile users cannot use the system keyboard (they use the on-screen pad, which works).
- **Evidence:** `js/app.js:190`, `js/app.js:171`.
- **Recommended fix:** Add `role="textbox" aria-readonly="true"` or `role="status"`, and describe the pad as the way to enter answers. This is acceptable for the target age group but should be noted.
- Developer response: **Fixed.** Both answer displays have `role="textbox" aria-readonly="true"` and the label “Your answer (use the number keys)”. Physical keyboards still type directly.
- Retest result: _pending_

### A-26: Low: Division is "open" to an all-Coming-soon menu rather than locked
- **Area:** Landing / registry
- **Finding:** The landing card says "Lessons on the way →" and opens a menu where all 5 activities say Coming soon. That is harmless, but a child tapping it gets nothing to do.
- **Evidence:** `js/registry.js` (Division `status: 'open', ready: []`). Browser check: menuSub = "Division lessons and cards are being built. Check back soon!"
- **Recommended fix:** Optional: show it as Coming Soon like Addition, or keep it as is if this is intended.
- Developer response: **Kept on purpose (declined).** The owner asked that Division keep its existing navigation state: the menu opens and every activity says Coming soon. Division development has not started. This will be revisited when Division begins.
- Retest result: _pending_

---

## What works well (for balance, verified)

- Answer keys are correct across all 107,920 generated questions. Distractors in D and G never include the turned-around fact. Fact-family distractors are always true facts with different numbers.
- Timers are cleaned up on every exit, and flashcard timing is exact (5 s reveal, 2 s hold).
- Test scoring is correct: unanswered counts, speed comes from timed correct answers only, and retries never count toward mastery.
- Progress keeps understanding, practice, reasoning and tests separate. Its wording is constructive. v1 migration and blocked storage work.
- No horizontal page overflow at any of the six required viewports. The desktop layouts are clean.
