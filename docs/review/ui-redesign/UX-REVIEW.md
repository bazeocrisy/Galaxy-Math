# Galaxy Math UI redesign: independent visual UX review

- **Role:** Independent educational UX auditor. I did not design or build this redesign.
- **Date:** 2026-10-11
- **Branch / commit:** `review/ui-redesign` @ `6679fc4` ("feat(ui): learning-workspace redesign for owner review (not deployed)")
- **Method:** I opened and looked at all **126 "after" screenshots** (21 screens × 6 widths: 320, 375, 390, 768, 1280, 1366). I compared them with **43 "before" screenshots**: all 21 at 390, all 21 at 1280, and 320-21 (progress). I read `css/galaxy.css` and parts of `js/app.js` to explain causes. Pixel sizes below are estimates from the images.
- **Limits:** I inspected **static full-page screenshots only**. I did not test live interaction, keyboard or touch, animation, timing, screen readers or real devices. "Below the fold" is judged against the stated viewport heights (320×640, 375×812, 390×844, 768×1024, 1280×800, 1366×768). Behavior (scoring, saving progress, hint logic) was not verified.

---

## 1. Per-screen: what changed and is it better for a 3rd grader?

Abbreviations: B = before, A = after. "Phones" = 320/375/390.

| # | Screen | What changed (concrete) | Verdict | Breaks at |
|---|---|---|---|---|
| 01 | Home | Content width grows from 640 to about 820 px on desktop. Cards go from about 310×180 to 400×230, with larger symbols (80→96 px) and names. Phones are almost the same. | **Slightly better** | none |
| 02 | Menu | Desktop: the 5 activity tiles grow from about 178×148 to 214×210, with bigger icons. Phones: rows are about 10 px taller. The grown-up buttons are unchanged. The lower 35–40% of the desktop screen is still empty galaxy. | **Slightly better** | 320/375: the grown-up buttons wrap to 3 rows (cosmetic) |
| 03 | Teach | **Rebuilt.** Before: a grid of 13 equal lesson cards (a 1,755 px scroll at 390). After: an "Up next" card with a big title and a single **Start this lesson** button, plus "All lessons" in 3 collapsible units. Only the current unit is open. | **Much better** | 320/375: unit pills wrap ("2 of / 4"). Desktop: empty left column under the Up next card (V-13, V-06) |
| 04 | Lesson "See it" | The panel is full width (1144 px). The step bar now has labels (Goal…Finish). Dots grow from about 22 to 36 px, and the caption grows from about 18 to 24 px. Phones drop the step labels. | **Better** | 320: the Next button wraps its arrow (V-14). 768: the bottom 45% of the screen is empty (V-07) |
| 05 | Worked example | Bigger step text (about 17→20 px). On phones the array is much bigger (dots about 22→36 px). | **Better** on desktop. **Mixed** on phones: the big array pushes Next to the fold at 375 | 320: Next wraps |
| 06 | Guided question + hint | Now uses the shared answer dock (bordered box, full-width answer field, 3×4 pad, Hint + Check). Desktop: the hint sits bottom-left. **"3 × 7 = ?" is still small text (about 18–24 px)**, the smallest math on screen. Phones: the bigger array and pad push **Check below the fold** at 320/375/390. Before, Check was visible at 390. | **Worse on phones**, about the same on desktop | 320, 375, 390 (V-01). 1280/1366: page taller than viewport, Back off-screen (V-22) |
| 07 | Practice | Exit, title and count move inside the panel header. The panel is 1144 px wide on desktop. The answer dock is about 360 px with 100×58 keys (before: 55×52). The equal-groups picture grows from about 72 to 124 px per circle. Desktop text is about 26 px, but phones/tablet stay about 17–18 px. About 150 px is blank below the picture on desktop. | **Better** on desktop. **Same** on phones. **Weak** on tablet (question text is small next to a huge pad) | 768 (V-02). 320 header clutter (V-10) |
| 08 | Practice after a miss | Hint and "Not quite" boxes move to the left column under the picture (desktop), with the dock on the right. The status under the answer box still says "**Help is below.**" while the help is to the left (V-09). | **Better** layout, **wrong copy** | Phones: the hint box is below the fold (as before) |
| 09 | Lab long repeated addition | Desktop: the 10-term sum now fits on **one line** (about 34 px), vertically centred. Before it wrapped awkwardly at about 40 px. Phones: font shrinks (about 28→20 px) and it wraps with an orphan "6 = ?" (V-04). | **Better** desktop and tablet. **Worse** on phones | 320, 375, 390 |
| 10 | Lab array | The 8×9 array grows from about 9 to 22 px dots on desktop, and 16 px at 390. At 320 the dots are about 8 px (V-12). | **Better** (except 320) | 320 |
| 11 | Lab long word problem | Wider column with 4 lines instead of 5. Vertically centred because it has no picture, which leaves blank space above and below. Still text only, with nothing to look at. | **Slightly better** | none |
| 12 | Lab missing factor | "? × 7 = 42" grows from about 40 to 56 px and is centred in the left column. | **Better** | none |
| 13 | Lab long "match" | Choices move into the dock (60 px tall). Desktop: the sum fits on one line, but it is sentence-size (about 26 px), not math-size. Phones: the sum splits across lines ("9 + 9 + 9 + / 9 + 9 + 9 + 9?") (V-05). | **Better** desktop. **Same** on phones | 320, 375, 390 |
| 14 | Lab check-the-work | Same pattern as 13. Big choice buttons. The prompt is centred with blank space around it. | **Slightly better** | none |
| 15 | Lab feedback | Big improvement on desktop: **Next problem** sits in the dock where the answer was. The explanation and number line move under the problem. The dock still shows an **empty "?" answer box** (V-16). Number-line labels are tiny on phones (V-11). | **Better** | 320–390 labels (V-11) |
| 16 | Flashcards setup | **Simplified.** Tap a table to start (no separate Start button). Buttons grow from about 66×56 to 88×76. Clear "Which times table? Tap one to start." "Mixed" has a purple outline that looks selected (V-17). | **Better** | 320: page is 855 px in a 640 viewport, so Mixed/9s/10s are below the fold |
| 17 | Flashcards session | Exit, title, card count and timer go into one header. The card is 520 px wide (not oversized). Show answer / Pause / I'm done sit in **one row of equal buttons** on desktop/tablet. On phones the row breaks badly (V-15). | **Better** desktop, **worse** phones | 375, 390 (wrap), 320 (3 stacked) |
| 18 | Test start | **Essentially unchanged.** A 640–760 px card in the top third, with empty galaxy below. The intro sentence touches the Start button (V-20). | **Same** (still a floating form) | none |
| 19 | Test question | The answer moves out of the inline box into the shared dock. The fact is very large (about 64–80 px), and Quit is in the header. Consistent with Practice/Lab. | **Better** | 320: "Question 1 of / 10" wraps (V-10) |
| 20 | Parent Settings | Rebuilt into 4 cards (Times tables, Practice & Lab, Flashcards, Test), 2×2 on desktop. Rows have dividers, bigger 48 px buttons, short help text and a shorter warning note. | **Much better** readability | Phones: lone option wraps (V-18) |
| 21 | Progress | **Unchanged** apart from container width. Grown-up page with dense tables, "1 cards". | **Same** | 320: Status column clipped (pre-existing) (V-19) |

