# Galaxy Math — Development Status

Updated: 2026-10-11 (branch `feature/galaxy-math-foundation`; not merged to `main`)

## Summary

**Multiplication is complete**: Teach, Practice, Flashcards, Test and a Progress page. Every acceptance step below was demonstrated by the automated browser suite. Division still shows its menu with all four activities locked, and Addition and Subtraction are Coming Soon. Division work has **not** started.

| Acceptance criterion | Demonstrated by (tests/browser.test.mjs) |
|---|---|
| 1. Open Galaxy Math | landing at 320–1366 px; four light cards, navy text, logo loads |
| 2. Select Multiplication | keyboard focus + Enter on the card opens the menu; all four activities ready |
| 3. Teach: complete a real lesson | Lesson 1 completed step by step: a wrong guided answer gets specific feedback, then the right answer; the check scores 2 of 3. **All 10 lessons** are then completed through the UI. A failed check (0 of 3) does **not** complete a lesson. Opening a lesson does not complete it. |
| 4. Practice with feedback | 10 questions from the 3s in ≥4 question types, no repeats. A miss gives a hint, then an explanation with a picture. Hint on request, review screen, Practice my misses. |
| 5. Flashcards with adjustable timers | 2 s reveal and 1 s hold measured; pause freezes the card and clock; previous/next; shuffle; tap mode with Space/arrow keys; summary; never starts a test; Test timer unchanged |
| 6. Independent Test | 2 s timed test: countdown measured; no hints or right/wrong shown during the test; a blank question auto-advances at 2 s; results are 80% with 8/1/1; 36-question and untimed (Skip) options; quitting needs two taps and is not saved |
| 7. Review missed questions | Test results list missed facts ("you answered 43" / "no answer"); Retry missed facts; the Practice review lists misses with explanations |
| 8. Return to the menu without broken navigation | Exit, Quit, the logo and browser Back from every activity; no timers left running (checked with the app's timer registry) |
| 9. Reopen the site and keep progress | after a reload, the Progress page shows the finished lesson, 3 tests, **6s mastered** (two separate 100% tests) and missed facts; the Teach list still shows "Completed" |

## Phases

### Phase 1 — Baseline audit (done earlier)
The original prototype's defects (countdown lost its first second, forced quiz after flashcards, flashcard speed overwrote the test timer, unvalidated storage, span buttons) were fixed in Phase 2. The prototype's flashcard engine has since been rebuilt (Phase D).

### Phase 2 — Landing page, logo, menus (done earlier)

### Phase A — Visual redesign (done)
- `css/galaxy.css` design system: color tokens (galaxy, light surfaces, navy text, AA-contrast accents), spacing and radius tokens, buttons (primary/go/secondary/ghost/danger), segmented controls, times-table picker, number pad, feedback boxes, badges, progress bars.
- Home: lavender (×), pink (÷) and grey (Coming Soon) cards with navy text and colorful symbols. Active cards say "Learn · Practice · Flash · Test →".
- Activity menu: cream / ice / lavender / pink cards.
- Flashcards keep the original purple-to-blue front and teal/purple/pink back with yellow answer, at about 440 px wide instead of 640 px. Tests use a separate white "assessment sheet" with a coral top edge.
- Practice, Flashcards and Test fit at 1280×800 and 1366×768 without scrolling (tested). Phones have no horizontal overflow (tested at 320, 390, 768).

### Phase B — Teach (done)
- Ten lessons (`js/mult-lessons.js`): equal groups, repeated addition, rows and columns, arrays, equations (factor/product), commutative property, fact families, strategies 1–12, word problems, connecting representations.
- Each lesson runs Objective + key words → Picture it → Worked example (steps revealed one at a time) → Try it together (hint, two tries) → Check yourself (3 questions, no hints, feedback after each) → Finish.
- A lesson is completed only with at least 2 of 3 right on the first try. Otherwise the child can retry the check or review the lesson.
- Pictures are generated SVG: equal groups, arrays (with split/faded rows for strategies), number-line jumps and labelled equations.
- Core vs extension: strategies for ×11 and ×12 are taught and labelled "Extension". Every guided and check question uses core facts only.

### Phase C — Practice (done)
- Choose tables (multi-select, All 1–12, Core 1–10) and 10/20/30 questions. Untimed.
- Six question types: fact, missing factor, equal groups, array, repeated addition, word problem. No identical question repeats unless the chosen facts run out of types.
- 💡 Hint on request. A first miss shows "Not quite — try again" with a hint; a second miss shows the answer and an explanation with a picture.
- Review screen with explanations and "Practice these again". **Practice my misses** uses facts missed in Practice or Test (two questions per fact, 4–30).

### Phase D — Flashcards (done)
- Choose tables; show the answer on tap or after 2/3/5/10 s; separate answer hold of 1/2/3/5 s; sessions of 3/5/10 min; shuffled or in order.
- Pause/Resume, Shuffle, Previous/Next, Flip, Finish, Exit. Keyboard: Space flips, arrows move, P pauses.
- Summary shows cards seen and time. Leaving early also saves the time. Flashcards never start a test or count toward mastery.
- Flashcard settings are stored separately from Test settings (tested).

### Phase E — Test (done)
- Compact assessment sheet with progress bar, problem with answer box, number pad (Clear, ⌫), Submit, and Skip (untimed only).
- 10/20/36 questions; untimed or 2/3/5/10 s per question. The deadline-based countdown refreshes every 0.1 s and freezes while the tab is hidden.
- Chosen tables share the questions evenly. The setup screen says whether a test can count toward mastery: each table needs ≥5 questions, so 10 questions → up to 2 tables, 20 → 4, 36 → 7.
- No hints and no right/wrong during the test. Results show percentage, correct/incorrect/unanswered (blanks count against the total), missed facts with the child's answer, accuracy by table with mastery notes, and speed for timed tests. Buttons: Retry missed facts (never counts for mastery), Retake test, Multiplication menu.

### Phase F — Progress (done)
- `js/progress.js` stores lessons, practice, tests (last 60), per-fact accuracy, missed facts and flashcard time under one versioned key, `galaxy-math.progress`. Corrupt or unknown data is replaced with safe defaults. If storage is blocked, everything works in memory and the Progress page says so.
- Mastery per table = 90%+ in two separate full tests with ≥5 questions from that table each time. Speed is shown separately and comes from timed tests only.
- Progress page for grown-ups covers summary, the times-table table (accuracy / mastery dots / speed, extension rows labelled), lessons, recent tests, facts to practice, milestones, and Reset (two taps).
- No names, accounts, analytics or network calls.

### Phase G — Testing (done; live verification below)

## Independent review (2026-10-11)

A separate reviewer read all the source code. Findings and outcomes:

| Finding | Outcome |
|---|---|
| Enter after tapping a number-pad key typed the digit again | **Fixed**: Enter on a pad key submits. Browser test added. |
| Lesson number lines showed the total (answer) before answering; the equation picture labelled the factors/product being asked about | **Fixed**: question pictures hide landing numbers; equation pictures appear only in feedback. Unit and browser tests added. |
| Practice hints for small first factors listed the answer; the repeated-addition hint picture showed the total | **Fixed**: skip-count hints stop before the answer; hint number lines are unlabelled. Unit test covers every fact 2–12. |
| Corrupt saved data could crash the menu | **Fixed**: unknown fact keys are dropped on load. Unit test added. |
| Timers kept running in a hidden tab | **Fixed**: flashcards pause; the test timer freezes. Browser test added. |
| "1 groups" / "added 1 times" grammar; "7 = ?" repeated addition for ×1 | **Fixed**: ×1 is pictured as 7 groups of 1, and repeated addition is skipped for ×1. Unit test added. |
| An extension fact (11 × 4) counted toward finishing the strategies lesson | **Fixed**: replaced with 9 × 6 (×10 strategy). Extension stays in the explanation. |
| Mastery impossible with default test settings (12 tables, 10 questions) | **Fixed**: tables share questions evenly, and setup explains when a test counts. |
| Practice-my-misses length inconsistent and repetitive | **Fixed**: one formula (2 per fact, 4–30). |
| Exiting flashcards discarded the session | **Fixed**: time is saved on any exit. |
| Test progress bar lacked aria values; hint button stayed active after the auto-hint | **Fixed** |
| Division menu can still be opened | **Kept on purpose**: the owner asked that Division keep its existing navigation state. All four activities stay locked. |

## Tests (run 2026-10-11 on this branch)

- `npm test`: **47/47** unit tests.
  - Math for all 144 facts; core vs extension.
  - Missing factors, arrays, equal groups and repeated addition agree.
  - Word-problem grammar; hints never reveal answers.
  - Practice variety with no repeats; even test decks with no back-to-back repeats.
  - Scoring with unanswered questions; mastery rules.
  - Pictures draw the right number of dots/groups/jumps.
  - All 10 lessons are well-formed with mathematically correct answers and core-only checks.
  - Progress persistence, blocked/full/corrupt storage, no personal data.
- `npm run test:browser` (localhost): **206/206** headless-Chrome checks. They cover the acceptance walk-through above plus:
  - layouts at 320, 390, 768, 1280 and 1366 px (overflow, fit, light cards with navy text, ≥44 px pad keys)
  - Division locked (including direct links)
  - keyboard use; timer cleanup on every exit
  - blocked storage
  - no page errors; no missing files
- The page also works when opened straight from disk (`file://`): practice and saving checked.
- Screenshots are in `docs/screenshots/`: landing (390/1280), menu, lesson steps, practice feedback and review, flashcard front/back, test, test setup, test results, progress, and phone views of practice, flashcards, test and a lesson.
- Not tested: real phones/tablets, Safari, Firefox, screen readers (headless Chrome only).

## Deployment

Pending at the time of this commit. The build is published to `gh-pages` with `npm run publish:pages`, and the live results are recorded in the next commit.

## Known limitations

- Fredoka font comes from Google Fonts; offline it falls back to a system font.
- The Progress page is per browser/device (no sync, by design: no accounts).
- Lessons are text plus pictures (no audio narration). A non-reader will need an adult nearby.
- Flashcards show the vertical form with the table number on top (e.g. 7 over × 3). Test and Practice mix both factor orders.
- `CLAUDE.md` mentions a `worksheets/` folder and a `LICENSE` file; neither exists in this repository.

## Next

Owner tests Multiplication on the live testing site. Division (Teach, Practice, Flashcards, Test) only after approval. Do not merge to `main` without approval.
