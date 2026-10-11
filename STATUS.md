# Galaxy Math — Development Status

Updated: 2026-10-11 (branch `feature/division`, built on `feature/galaxy-math-foundation`; not merged to `main`). Addition and Subtraction have **not** been started.

## Division 1.0 (2026-10-11)

Division now has the same five activities as Multiplication. It uses the same screens and design: a subject profile in `js/app.js` swaps the fact engine, the question bank, the lessons and the wording.

**What is in it**
- **Teach:** 15 lessons in order, each Goal → Explanation → See it → Worked example → Try it together → Check yourself → Finish.
  - The lessons teach dividend, divisor and quotient, and the division bracket.
  - Remainders come only in the last lesson, *Leftovers (extension)*. Every other problem divides exactly.
- **Practice:** 10 mixed problems with step-by-step help: a clue, then a picture, then a worked explanation. Practice my misses is included.
- **Math Thinking Lab:** 10, 25 or 50 problems. The report shows accuracy, right/wrong/skipped, results by kind of problem, missed problems with explanations, recommended lessons and Practice my misses.
- **Flashcards:** the child picks a divisor (÷1–÷10, or Mixed). The answer shows after 5 seconds, or sooner with a tap. Pause, I'm done and a summary are included.
- **Test:** 10, 20 or 36 questions, timed or untimed, with automatic or chosen families. There are no hints. Results count correct, incorrect and unanswered.
- **Families:** ÷1 to ÷10 are core; ÷11 and ÷12 are an extension.
- **Question bank:** `js/div-bank.js` has 12 kinds (A–L); `js/bank-kit.js` holds the logic shared with Multiplication.
- **Progress:** v3 keeps Multiplication and Division apart. Older saved data is kept as Multiplication progress, and resetting one subject never touches the other.
- **Settings:** each subject has its own Parent Settings.

**Independent educational QA:** a separate subagent wrote `docs/review/division/DIVISION-AUDIT.md`.
- **How it checked:** it generated about 108,000 questions in Node, and reviewed the code and the screenshots in `docs/review/division/shots` (23 screens at each of the six widths, 138 in all).
- **Math checks:** no question divides by zero, every answer is right, every picture matches its numbers, every choice question has exactly one right option, and sharing and grouping are kept distinct.
- **First pass:** 0 Critical, 1 High, 9 Medium, 8 Low.
  - The High was D-01: the sharing hint said "every group got 2" even when the answer was 1.
- **Fixed:** D-01–D-09 and D-12–D-16.
- **Recheck after the fixes:** 0 Critical, 0 High. Verdict: release-ready.
- **Still open:** these are in the audit report.
  - D-10 Medium, partly fixed: at 320×640 the 100-dot sharing and grouping pictures are still small. Submit stays on screen.
  - D-11 Low: the grouping pile is laid out in rows of 10.
  - D-17 Low: the equation and the bracket use different colours for the same part.
  - D-18/D-19 Low: on phones the Progress status pills wrap onto more than one line.

**Tests**

| Suite | Chrome | Edge |
|---|---|---|
| Unit tests (`npm test`) | 88/88 | — |
| Division browser suite (`tests/browser-division.test.mjs`) | 180/180 | 180/180 |
| Multiplication regression suite (`tests/browser.test.mjs`) | 656/656 | 654/654 |

- **Division suite coverage:** every Division screen at the six viewports; completing all 15 lessons; a failed check does not complete a lesson; Practice hints and misses; Lab 10/25/50 and its report; flashcard timing; Test scoring and mastery; Progress persistence and per-subject reset; navigation and timer cleanup.
- **Phone layouts:** 48 worst-case checks (share 100 by 10, group 100 in tens, a 10×10 array, the longest story, 10 groups of 10, Who is right?) keep Submit on screen at 320, 375, 390 and 768.
- **Multiplication count:** its check count varies slightly because some checks depend on the generated problems.
- **Devices:** all of this is headless-browser viewport simulation. **No real phones or tablets were used.**

## UI redesign — approved and live (2026-10-11)

The owner approved the merge and publication. `review/ui-redesign` was merged into `feature/galaxy-math-foundation` as `1d96297`, then published to `gh-pages` as `6b2dcdb` with `npm run publish:pages`. The Pages build finished, and all 11 app files on the public URL match the commit byte-for-byte. The **live browser suite passed 658/658** at https://bazeocrisy.github.io/Galaxy-Math/. `main` is untouched. The history of the review is kept below.

