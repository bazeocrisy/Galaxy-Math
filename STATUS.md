# Galaxy Math — Development Status

Updated: 2026-10-11 (branch `feature/galaxy-math-foundation`; not merged to `main`). Division has **not** been started.

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
| Live deployment verified | see "Deployment" below | |
| GitHub contains final code, tests and docs | see "Deployment" below | |

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
- **New Lows from the retest:** A-27, A-28 and A-29 were fixed afterwards (developer responses recorded; see "Deployment" for the auditor's live check).

## Tests (run 2026-10-11)

- `npm test`: **69/69** unit tests.
  - Question bank: all kinds × all facts, independent answer checks, distractor rules, range, hints, sessions, unlock rules, statuses.
  - Lessons, progress v1→v2, blocked storage, plus the audit regression tests.
- `npm run test:browser` on this PC:
  - **Chrome 155.0.8059.39: 605/605.**
  - **Microsoft Edge 155.0.4283.45: 604/604.** A few checks depend on which problem comes first, which explains the one-check difference.
- Not available here: Firefox, Safari, and real iPhone/Android devices. All phone and tablet results come from viewport and touch emulation in Chrome and Edge.

## Deployment

Pending at the time of this commit. The build is published to `gh-pages` with `npm run publish:pages` and verified with the live browser suite. Results are recorded in the next commit.

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