---

## 2. The owner's 10 points

| # | Owner's request | Status | Evidence |
|---|---|---|---|
| 1 | Bigger desktop workspace, no oversized flashcards | **Met** | Workspace grows from 948 to 1144 px at 1280 (1280-07, -09, -19). Flashcard is 520 px wide, not oversized (1280-17, 1366-17). |
| 2 | Math question and visual are the most prominent elements | **Partly** | Met for big expressions on desktop (1280-09, -12, -19; 1366-19). **Not met** for sentence prompts on phones/tablet (768-07, 768-11, 768-13; 375-07: about 18 px text next to 22 px keypad digits), lesson guided questions (all widths, 06) and the "match" sum (13). See V-02, V-03, V-05. |
| 3 | Lab has room for long addition, arrays, word problems, missing factor | **Partly** | Desktop/tablet: long sum on one line (1280-09, 768-09), array large (1280-10), word problem 4 lines (1280-11). Phones: long sums wrap with orphans (320/375/390-09, -13), and the array is tiny at 320 (320-10). |
| 4 | No large empty areas inside question panels | **Partly** | Better than before, but still blank areas: 1280-07 (about 150 px under the picture), 1280-06/1366-06 (about 230 px between array and hint), 1280-11/-13/-14 (centred prompt with blank space above and below), 1280-03 (empty left column). |
| 5 | Consistent, readable answer entry across Practice, Lab, Test | **Met** | The same dock (answer field, 3×4 pad, action row) sits at the same place: right column ≥860 px, under the problem on phones (1280-07, -09, -19; 390-07, -09, -19). Small inconsistencies: "Check" vs "Submit" labels, and the lesson header style differs from the activity header. |
| 6 | Teach doesn't overwhelm with many small choices | **Met** | 13 equal cards are replaced by one "Up next" and 3 collapsible units (1280-03, 390-03). Minor pill wrapping at 320/375 (V-13). |
| 7 | Simpler Flashcards setup, clearer session controls | **Partly** | Setup is one tap (1280-16, 390-16). Controls are one clear row on desktop/tablet (1280-17, 768-17), but on phones they break into an unbalanced layout, and "I'm done" has the same weight as Pause (375-17, 390-17, 320-17). See V-15. |
| 8 | Better spacing and readability in Parent Settings | **Met** | 1280-20 and 1366-20 (2×2 cards, dividers, 48 px buttons, plain help). Phones are clearly sectioned (390-20). |
| 9 | Dark galaxy background and light panels preserved | **Met** | All screens. |
| 10 | All question types, explanations, progress data, features preserved | **Met as far as screenshots can show** | Every question type, hints, explanations, number line, timers, settings and progress tables appear (07–21). Behavior was not tested. |

