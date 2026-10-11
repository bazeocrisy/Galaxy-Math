# Galaxy Math — Division 1.0 Independent QA Audit

Branch: `feature/division` · Auditor: independent QA / 3rd-grade math review · Date: 2026-10-11
No app code or tests were changed. Only this file was written.

## 1. Scope and method

**Code read in full:** `js/div-math.js`, `js/div-bank.js`, `js/div-lessons.js`, `js/visuals.js`, `js/bank-kit.js`; the
division-relevant parts of `js/app.js` (PROFILES, askQuestion/hints, Teach, Practice, Lab report, Flashcards, Test,
Parent Settings, Progress) and `js/progress.js` (v3 per-subject storage).

**Generated-question sampling (Node, scratchpad scripts, no browser):** every division fact for divisors 1–12 ×
quotients 1–10 (core, `maxFactor:10`) and 1–12 (extension, `maxFactor:12`), every one of the 12 kinds, 40 seeds each:
**108,600 generated questions**. Checks run on each:
- divisor never 0; number answers are whole numbers ≥ 1 and ≤ 3 digits (fits the number pad);
- core sessions never exceed 100 ÷ 10 / quotient 10;
- every picture (`share`, `grouping`, `groups`, `array`, `jumpsBack`) renders and matches the question numbers
  (total = dividend, groups/size = divisor, `dealt`/`circled` never exceed the total);
- every multiple-choice question: answer is among the options, options are distinct, at least 3 options, and an
  independent evaluator counts **exactly one** mathematically correct option (fact families: same three numbers;
  related: a multiplication using the divisor that makes the dividend; match: equals the quotient; who-is-right:
  true equation); no false equation is offered as a "fact";
- wording: hints that say "Here is/are…" but have no picture; singular/plural errors ("1 rows"); `undefined/NaN`.
- `makeSet` sessions for single families (÷1, ÷2, ÷10) — full length, no crash.

**Screenshots reviewed (Read tool):** all 23 screens at 390 and 1280; at 320: lessons 04–06 and Lab 09–17
(share-100, group-100, array 10×10, long story, picture match, who-is-right, missing divisor, feedback); at 768:
lessons 05–06 and Lab 09, 10, 17.

### What passed (verified, no finding)
- Divide-by-zero impossible (`generate` throws if divisor < 1; data model `dividend = fam × other`).
- 0 picture/number mismatches in 108,600 questions; sharing pictures always show *d* plates (groups known), grouping
  pictures always circle groups of *d* (size known); the two are labelled and drawn differently (plates vs rounded
  rings), and the "Sharing or grouping?" lesson contrasts them side by side.
- 0 multiple-choice questions with more than one correct option; the bank explicitly excludes `q × d` (related) and
  `p ÷ q` (picture match).
- Bank uses exact division only; remainders appear only in lesson 15 "Leftovers (extension)", flagged `extension`,
  shown last and labelled in the Teach list and Progress.
- Families 1–10 core, 11–12 extension (dashed buttons, "extension" badges, gated by the Parent toggle); story kinds
  limited to dividends ≤ 100.
- Lessons follow Goal → Explanation → See it → Worked example → Try it together → Check yourself → Finish; dividend,
  divisor, quotient and the bracket are taught (lesson 5) with clear labelled visuals at all widths.
- Practice: 3 tries for number questions with clue → picture hint → worked answer + picture; tone is
  "Not quite — try again", never discouraging. Lab report has %, correct/incorrect/skipped, by-kind table, missed
  problems with explanations, recommended lessons, "Practice my misses".
- Flashcards use "Divide by which number?", "÷7 flashcards", "÷7 family"; Test question shows "9 ÷ 1 = ?".
- Progress is stored per subject (`{ mult, div }`), division page shows "Division families ÷1…÷12", 15 lessons.
- Submit/Check reachable without scrolling on every phone screenshot; no horizontal overflow or clipping seen.

## 2. Findings