### Review history (before approval)

The owner did not approve the 2.0 interface ("small administrative forms floating on a large galaxy background"). This branch holds a focused visual redesign for review. The live testing site still runs the approved 2.0 build (`gh-pages` `330b045`). Nothing from this branch has been published, and `main` is untouched.

**What changed (look only; no educational feature was removed):**
- **Activity screens** (Practice, Lab, Test) are a full-width learning workspace with one header row: Exit · title · question count · progress.
  - The problem and its picture are large on the left; the answer dock (answer box, number pad, buttons) is in the same place on the right in all three.
  - Phones stack them in the order problem → picture → answer → feedback. Tablets (≥ 700 px) get the side-by-side layout.
  - Pictures scale with the space (capped on phones so Submit stays on screen). After answering, the pad folds away and the right answer shows in the box.
- **Long sums** wrap only between "6 +" groups. "Match the equation" shows its sum as a separate large line. Equations inside sentences never split across lines.
- **Teach:** an "Up next" card plus three collapsible units (What multiplication means · Facts and equations · Use it and check it) instead of 13 tiles. Lessons have a labelled stepper and larger text and pictures, and lesson expressions are shown big.
- **Flashcards:** tapping a table starts right away. Controls are 👀 Show answer, ⏸ Pause and ✓ I'm done (on phones, Show answer gets its own row).
- **Start screens:** Test and Practice start screens are full-width heroes with large chips ("10 questions", "the 1s and 2s", "5 seconds each") and a big Start button.
- **Parent Settings:** four spaced cards (Times tables · Practice and Lab · Flashcards · Test) with plain-language explanations.

**Review evidence:**
- Screenshots: `docs/review/ui-redesign/before` and `after`, 21 screens × 6 widths (320, 375, 390, 768, 1280, 1366), 126 each. The side-by-side gallery is `docs/review/ui-redesign/README.md`, generated by `node tests/review-shots.mjs <dir>`.
- Independent visual review: `docs/review/ui-redesign/UX-REVIEW.md`. The auditor (a separate subagent) inspected every "after" screenshot.
  - First pass: 3 High, 11 Medium, 8 Low.
  - After fixes and re-inspection: 0 Critical, 0 High open.
  - The re-review then found 4 new problems (V-23–V-26), which have been fixed. The auditor has not re-inspected those four fixes.
- Tests on this branch:
  - `npm test` 69/69.
  - `npm run test:browser` 655/655 in Chrome and 655/655 in Edge. This includes 48 new deterministic worst-case checks (10×10 array, 10 groups of 10, long word problem, long sum, long match, times-as-many) that keep Submit on screen at 320, 375, 390 and 768.

**Open items (all Medium or Low, recorded in UX-REVIEW.md):**
- Some empty space remains in the left half of desktop panels (V-06), and at 768 the lower part of the screen stays empty in portrait (V-07).
- At 320×640 the guided-lesson Check is close to the bottom edge (V-01, now Medium).
- Number-line labels are small on 320-px phones (V-25).
- On ≤420-px phones Practice hides its kind-of-problem badge so Submit stays on screen.
- The Progress page was not redesigned (V-19).

**Next step (done):** owner approved; merged, published and verified live (see above).

## Multiplication 2.0: summary

The Multiplication menu has five activities that share one design:
- **Teach** (Show me how)
- **Practice** (Let me try)
- **Math Thinking Lab** (Make me think)
- **Flashcards** (Help me remember)
- **Test** (Show what I know)

**Parent Settings** and a **Progress** page sit behind "For grown-ups" links. Every problem comes from one validated question bank of 12 kinds (A–L). An independent auditor (a separate Claude Code subagent) reviewed the build. All Critical and High findings were fixed and then verified by the auditor (see `AUDIT-REPORT.md`).

### Acceptance checklist