---

## 3. Findings

Severity counts: **Critical 0 · High 3 · Medium 11 · Low 8** (22 findings).

### V-01 · High · Guided lesson: Check button pushed below the fold on phones
- **Screens/widths:** 06 at 320 (Check at about y=690 of 640), 375 (about 865 of 812), 390 (about 872 of 844). Before at 390, Check was visible (about 756).
- **What I see:** Lesson title, Back-to-lessons button, step bar, instruction line, small "3 × 7 = ?", a large array (dots about 36 px), then the full dock. The child sees the keypad but not Check. The hint box (shown after tapping Hint) is completely off screen.
- **Why it matters:** A child who types an answer and sees no Check button gets stuck, or must know to scroll. "Help is below" then points to something they cannot see. This is a regression from the old UI.
- **Fix:** On `max-width: 859px`, cap lesson visuals in the question (`.lesson-body .qa-visual .viz { max-height: 18vh }`). Hide or shorten the "Solve this one together…" line. Drop the separate step text "Step 5 of 7 · Try it together" on phones, because the stepper already shows it. Alternatively, apply the same `(max-height: 700px)` compaction used for `.qa` in Practice/Lab to lessons, and consider hiding the `.screen-head` "All lessons" button row on short phones (it is duplicated by Back).
- Developer response: **Fixed.** On phones the lesson header is compact, the “Solve this one together…” lead-in is hidden (the stepper says which step it is), lesson pictures are capped at 18vh, and the dock is compact. At 390×844 Check now sits at about 765 px. The browser suite checks that Submit/Check is on screen for every Lab and Practice kind at all six widths.
- Re-review: _pending_

### V-02 · High · Sentence questions are small on phones and tablet; the keypad dominates
- **Screens/widths:** 07, 08, 10, 11, 13, 14 at 320/375/390/768. Clearest at 768-07, 768-11 and 768-13: one 18 px line above a 400 px-wide keypad, with about 40% of the screen empty below.
- **What I see:** Prompt text is about 17–18 px. Keypad digits are about 22 px in 120×50 keys. The answer box is the most prominent object.
- **Why it matters:** This directly misses owner point 2 on the devices children use most (tablet, phone). Reading the word problem is the hard part for a 3rd grader, and it gets the least space.
- **Cause:** An older rule in `galaxy.css` (around line 333, inside `@media (max-width: 859px)`) sets `.qa .q-prompt { font-size: 1.15rem }`. Its specificity (0,2,0) beats the redesign's `.q-prompt { font-size: clamp(1.3rem, 2.4vw, 1.85rem) }` (0,1,0). The `(max-height: 700px)` block shrinks it further to 1.1rem.
- **Fix:** Remove or raise the legacy rule. For example, inside the redesign's `max-width: 859px` block, set `.qa .q-prompt:not(.big) { font-size: clamp(1.25rem, 4.6vw, 1.6rem); }`. At 768 also cap the dock (`.qa-dock { max-width: 380px }`) and consider a 2-column `.qa` from about 700 px so the tablet gets the side-by-side layout.
- Developer response: **Fixed.** Inside `max-width: 859px`, sentence questions are now `clamp(1.25rem, 4.6vw, 1.6rem)`, never smaller than the keypad digits. The legacy 1.15rem rule no longer wins.
- Re-review: _pending_

