# Subtraction 2.0: mobile usability and SI-08 (final pre-publication findings)

Date: 2026-10-12. Branch `feature/subtraction-2.0`. All measurements come from headless Chrome at 320×640, 375×812 and 390×844 (simulated phones, not physical devices).

## 1. The 84 px empty band in read-only workspaces: fixed

**What it was**
- In read-only mode (`view`), SubtractKit keeps its two regroup-mark rows: 24 px for earlier values, 44 px for current marks, plus row gaps.
- It keeps them even when the grid has no marks. On a problem shown before anyone works on it, that leaves 84 px of empty space between the place labels (Th H T O) and the digits.

**Where it appeared:** every read-only problem with no marks.
- Test: "Do I need to regroup?"
- Teach: "Do I need to regroup?" Your Turn
- Lab: Correct exchanges, Place value, Regrouping across zeros (the "what is in the zero place" variant), and "Find and fix mistakes" when the student made no marks

**Impact on a third grader**
- The digits were readable (21.6 px) and the columns were aligned.
- But on a 320–390 px phone the band pushed the answer choices and the Submit, Next or Check Answer button further down. On 5 to 7 kinds of screens the button started below the bottom edge, while the screen looked like it had a large blank gap. A child could easily miss that there was more to scroll to.

**Fix** (`css/galaxy.css`, scoped to `#sub`; `css/subtractkit/` itself is unchanged)
- In read-only grids that contain no regroup marks (`:not(:has(.sk-cur-read, .sk-hist))`), only the two empty mark rows collapse to 0. SubtractKit's own row sizes are mirrored for normal and short screens.
- The band went from **84 px to 16 px** at every phone size.
- **Not affected:**
  - columns (every top digit stays exactly above its bottom digit, checked);
  - crossed-out digits, regrouped values and someone's regroup marks (grids with marks keep their rows, checked);
  - interactive grids;
  - demos (3,002 − 1,578 still shows each zero go 10 → 9, checked).

## 2. Finding Submit, Next and Check Answer on long questions: fixed

After the band was removed, some long questions still ran past one phone screen. They have 3–4 long answer choices, a model, or two parts, as in "Find and fix mistakes". You allowed scrolling for these, as long as it is intuitive and controls are never hidden.

**Changes**
- **Choice questions** (shared `askQuestion`, one narrowly scoped addition): when the child picks an answer and Submit is below the screen, Submit scrolls into view. Short questions never move, so Multiplication and Division behave exactly as before; their regression suites pass.
- **Test and Teach forms with choices:**
  - when every choice is made, the next thing to do scrolls into view;
  - if the answer grid is still empty, it scrolls to the grid ("Find and fix mistakes");
  - otherwise it scrolls to Check Answer (Teach) or the question's Next / Finish button (Test).

- **Number pad and workspace questions** (S2-16, the same shared screen): once the child starts typing, Submit scrolls into view if it is below the screen. After Submit, Next is brought into view if the feedback left it off screen.

**Verified at 320, 375 and 390, with the test doing no scrolling of its own** (`tests/browser-subtraction2.test.mjs`, "phones" section):
- Teach, the Test (all 4 question kinds) and all 12 Lab kinds start their answer area on the first screen. The top of the choices, number pad or answer grid is visible, so the child can see where to go.
- After answering, Submit and then Next are fully on screen, inside the page width, and not covered: the element at their centre is the button itself.
- No page has sideways scrolling.

## 3. SI-08: Test questions can be rebuilt from the developer console. Documented limitation, not fixed

**What it is**
- Test questions are not stored. They are rebuilt from a saved seed with Mathbook's `Mathbook.subtractRegrouping.testItems(seed)` (in `js/subtraction-vendor/content.js`, vendored unchanged).
- Someone who opens the browser's developer tools and types JavaScript can therefore rebuild the 15 problems with their answer keys. That includes "needs regrouping / which column" for decide questions and the right mistake description.
- The arithmetic answers are always computable from the problems on screen anyway.

**Where:** only through the developer console; the Test screen is the only one involved.

**Normal Test interface: checked, nothing revealed** (permanent checks in `tests/browser-subtraction2.test.mjs`, "SI-08" section)
- On all 15 questions, before Finish, the page text and every HTML attribute contain:
  - no final answer;
  - no hint, Show me, Check, worked solution or demo;
  - no right/wrong (✓/✗) marks;
  - no mistake answer key.
- The detector itself was tested: it finds an answer written with or without a comma, and in an attribute.
- The saved draft (`galaxy-math.subtraction` → `testDraft`) holds only `seed`, `i` and the child's own responses.
- The app's public object exposes no grading or answer hook (`_test` has only `startLesson`).
- SubtractKit's test mode ignores `hint()`, `showSolution()` and Check, even when asked (Mathbook's own browser test, plus ours).

**Impact on a third grader:** none in normal use. Reaching it needs the developer tools and JavaScript, which is not a student-facing path. It does not affect regrouping, alignment, readability or controls.

**Why it is deferred**
- Hiding it would mean editing the vendored Mathbook `content.js`, which is kept byte-identical by owner instruction.
- It would also mean building a second copy of the test blueprint, which would break "reuse, don't rebuild".

It is recorded as a known limitation.