| Requirement | Status | Evidence |
|---|---|---|
| All five activities are functional | ✅ | Browser suite walks through each one (Chrome and Edge) |
| Existing question types are preserved | ✅ | Facts, missing factor, equal groups, arrays, repeated addition and word problems use the original generators, wording and pictures (`js/mult-bank.js` wraps `js/mult-math.js`) |
| Lab supports 10, 25 and 50 problems | ✅ | Browser checks start each size; unit tests check exact size, balance and no repeats |
| Teach explains the reasoning | ✅ | 13 lessons: Goal → Explanation → See it → Worked example → Try it together → Check yourself → Finish; all 13 completed through the UI |
| Practice uses varied representations | ✅ | ≥6 kinds per 10-problem session (checked); progressive help: clue → strategy with a picture → worked explanation |
| Flashcards have a simple child interface | ✅ | Child picks a table (or Mixed) → Start; Show answer, Pause, I'm done; timing in Parent Settings |
| Test scoring is accurate | ✅ | 8 correct / 1 incorrect / 1 unanswered → 80%; unanswered counts; mastery = 90% in two separate tests; unit tests |
| Parent Settings hold the advanced options | ✅ | Tables, 11s/12s extension, problems per practice, which kinds (Practice + Lab), flashcard reveal/hold/length/order, test questions/timer/tables (Automatic or I choose); saved locally; says plainly that it is not locked |
| Progress by fact family and by kind of problem | ✅ | Progress shows understanding, practice, Lab reasoning and tests separately; a table of the 12 kinds with constructive statuses; a times-table table with accuracy, test mastery and timed speed |
| Mobile and desktop layouts pass QA | ✅ (emulated) | 320×640, 375×812, 390×844, 768×1024, 1280×800, 1366×768: no horizontal overflow, no clipped text, touch targets ≥ 44 px, **Submit on screen for all 12 kinds at every size incl. 320×640**, long word problems. No real devices were available. |
| Auditor resolved all Critical and High findings | ✅ | A-01 (Critical) and A-02, A-03 (High) verified fixed in the retest |
| Live deployment verified | ✅ | 607/607 live browser checks; auditor live check passed (see Deployment) |
| GitHub contains final code, tests and docs | ✅ | feature branch on GitHub (this commit) |

## What changed in 2.0

**Question bank** (`js/mult-bank.js`). 12 kinds, A–L:
- A facts
- B missing factor
- C repeated addition, showing the number of groups and the size of each
- D match the equation
- E equal groups
- F arrays
- G switch the order (commutative)
- H fact families with ×/÷
- I word problems, short and long
- J check the work (error analysis)
- K times as many (multiplicative comparison, a grade-4 stretch labelled "challenge")
- L equal products (4 × 6 = 3 × ?)

Each kind has a stable ID, skill, difficulty and related lesson. Each problem has a prompt, answer, accepted format, distractors, picture, a clue, a strategy and a worked explanation. These rules are unit-tested over every fact 1×1–12×12:
- Distractors never include a second right answer.
- Fact-family distractors are true facts from other families.
- With core settings, no number goes above 10 × 10.

**Teach.** Three new lessons: Missing factors, Check the work, and Times as many (challenge). Fact families now teach ÷ as the reverse of ×. Equations now teaches equal products. Strategies is now short, readable lines.

**Practice.** One Start with 10 problems by default. It uses the nine core kinds; the challenge kinds join after their lessons. Help is progressive. Choice questions get one try (no guessing by elimination). Practice my misses brings back missed problems of the same kind, from Practice, the Lab or Tests.

**Math Thinking Lab** (new):
- Choose 10 (Quick Challenge), 25 (Thinking Workout) or 50 (Big Challenge). No timer, no hints, one try, and Skip is allowed.
- The kind of problem is never named or hinted before answering. It is shown with the explanation afterwards.
- Kinds join the Lab as the child learns them:
  - Six starter kinds, including two reasoning kinds.
  - Any kind whose lesson is finished.
  - Core kinds after 3 right answers in Practice.
  - The Lab setup screen shows the next lesson to unlock more. A parent override, "All 12 kinds now", is available.
- Report:
  - percentage, and correct / incorrect / skipped
  - results by kind of problem
  - missed problems with worked explanations
  - recommended lessons (most-missed and most basic first)
  - Practice my misses, and Start another challenge
- Exit asks first: Finish now (answered problems count), Keep going, or Leave without saving.

**Flashcards.** The child picks a table and taps Start. The answer shows after 5 s (2 s hold), or sooner with Show answer. Pause and I'm done are available. Everything else is in Parent Settings.

**Test.** One Start. Tables default to **Automatic**: tables that can each get the 5 questions mastery needs, rotating as they are mastered. The child's screen says whether the test can help master the tables.

**Progress v2.** Version-1 data is upgraded, not lost. The page shows:
- results by kind of problem (Practice and Lab separately)
- Lab sessions and recent missed problems
- a "Strong" status only after 10+ problems at 90%+ across 2+ sessions
- statuses that never say "weak" or "poor"