### V-03 · High · Lesson "Try it together" question renders as small body text at every width
- **Screens/widths:** 06 at all six widths (1280-06 and 1366-06: about 24 px; 390-06: about 17 px).
- **What I see:** "3 × 7 = ?" is the smallest math on the screen. It is smaller than the hint text, the step label and every keypad digit. Practice/Lab/Test show the same kind of fact at 56–80 px.
- **Why it matters:** In the lesson, where the child is learning, the question is visually the least important thing. This is inconsistent with the rest of the redesign and with owner point 2.
- **Cause:** The lesson question passed to `askQuestion` (via `fromLesson(l.guided)`, `app.js` around line 428) does not set `big`, so it gets the sentence style.
- **Fix:** In `fromLesson`, set `big: true` when the prompt is a bare expression (for example, matches `/^[\d\s×+=?−-]+$/`). Or add `.lesson-body .q-prompt { font-size: clamp(2rem, 5vw, 3.2rem) }` for expression prompts.
- Developer response: **Fixed.** `fromLesson` marks bare expressions (digits, ×, +, =, ?) as big, so “3 × 7 = ?” is the largest math on screen in the guided and check steps.
- Re-review: _pending_

### V-04 · Medium · Long repeated addition wraps badly and shrinks on phones
- **Screens/widths:** 09 and 15 at 320, 375 and 390.
- **What I see:** At 390 the sum is "6 + 6 + 6 + 6 + 6 + 6 + 6 + 6 + 6 +" then "6 = ?". At 320 it is "…6 +" then "6 + 6 = ?". Font drops from about 28 px (before, 390) to about 20 px (after). The orphaned tail separates the last addend from the rest.
- **Why it matters:** The task is to see 10 sixes. A ragged split with a trailing "+" makes counting harder, and the smaller font is harder to read.
- **Fix:** Use `.q-prompt.big.long { text-wrap: balance; }` and wrap each "6 +" pair in a `white-space: nowrap` span in `exprHtml`, so lines break evenly (5 + 5). Keep a minimum of about 1.6rem on phones.
- Developer response: **Fixed.** `exprHtml` wraps each “6 +” group in a no-wrap span and prompts use `text-wrap: balance`. Long sums break evenly between groups and never leave “6 = ?” or “+ 6” alone.
- Re-review: _pending_

### V-05 · Medium · "Match the equation": the long sum is sentence-size and splits across lines
- **Screens/widths:** 13 at all widths. It splits at 320/375/390 ("9 + 9 + 9 + / 9 + 9 + 9 + 9?"). On desktop it fits but stays about 26 px.
- **Why it matters:** The child must count seven 9s to choose 7 × 9. A split sum makes miscounting likely, and the math is not the most prominent element.
- **Fix:** Render the expression as its own block under a short lead-in ("Which multiplication matches this?"). Use the `.big.long` style and the balanced, no-wrap grouping from V-04.
- Developer response: **Fixed.** “Match the equation” now asks “Which multiplication matches this addition?” and shows the sum on its own large expression line (`q.expr`). Reports show the lead-in plus the sum.
- Re-review: _pending_

### V-06 · Medium · Remaining empty areas inside panels on desktop
- **Screens/widths:** 1280/1366 at 07 (about 150 px under the groups), 06 (about 230 px between the array and the hint), 11/13/14 (prompt centred with about 120–150 px blank above and below), 03 (left column empty for about 250 px under "Up next").
- **Why it matters:** This is owner point 4. It is better than before but not gone, and it is most visible on the first Practice and Teach screens the owner will open.
- **Fix:** For questions that have a visual, use `align-content: start` and let the visual grow (`.qa-visual .viz { max-height: 52vh }`). For no-visual questions, top-align the prompt with a larger font instead of centring it. On Teach, make the right column sticky or put a small "what you'll learn" picture or the unit summary in the left card. Alternatively, cap `.qa` row 2 with `grid-template-rows: auto auto 1fr` and put hints right under the visual.
- Developer response: **Fixed (desktop).** Grid rows are now `auto auto 1fr`, so hints and feedback sit right under the picture. Pictures may grow to 52vh on desktop. Questions without a picture are top-aligned under extra padding instead of floating in the middle.
- Re-review: _pending_