| ID | Severity | Location | Evidence | Recommended fix |
|---|---|---|---|---|
| D-01 | **High** | `js/div-bank.js:121` (`share` hint 2) | The second hint text is fixed: "Here is the sharing after two rounds: every group got 2. Keep dealing." When the quotient is 1 (e.g. 7 stickers shared by 7 friends) this is **false** — each group can only get 1 — and no picture is shown (`visual: null` when q ≤ 2). When q = 2 it states the answer outright with no picture. Sampling: 1,440 of the sampled share questions hit this. | Build the text from the visual: `dealt = Math.min(2, q - 1)`; if `dealt === 0` use a non-pictorial hint ("Give each of the d friends one. Are any left?"); otherwise "after {dealt} round(s) every group has {dealt}". Never claim a picture that is not drawn. |
| D-02 | Medium | `js/div-bank.js:129` (`group` hint 2), `:104` (`dfact` hint 2), `:146` (`subtract` hint 2) | Same pattern: "Here are the first 2 groups of 7, circled" when q = 1 (only one group exists) or q = 2, with no picture; `dfact` "Here is how it starts." with no picture when q = 1; `subtract` "Here are the first jumps back from 2" draws **0** jumps (`shown: Math.min(2, q-1)` = 0). 1,600 group + 800 subtract samples. | Same as D-01: derive count from what is drawn; fall back to a text-only hint when nothing would be drawn. |
| D-03 | Medium | `js/div-bank.js:115, 137–140, 147` | Singular/plural errors in ÷1 / quotient-1 facts: "These 2 dots are in **1 equal rows**", "There are **1 rows**", "each of the **1 rows** has 2 dots", "These **1 dots**", "**1 groups** of 1 make 1", "reaches 0 after **1 subtractions**". Reading-level/grammar issue a child sees every time ÷1 is practised. | Use the existing `plural()` helper for every count noun in these templates. |
| D-04 | Medium | `js/div-bank.js:217, 221` (`derror` explanation) | Explanation reads "Mia 5 × 1 = 5, too many; Ava subtracted instead of dividing." / "Leo 7 × 6 = 42, too many" — missing verb; a child cannot tell what Leo did or that 7 is the wrong *answer*. | e.g. "Leo said 7, but 7 × 6 = 42, which is too many." / "Ava subtracted (36 − 6) instead of dividing." |
| D-05 | Medium | `js/div-bank.js:157–162` (`dfamily` choice), `:212–214` (`derror`) | Guessable answer pattern. Fact-family distractors are `d·(q+1) ÷ d = q+1` and `d·(q−1) ÷ d = q−1`; who-is-right wrong claims are q+1 and q−1 (`slice(0,2)` drops the p−d claim unless q = 1). The correct option is therefore almost always the **middle number** of three consecutive values (screens `*-15-lab-who-is-right`: 7, 5, 6 → 6). A child can score without dividing. | Mix distractor types: one off-by-one, one "subtracted" (p − d), one "swapped" or other-family fact; vary which wrong claim is above/below. |
| D-06 | Medium | `js/div-bank.js:212` | The "subtracted instead of dividing" misconception (taught in lesson 14 "Find and fix mistakes") is generated in Lab/Practice only when q = 1, because the p − d claim is the third candidate and only two are kept. | Prefer `[p − d, q ± 1]` so the taught misconception is actually practised. |
| D-07 | Medium | `js/app.js:780, 865–866` (screens `390-20-test-start`, `1280-20-test-start`) | Child-facing Test wording leftovers: "⭐ This test can help you master these **tables**." and results "Accuracy by **table**" / column "**Table**". Owner requirement: division wording, no "tables" leftovers. | Add `testMasterText`, `byFamHeading`, `famColumn` to `PROFILES` ("these division families", "Accuracy by family", "Family"). |
| D-08 | Medium | `js/app.js:904, 925, 932, 935, 959, 974` (screens `*-22-parent-settings`, `*-23-progress`) | Parent Settings/Progress leftovers: "Which **tables**", "covers up to 2 **tables**… The **tables** change as they are mastered", "A **table** is mastered at 90%+", "…and **tables** mastered". Worse, the help text says "Practice uses the **nine** core kinds. Challenge kinds (check the work, **times as many, equal products**) join after their lesson" — factually wrong for Division (11 core kinds; the only challenge kind is "Who is right?"). | Move these strings into `PROFILES` and generate the core/challenge counts and names from `B.TYPES`. |
| D-09 | Medium | `js/div-bank.js:151` (`dfamily` number form), `:134–137` (`darray` "rows" form); `app.js:524/583` | When the parent chooses one family (e.g. "dividing by 6"), some questions divide by a different number: `6 × 7 = 42. So 42 ÷ 7 = ?`; "42 dots in rows of 7. How many rows?" (= 42 ÷ 7); with ÷1: "1 × 10 = 10. So 10 ÷ 10 = ?". These answers are also credited to the ÷6 / ÷1 family in Progress ("Accuracy (all activities)"). | Either accept this by design and record the question under the divisor actually used, or generate the "other member" form only when the other divisor is also in the selected families. |
| D-10 | Medium | `js/visuals.js:97–114, 116–129`; screens `320-09-lab-share-100`, `320-10-lab-group-100`, `390-09`, `768-09` | Large share/grouping pictures are too small on phones: at 320 px the 100-dot pile is ~55 px wide (dots ≈ 3 px) and the 10 plates ≈ 18 px; at 390/768 the share pile is still noticeably smaller than the grouping pile for the same total. Requirement: readable picture sizes. | For totals > 50, let the share figure grow to full width (or show the pile as tens-bars / "100 stickers" label), and size plates relative to the column width rather than the pile. |
| D-11 | Low | `js/visuals.js:126` / screens `*-10-lab-group-100` | Grouping pile is laid out in rows of 10; for "groups of 10" the loose pile already looks like 10 finished groups (identical to the 10×10 array screen), and for other sizes rows of 10 do not line up with the groups the child must make. | Use a scattered/irregular pile layout for grouping, or rows of 5. |
| D-12 | Low | `js/div-bank.js:203` (`dword` hint 1) | The skill is "Decide: sharing or grouping?", but the first hint immediately says "Here you know the number of groups (6)", i.e. makes the decision for the child. | First hint asks the question only; the second hint gives the classification + picture. |
| D-13 | Low | `js/div-bank.js:165` | When divisor = quotient (squares), the family hint repeats facts: "The family is 3 × 3 = 9, 3 × 3 = 9, 9 ÷ 3 = 3 and 9 ÷ 3 = 3." | For d = q say "This family has just two facts: 3 × 3 = 9 and 9 ÷ 3 = 3." |
| D-14 | Low | `js/app.js:156` vs. `rich(q.explain.text)` (screens `320-17`, `390-17`, `1280-17`) | Equations in feedback/explanations wrap mid-equation ("100 ÷ / 10 = 10", "10 × 10 = / 100") because the non-breaking-space treatment is only applied to prompts. | Apply the same `(\d) ([+=×÷−]) ` → NBSP rule to hint and explanation text. |
| D-15 | Low | `js/visuals.js:138` | Repeated-subtraction hint number line (labels off) labels only the start total, not the 0 the child is told to jump back to. | Always label 0 as well as the total. |
| D-16 | Low | `js/div-lessons.js:58, 318`; `js/div-bank.js:192` | Wording nits: "30 pencils are shared equally **by 5 tables**" (tables don't share; "among 5 tables"); "being **one group off** (24 ÷ 6 = 5)" (it is one too few *in each group*); picture-match says "24 **stars**" but draws dots. | Rephrase as suggested. |
| D-17 | Low | screens `*-05-lesson-bracket-see-it` | Quotient is coloured red in the ÷ equation but purple in the bracket (and "divisor" is purple in one, red in the other), weakening the part-to-part mapping the lesson teaches. | Use one colour per part across both representations. |
| D-18 | Low | screen `390-23-progress` | "Status" column is very narrow at 390; "Not tried yet" wraps to 4 lines per row, making the kinds table very long. | Allow the table to scroll or shorten to an icon/short label on narrow screens. |

## 3. Summary verdict

- Critical: **0** · High: **1** (D-01) · Medium: **9** (D-02 – D-10) · Low: **8** (D-11 – D-18)
- Mathematical core is sound: no divide-by-zero, all 108,600 sampled questions have correct answers, pictures that
  match their numbers, and exactly one correct choice; sharing vs grouping are distinct and correctly labelled;
  remainders are isolated in a labelled extension lesson; dividend/divisor/quotient and the bracket are taught.
- **Verdict: NOT release-ready** under the rule "Critical/High must be zero". D-01 shows a false statement ("every
  group got 2") in a hint for every quotient-1 sharing problem. It is a small, local fix. Recommended before release
  also: D-02 (same root cause), D-03/D-04 (grammar a child sees), D-07/D-08 (leftover "tables"/multiplication text,
  an explicit owner requirement), and D-05 (guessable middle-answer pattern in Lab choices).
