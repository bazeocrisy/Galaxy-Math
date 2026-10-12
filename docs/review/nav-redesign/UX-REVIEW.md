# Navigation redesign: independent UX review

Reviewer: independent UX auditor (children's education, accessibility). I did not write this change.
Branch: `review/nav-redesign` (commit 88379fa), compared against `feature/division`.
Date: 2026-10-11

## Scope and method

- **Code:** `git diff feature/division` for `js/app.js` (ICON_PATHS, `icon()`, SUBJECT_TAGLINE, landing block, `renderMenu`) and the new "Navigation: home page and subject menus" section at the end of `css/galaxy.css` (lines 618-721). I also checked `index.html` (landing and menu markup, live regions) and `js/registry.js` (activity names and blurbs).
- **Screenshots:** I viewed all 18 "after" images (320, 375, 390, 768, 1280 and 1366 px wide; home, Multiplication menu and Division menu). I compared them with the "before" images at 1280, 768, 390 and 320 px. The "before" set is the live build (gh-pages f1aafd4), which matches `feature/division` for these screens.
- **Contrast:** I computed WCAG 2.x contrast ratios with a small node script from the CSS colour tokens. For text on the galaxy background I estimated the worst case by blending the background with its strongest glow: purple glow at 45 % over `#12163A`, which gives about `#5A3A93`.
- **Not done:** no browser test suites were run, because the machine has low memory. I did not run screen-reader or keyboard tests on a device. Keyboard order was checked by comparing the DOM order with the visual order.

### Change scope (teaching content and math)

`git diff feature/division --stat` shows these code changes only:

- `css/galaxy.css`: the old landing and menu rules were removed and a single navigation section was added.
- `js/app.js`: 39 lines changed, all inside the landing block and `renderMenu`.
- `package.json`: the new nav suite was added to `test:browser`.
- `tests/browser-division.test.mjs`: one assertion was updated to read the new `aria-label`.
- New files: `tests/browser-nav.test.mjs`, `tests/review-shots-nav.mjs` and the screenshots.

Lessons, banks, the registry, progress, settings and the math modules are unchanged. **No change to teaching content or math was found.**

## Brief compliance

| # | Brief item | Result | Evidence |
|---|---|---|---|
| 1 | Reduce height and interior whitespace of the four home cards | **Met** | Open cards are now about 112 px tall on desktop (before: about 230 px), with a horizontal icon, text and action layout (after/1280-1-home, after/1366-1-home). Coming-soon cards are shorter still. At 1280 × 800 the home page now fits without scrolling; before, it was 823 px tall. |
| 2 | Better subject labels and action text | **Met** (minor gaps) | Taglines are clear ("Times tables, arrays and word problems", "Sharing, grouping and fact families"). The cryptic "Learn · Practice · Think · Flash · Test →" was replaced by a "Start →" pill. On phones the word "Start" is hidden and only an arrow is shown (N-05). |
| 3 | Multiplication menu 3 + 2 on desktop | **Met** | A 6-column grid with spans gives Teach / Practice / Lab on row 1 and Flashcards / Test centred on row 2 (after/1280-2, after/1366-2). It is also 3 + 2 at 768 px (after/768-2). |
| 4 | Two columns on mobile, Lab spanning full width | **Partly** | Two columns with the Lab spanning full width at 320, 375 and 390 px. However, `grid-auto-rows: 1fr` makes the Lab card as tall as the Teach row, which leaves a large empty card (N-01). |
| 5 | Consistent SVG icon system instead of emoji | **Met** (navigation only) | There is a single 24 × 24 round-stroke set using `currentColor`, with `aria-hidden` and `focusable="false"`, on the home page, the menu heading, the activities and the grown-up links. The top-bar crumb and inner screens still use text or emoji symbols (N-07). |
| 6 | Card title readability and hierarchy | **Met** | Titles are 1.45 rem navy bold (13.5:1). Blurbs are navy-2 medium weight (7.1-7.8:1). Icon tiles sit in a fixed column. Titles stay on one line at 1000 px and wider. |
| 7 | Progress and Parent Settings secondary to the five activities | **Met** | They are borderless `link-btn` items below a hairline divider, labelled "For grown-ups", and are clearly quieter than the cards at every width. |
| 8 | Balanced vertical spacing | **Met** | `#landing.on` and `#menu.on` centre their content in the viewport height. The space above and below is roughly equal at 1280, 1366 and 768 px. Phones no longer have the large empty band below the content. |
| 9 | Keep background, logo, light panels and colour identity | **Met** | The galaxy background, logo (slightly smaller, at most 150 px), light lavender, cream, ice and pink panels and the subject accents are unchanged. The Teach accent changed from `#C98A00` to a darker `#9A6700` (N-09). |
| 10 | Division uses the same design | **Met** | after/*-3-division-menu matches the Multiplication menu at every width. Only the accent, icon and lesson count differ. |

## Additional checks

- **Touch targets:** activity cards are at least 120 px tall on desktop and about 150 px on phones. Subject cards are at least 84 px (coming-soon cards 68 px). `.link-btn` has `min-height: 44px` and padding of 8 px or more. **Pass.**
- **Contrast (computed):**

  | Element | Ratio | Result |
  |---|---|---|
  | Navy title on lav, cream, soon and pink | 12.7-14.8:1 | Pass |
  | navy-2 tagline or blurb | 7.1-7.8:1 | Pass |
  | `#9A6700` "1 of 13 lessons done" on cream (0.88 rem bold) | 4.60:1 | Pass, narrowly (N-08) |
  | White icon or "Start" on grape, coral, sky and grass | 6.1-6.7:1 | Pass |
  | White icon on Teach `#9A6700` | 4.87:1 | Pass |
  | Navy icon on coming-soon disc | 9.2:1 | Pass |
  | `.link-btn` (star at 88 % opacity) on the worst-case glow | about 6.3:1 | Pass |
  | "For grown-ups" (star at 75 % opacity, 0.85-0.9 rem) on the worst-case glow | about 5.1:1 | Pass |

- **Focus:** the global `button:focus-visible` rule draws a 4 px sun outline with a 3 px offset, and it still applies to `.subject`, `.mode` and `.link-btn`. **Pass.**
- **Focus order:** the DOM order is modes, `menuNote`, then `menuExtra`. Inside `menuExtra` the order is All subjects, Progress, Parent Settings. This matches the visual order on desktop (left, then right) and on phones (top, then bottom). The home page DOM order matches the grid order. **Pass.**
- **Reduced motion:** the existing rule at css/galaxy.css:250 still cancels the hover lift on `.subject.open` and `.mode.ready`. **Pass.**
- **Screen-reader labels:** home cards have an `aria-label`, for example "Multiplication: Times tables, arrays and word problems. Teach, Practice, Math Thinking Lab, Flashcards and Test". Coming-soon cards have `aria-disabled` and the label "X. Coming soon", and `landingNote` and `menuNote` are polite live regions. Activity cards take their name from their content. Icons are hidden from assistive technology. See N-04 and N-06 for small issues.
- **Readability for an 8-year-old:** the words are short and familiar ("Show me how", "Let me try", "Start"). "Arrays" and "fact families" are grade-3 curriculum terms that the lessons teach. **Acceptable.**
- **Parent findability:** the grown-up links are labelled "For grown-ups" with recognisable chart and slider icons and are always in the same place under the activities. They are easy to find, but less discoverable than before because they no longer look like buttons (N-03).

## Findings

### N-01: Math Thinking Lab card is stretched to an empty, oversized tile on phones (Medium)

**Where:** after/320-2, after/375-2, after/390-2 and after/*-3-division-menu; css/galaxy.css:715 (`.modes { grid-auto-rows: 1fr; }`).

**Evidence:**
- `1fr` auto rows make every row as tall as the tallest one. The tallest is the Teach and Practice row, because the Teach card has three or four lines of text.
- The full-width Lab card, which holds one icon and two short lines, is therefore about 150 px tall at 390 px and about 165 px at 320 px. Its content sits in the left third, with a large empty area to the right.
- This brings back the "excessive interior whitespace" that item 1 asked to remove, and makes the Lab look more important than the other activities.

**Fix:** limit equal row heights to the 3 + 2 layout, for example by moving the rule into `@media (min-width: 700px) { .modes { grid-auto-rows: 1fr; } }`. Alternatively, on phones override with `.mode.m-lab { min-height: 0; }` and `.modes { grid-auto-rows: auto; }`.

### N-02: Grown-up links wrap awkwardly at 320 px (Medium)

**Where:** after/320-2 and after/320-3; css/galaxy.css:691-697.

**Evidence:** at 320 px the row becomes "For grown-ups · Progress" on one line, with "Parent Settings" alone and centred on the next line. The label now visually belongs to Progress only, and the group looks broken.

**Fix:** at 359 px and below, stack the label above the two links (`.grownups { flex-basis: 100%; text-align: center; }`). Another option is to shorten the visible text to "Settings", keeping "Parent Settings" in an `aria-label`, so that both links fit on one line.

### N-03: "All subjects" and the grown-up links have no visible button affordance (Low)

**Where:** after/*-2 and after/*-3; css/galaxy.css:676-679 (`.link-btn`: transparent background, no border).

**Evidence:**
- On a dark star field, the links are plain text with an icon and only show a background on hover. Touch devices never show the hover state.
- An 8-year-old who wants to change subject may not recognise "← All subjects" as tappable.
- The Galaxy Math logo in the top bar is the only other way back, and it is also unmarked.

**Fix:** keep the grown-up links quiet. Give "All subjects" a light outline or pill background (for example `border: 2px solid rgba(243,240,255,.35)`) so the child's way back is clearly a button.

### N-04: The home card's accessible name leaves out the visible word "Start" (Low)

**Where:** js/app.js:384 (`aria-label`).

**Evidence:** the visible text includes "Start", but the `aria-label` replaces it with the activity list. Voice-control users who say "click Start" will not reach the card. This is WCAG 2.5.3 (Label in Name): the label starts with the subject name, so it is a partial match, but "Start" is missing.

**Fix:** append the action word, for example `${s.name}: ${tag}. Start. Teach, Practice, …`. Alternatively, drop the `aria-label` and let the name come from the content.

### N-05: On phones the action text is hidden and only an arrow disc is shown (Low)

**Where:** after/320-1, after/375-1, after/390-1; css/galaxy.css:688 (`.subject .go .lbl { display: none; }`).

**Evidence:** item 2 asked for better action text, but below 700 px the card shows only an arrow in a circle. The whole card is tappable, so this works, but the clearest call to action for a child is gone on the most common device.

**Fix:** keep "Start" at 375 px and wider. The width allows it if the tagline wraps. Hide it only at 359 px and below.

### N-06: Activity cards' accessible names run text together (Low)

**Where:** js/app.js:408.

**Evidence:** with no `aria-label`, a ready card is announced from its content as "Teach Show me how 1 of 13 lessons done", with no separation between parts. This is understandable but rough.

**Fix:** add `aria-label="${a.name}: ${a.blurb}${extra ? '. ' + metaText : ''}"`, or put a visually hidden separator between the spans.

### N-07: The SVG icon system stops at the menu (Low)

**Where:**
- js/app.js:139: the top-bar crumb uses `${s.symbol} ${s.name}`, shown as "× Multiplication" (after/1280-2, top right).
- js/app.js:940 and similar: inner screens still use "⬅" and "📊 Progress" emoji.
- js/registry.js:17-21: `ACTIVITIES[].icon` emoji are no longer used by the menu.

**Evidence:** item 5 is met for the navigation screens. However, a child moving from the menu into Progress or a results screen sees the emoji style come back.

**Fix:** a follow-up to use `icon()` in the crumb and the inner back and Progress buttons. Remove or document the unused `icon` registry field.

### N-08: The Teach lesson counter is near the AA limit and wraps at 320 px (Low)

**Where:** css/galaxy.css:665-666; after/320-2.

**Evidence:**
- `#9A6700` on cream is 4.60:1 at 0.88 rem bold. This passes, but with almost no margin.
- At 320 px, "1 of 13 lessons done" wraps to two lines and makes the Teach card the tallest. Together with N-01, this inflates the whole grid.

**Fix:** use a slightly darker shade such as `#8A5C00` (about 5.4:1). At 359 px and below, shorten the text to "1 / 13 done" or reduce the size slightly.

### N-09: Titles are not aligned across row 1 at 768 px and on desktop (Low)

**Where:** after/768-2 (Teach title at about y 427, Practice and Lab at about y 436); after/1280-2 (Teach title at about y 307, the others at about y 317).

**Evidence:** content is centred vertically in each card, so the third line on Teach moves its icon and title up compared with the neighbouring cards. The row looks slightly uneven.

**Fix:** align card content to the top (`justify-content: flex-start` in the column layout, `align-items: flex-start` in the row layout) with fixed top padding, so that icons and titles line up across the row.

### N-10: The Teach accent shifted from golden to brown (Low)

**Where:** css/galaxy.css:666 (`--a: #9A6700`; it was `#C98A00`).

**Evidence:** the darker gold was needed for 4.5:1 text contrast and looks olive or brown next to the bright accents (after/1280-2). This is a small change to the colour identity.

**Fix:** keep `#9A6700` for the counter text only. Use the original `#C98A00` (or the `--sun` family) for the border and icon tile; white on `#C98A00` is about 3.0:1, which is enough for a large icon. Alternatively, use a navy glyph on a `--sun` tile.

## Summary of severities

| Severity | Count | IDs |
|---|---|---|
| Critical | 0 | |
| High | 0 | |
| Medium | 2 | N-01, N-02 |
| Low | 8 | N-03 to N-10 |

## Verdict

**Ready for owner review.** There are no Critical or High findings. The redesign meets items 1, 2, 3 and 5-10 of the brief and partly meets item 4. I recommend fixing N-01 (the stretched Lab card on phones) and N-02 (the 320 px grown-up wrap) before publishing, because both are visible on the main phone layout and each is a one- or two-line CSS change. Navigation, keyboard order, focus visibility, touch targets and text contrast all pass, and no teaching content or math was changed.


## Fixes after the review (main session)

- **N-01 fixed:** equal-height rows only from 700 px up; on phones the Lab card is sized to its content.
- **N-02 fixed:** at 359 px and narrower, "For grown-ups" sits on its own line above Progress · Parent Settings, which stay together.
- **N-04 fixed:** the home-card label now begins with the visible word "Start".
- **N-06 fixed:** activity cards have a clear label (e.g. "Teach: Show me how. 1 of 13 lessons done.").
- **Open (Low), for the owner to decide:** N-03, N-05, N-07, N-08, N-09 and N-10.

These fixes were not re-inspected by the auditor; there were no Critical or High findings to recheck.