### V-07 · Medium · Tablet portrait (768) is a stretched phone layout with half the screen empty
- **Screens/widths:** 768-04 (panel ends at 558 of 1024), 768-05 (503), 768-13/-14 (543), 768-09/-12 (about 660), 768-16 (428), 768-18 (290).
- **Why it matters:** Tablets are a likely device. The owner's "small forms floating on a big galaxy" complaint is still true here.
- **Fix:** Bring the side-by-side `.qa` layout down to about 700 px (`--dock: 300px`). Use larger visuals and prompt sizes in 700–859 px. Allow the lesson stepper and visuals to scale with `vh`.
- Developer response: **Fixed.** The side-by-side layout now starts at 700 px with a 300 px dock, so 768 tablets show the problem beside the answer area.
- Re-review: _pending_

### V-08 · Medium · Start screens (Test, Flashcards) are still small cards floating in empty space
- **Screens/widths:** 18 at all widths (unchanged from before), and 16 at 768/1280/1366. The lower 55–65% of the screen is empty.
- **Why it matters:** These are child-facing entry points and look like the "administrative forms" the owner described. The Test start is the one screen the redesign did not touch.
- **Fix:** Give the Test start a child-facing hero: a big stopwatch picture, "10 questions · 5 seconds each" as large chips, and a large Start button. Use the same full-width workspace panel as the other activities.
- Developer response: **Fixed for Test and Practice.** Both start screens are now full-width hero panels with a large icon, a title, big chips (“10 questions”, “the 1s and 2s”, “5 seconds each”) and a large Start button. The Flashcards setup uses the full width with large table tiles. The Lab setup already had three large cards.
- Re-review: _pending_

### V-09 · Medium · "Help is below." points the wrong way on desktop
- **Screens/widths:** 06 and 08 at 1280/1366 (status under the answer box: "💡 Help is below." and "Not quite. Try again. Help is below."). The hint actually appears to the **left**, under the picture.
- **Why it matters:** A child follows the words, looks down the keypad and finds nothing.
- **Fix:** `app.js` lines 227 and 272: use direction-free copy ("💡 Read the hint." / "Not quite. Read the hint and try again."). Or, at ≥860 px, render the hint inside the dock below the actions.
- Developer response: **Fixed.** The wording no longer gives a direction: “💡 Read the hint.” / “Not quite. Read the hint and try again.”
- Re-review: _pending_

### V-10 · Medium · Cluttered activity headers on 320 px phones
- **Screens/widths:** 320-07/-08 (pencil emoji stacked above "Practice", "Question 1 / of 1" on two lines), 320-17 ("7s / flashcards" on two lines next to the emoji), 320-19 ("Question 1 of / 10").
- **Why it matters:** The header is the child's "where am I" cue. Broken wrapping looks unfinished.
- **Fix:** At `max-width: 360px`, hide the title emoji, set `.act-count { white-space: nowrap }`, and drop the activity name (the topbar already says it) or shorten it to "Q 1/10".
- Developer response: **Fixed.** `.act-count` never wraps, and at ≤360 px the title is smaller and the Exit button narrower. The running score was already hidden below 520 px.
- Re-review: _pending_

### V-11 · Medium · Number-line explanation is too small to read on phones
- **Screens/widths:** 15 at 320 (labels about 5–6 px), 375/390 (about 8 px).
- **Why it matters:** The visual explanation is the teaching moment after a miss or skip. At these sizes a child cannot read "+6" or "42".
- **Fix:** Set a minimum rendered width for `.viz-jumps` (for example 520 px) inside a horizontally scrollable `.viz-wrap`. Or split it into two rows of 5 jumps on narrow screens. Or set `min-font-size` via `font-size` on the SVG text with `vector-effect`.
- Developer response: **Fixed.** On phones, number lines in feedback keep a readable 420 px width inside a box that scrolls sideways. The page itself never scrolls sideways (checked).
- Re-review: _pending_