**Layout.** A single question layout on every activity:
- Phones: progress → problem → picture → answer → feedback.
- Desktop: the picture sits beside the answer area.
- Short phones (≤ 700 px tall) use a compact layout.
- After a miss, the help scrolls into view and a status line appears by the answer.

## Independent audit (Agent 2)

`AUDIT-REPORT.md` holds the 10-question checklist, 29 findings (each with evidence, recommended fix, developer response and retest result) and the retest summary.

- **First audit (`6e1a185`):** 1 Critical, 2 High, 11 Medium, 12 Low.
- **Retest (`6f3f607`):**
  - 25 verified fixed.
  - 1 partly fixed: A-06. The Lab still uses the same question bank as Practice, and Lab-only formats are a recommendation for later.
  - 1 declined and accepted by the auditor: A-26 (Division menu kept as instructed).
  - No Critical or High findings open.
- **New Lows from the retest:** A-27 and A-29 fixed and verified; A-28 partly fixed and accepted as a Low.

## Tests (run 2026-10-11)

- `npm test`: **69/69** unit tests.
  - Question bank: all kinds × all facts, independent answer checks, distractor rules, range, hints, sessions, unlock rules, statuses.
  - Lessons, progress v1→v2, blocked storage, plus the audit regression tests.
- `npm run test:browser` on this PC:
  - **Chrome 155.0.8059.39: 605/605.**
  - **Microsoft Edge 155.0.4283.45: 604/604.** A few checks depend on which problem comes first, which explains the one-check difference.
- Not available here: Firefox, Safari, and real iPhone/Android devices. All phone and tablet results come from viewport and touch emulation in Chrome and Edge.

## Deployment: live testing site (verified 2026-10-11)

- **URL:** https://bazeocrisy.github.io/Galaxy-Math/
- **Published:** feature commit `d433449` was merged into `gh-pages` as `330b045` with `npm run publish:pages` (no force-push). `gh-pages` differs from `d433449` only by `.nojekyll`. `main` was not touched.
- **Pages build:** `built` for `330b045` at 13:04 UTC. All 11 app files (`index.html`, `css/galaxy.css`, 7 scripts, logo, favicon) match the commit byte-for-byte.
- **Live browser suite** (Chrome, `LIVE_URL=…`): **607/607**, including "no failed requests" and "no page errors".
- **Auditor live check (Agent 2):**
  - deployed files identical to `d433449`
  - no missing assets and no JavaScript errors
  - all routes correct, including every locked `#/division/*` route
  - all five activities worked end to end at 390×844 and 1280×800
  - A-27 and A-29 verified; A-28 accepted as a partly-fixed Low
- **Open audit items:** none Critical or High. A-06 (Medium) and A-28 (Low) are partly fixed; A-26 (Low) is declined at the owner's request with the rationale accepted.
- This STATUS/audit update is a docs-only commit on the feature branch and was not re-published.

## Known limitations

- No real-device testing (iPhone Safari, Android Chrome); emulation only.
- The Lab uses the same question bank as Practice. Its difference is in the mechanics (no hints, one try, unnamed kinds, report, recommendations). Lab-only formats such as "Which way would you use?" or "Is this always true?" are recommended next.
- On 320-px-wide phones, after a second miss the picture can scroll partly out of view (A-28, reduced).
- "Times as many" is a grade-4 standard. It is kept as a labelled challenge and stays out of Practice until its lesson is done.
- Progress is per device and browser; no sync, by design.
- Lessons are text and pictures with no read-aloud.
- The Fredoka font comes from Google Fonts and falls back to a system font offline.
- `CLAUDE.md` mentions a `worksheets/` folder and a `LICENSE` file that do not exist.

## Recommendations before Division

1. **Real-device check** on the child's actual phone or tablet (and Safari if the family uses iPhone/iPad), especially 320–375 px screens.
2. **Use Multiplication for a week or two** and read the Progress page: which kinds stay at "Growing", and whether Automatic tests move through the tables.
3. **Lab-only reasoning formats** (A-06), e.g. "Which strategy would you use?" or "Is this always true?", before adding more topics.
4. **Read-aloud** (browser speech) for lesson text, if the child is still building reading fluency.
5. **Reuse the bank pattern for Division:** sharing / grouping / missing dividend / fact families already exist on the ÷ side (type H). The question-bank structure, Lab, Practice and Test screens can take a Division generator without new UI.
6. **Self-host the font** so the app works fully offline.