### V-12 · Medium · 8×9 array is tiny at 320×640
- **Screens/widths:** 320-10 (dots about 8 px, array about 105 px tall). It is acceptable at 375 and above.
- **Cause:** `(max-width: 859px) and (max-height: 700px)` caps `.qa-visual .viz` at 17vh.
- **Fix:** Lower other parts on short phones instead (smaller keypad keys, 40 px). Raise the array cap to about 24vh, or allow the dock to scroll under a sticky Submit.
- Developer response: **Fixed with a trade-off.** The worst case (a 10×10 array) was measured at every phone size. Arrays and group pictures are capped at 20vh on phones (19vh on short phones) so that Submit always stays on screen: at 375×812, Submit for a 10×10 array moved from 857 px (off screen) to 800 px. A deterministic worst-case check (10×10 array, 10 groups of 10, long word problem, long sum, long match, times as many) now runs at 320, 375, 390 and 768 in Practice and the Lab.
- Re-review: _pending_

### V-13 · Medium · Teach unit badges and titles wrap awkwardly on small phones
- **Screens/widths:** 320-03 ("2 of / 4", "0 of / 5", "1. What multiplication / means", "2. Facts and / equations"), 375-03 ("2 of / 4").
- **Why it matters:** This is the new Teach entry screen, and broken pills look unfinished.
- **Fix:** Use `.unit summary .pill { white-space: nowrap; flex: none; }`.
- Developer response: **Fixed.** Unit badges are `white-space: nowrap; flex: none`.
- Re-review: _pending_

### V-14 · Low · Lesson Next button wraps its arrow; nav buttons are left-aligned and unequal on phones
- **Screens/widths:** 320-04/-05 ("Next: Worked example / →"), and 375/390-04/-05 (Back above a not-full-width Next).
- **Fix:** On phones, make the nav a 2-column grid (`Back | Next`) or set Next to `width: 100%`. Shorten the label to "Next →" with the step name above it.
- Developer response: **Fixed.** On phones, lesson navigation is a two-column grid (Back | Next) with full-width buttons, and Next may wrap cleanly.
- Re-review: _pending_

### V-15 · Medium · Flashcard session controls break on phones; "I'm done" is too easy to hit
- **Screens/widths:** 375-17 and 390-17 ("👀 Show / answer" wraps to 2 lines, Pause beside it, "I'm done" orphaned alone on a second row at half width), 320-17 (three full-width stacked buttons). At all widths, "I'm done" has the same size and weight as Pause and sits right next to it.
- **Why it matters:** This is owner point 7. Ending the session by accident loses the flow, and the uneven layout looks unfinished.
- **Fix:** Put the primary **Show answer** full width on its own row. Below it, put Pause and I'm done as smaller secondary buttons, with I'm done as a ghost/outline style. CSS: `.fc-controls-row { grid-template-columns: 1fr 1fr } .fc-controls-row .btn-primary { grid-column: 1 / -1 }`.
- Developer response: **Fixed (phones).** Below 700 px, “👀 Show answer” (and “Next card” in tap mode) takes a full row, with Pause and “✓ I’m done” beneath. “I’m done” is now a light outline button. Desktop keeps one row so the session still fits at 1280×800 and 1366×768 (checked).
- Re-review: _pending_

### V-16 · Low · After answering or skipping, the dock still shows an empty "?" answer box
- **Screens/widths:** 15 at all widths.
- **Why it matters:** It looks like the app still wants an answer, right above "Next problem".
- **Fix:** In the `.qa.done` state, show the correct or entered answer in the box (green or red), or hide the box when `skipped`.
- Developer response: **Fixed.** After answering or skipping, the answer box shows the right answer, in green.
- Re-review: _pending_

### V-17 · Low · Flashcards "Mixed" looks pre-selected; at 320 it is below the fold
- **Screens/widths:** 16 at all widths (purple border from `.table-pick button.last`). At 320-16 the page is 855 px in a 640 viewport.
- **Fix:** Add a small "last time" tag, or use a neutral style. At 320, use 3 columns with 60 px buttons so all 11 choices fit.
- Developer response: **Fixed.** No table looks pre-selected any more. At ≤360 px the tiles use 3 columns with 60 px buttons.
- Re-review: _pending_

### V-18 · Low · Parent Settings: single options wrap alone onto a new line on phones; uneven cards on desktop
- **Screens/widths:** 375-20 and 390-20 ("10 s" alone under "Show the answer" and "Time for each question"), 320-20 (the *selected* "5 s" wraps). On 1280-20 and 1366-20 the Practice & Lab card is shorter, leaving a gap. The heading "Practice and 🧪 Lab" has an emoji in mid-title.
- **Fix:** Reduce `.settings-card .seg button { min-width: 56px; padding: 0 10px }` under 420 px. On desktop, use `align-items: stretch` in `.settings-grid`. Write the heading as "🧪 Practice and Lab".
- Developer response: **Fixed.** At ≤420 px the setting buttons are narrower so options stay on one line. On desktop the cards stretch to equal heights.
- Re-review: _pending_

### V-19 · Low · Progress page untouched; tables cramped on phones (pre-existing)
- **Screens/widths:** 320-21 (Status column clipped and needs horizontal scroll; the same in before). 375/390-21 ("Not tried yet" wraps to 3 lines). All widths show "1 cards" in Milestones.
- **Why it matters:** It is grown-up facing, so lower priority, but it is the least redesigned screen.
- **Fix:** On phones, turn table rows into stacked cards or shorten the status to "–". Fix the plural ("1 card").
- Developer response: **Deferred (pre-existing).** The Progress page was not part of this redesign. Phone-friendly progress tables are listed as a follow-up in STATUS.md.
- Re-review: _pending_

### V-20 · Low · Test start: intro sentence touches the Start button; awkward wraps on phones
- **Screens/widths:** 1280-18 and 1366-18 (no gap between "…Just do your best!" and the button). 375/390-18 ("· 5 / seconds for each").
- **Fix:** Add a margin below `.start-panel .lede + p`. Present the facts as separate chips. See also V-08.
- Developer response: **Fixed** by the new Test start hero (V-08), with separate chips and clear spacing above Start.
- Re-review: _pending_

### V-21 · Low · Orphan words in desktop prompts
- **Screens/widths:** 1280-07 ("…How many are there / in all?"), 1280-10 ("…How many dots are / there?"), 1366-07/-10.
- **Fix:** `.q-prompt { text-wrap: balance; }`.
- Developer response: **Fixed.** `.q-prompt { text-wrap: balance; }`.
- Re-review: _pending_

### V-22 · Low · Guided lesson taller than common laptop viewports
- **Screens/widths:** 1280-06 and 1366-06 (page about 863 px; in 800 / 768 viewports the Back button and panel bottom are off-screen).
- **Fix:** This follows from V-06: closing the gap between the array and the hint brings the panel inside the viewport.
- Developer response: **Improved** by V-06: hints now sit directly under the picture, so the guided lesson is shorter on laptops.
- Re-review: _pending_

---

## 4. Overall verdict

The desktop redesign is a real improvement. The workspace is wider and calmer. One answer dock now sits in the same place in Practice, Lab, Test and lessons. Big expressions (long addition, missing factor, test facts) finally lead the screen. Teach and Parent Settings went from cluttered to clear, and the flashcard setup is one tap. I found no wrong math and no screen where a child cannot finish the task.

It is **not yet ready to show the owner as "done"**, for three reasons that touch the owner's own criteria:

1. **Phones got worse in the guided lesson** (V-01): Check is off-screen at 320, 375 and 390.
2. **"The question is the most prominent thing" holds only for big expressions on desktop.** It fails for sentence questions on phones and tablet (V-02) and for the lesson's own question everywhere (V-03). The cause is mostly a single leftover CSS rule plus a missing `big` flag.
3. **Tablet and the start screens still look like floating forms** (V-07, V-08). The owner's original complaint is still visible there.

**Recommendation:** Fix V-01, V-02 and V-03 (small, mostly CSS changes). Ideally also fix V-04, V-05, V-09 and V-15, which are cheap and visible. Then recapture the screenshots and show the owner. Lead with the desktop shots (1280 at 03, 07, 09, 12, 15, 19, 20), and be upfront that tablet layout and the Test start are the next step.
