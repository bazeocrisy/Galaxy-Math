# Galaxy Math — Development Status

Updated: 2026-10-11 (branch `feature/galaxy-math-foundation`; not merged to `main`; Phase 1–2 build live on the `gh-pages` testing site)

## Phase 1 — Baseline audit (done)

Audited the single-file prototype (`index.html`). Findings:

| # | Baseline issue | Result |
|---|---|---|
| 1 | `askCard()` called `tickDown()` on the next animation frame, so a 5-second card really gave ~4 seconds. | **Fixed.** First tick now comes from the 1-second interval. Browser test checks the ring shows 5 at start and 4 after ~1 s. |
| 2 | `endPractice()` forced a 10-card quick check when flashcard time ran out. | **Fixed.** Time-out now shows the "All done!" report with an *optional* "Quick check" button. |
| 3 | `endPractice()` overwrote the user's chosen test timer (`secs`) with the flashcard speed. | **Fixed.** Each test run now takes its own seconds value (`startTest(deck, seconds)`). |
| 4 | Timer-choice and speed controls were `<span>`s (not keyboard reachable). | **Fixed.** Now `<button>`s with `aria-pressed`. |
| 5 | Stored table list was trusted without validation. | **Fixed.** Values outside 1–12 are ignored; storage failures fall back to defaults. |
| 6 | Galaxy background ended where content ended on tall phone screens. | **Fixed** (`min-height:100vh`). |
| 7 | Only × facts exist; no division, Teach or Practice. | Still true — see "Not yet implemented". |
| 8 | Test mode always uses all 12 facts per selected table (144 for "All"). | Open — Phase 6 (10/20/36 questions). |
| 9 | Fredoka font loads from Google Fonts; offline it falls back to system fonts. | Open — consider self-hosting the font file. |

The personal name from the original prototype does not appear anywhere in the page.

## Phase 2 — Landing page and activity menus (done, awaiting owner review)

- [x] Original rocket-and-planet SVG logo (`assets/galaxy-math-logo.svg`) and favicon (`assets/favicon.svg`); no hotlinked graphics.
- [x] Subject registry (`js/registry.js`): Addition, Subtraction (Coming Soon), Multiplication, Division; which activities are ready.
- [x] Four-card landing page. Addition/Subtraction are `aria-disabled`, dashed, labeled **Coming Soon**; tapping them shows a friendly message and does not navigate.
- [x] Activity menu per open subject: **Teach · Practice · Flashcards · Test**.
  - Multiplication: Flashcards and Test work; Teach and Practice show **Coming soon** and do nothing.
  - Division: the menu opens, but all four activities are marked **Coming soon** and the subtitle says lessons are being built.
- [x] Hash routes (`#/`, `#/multiplication`, `#/multiplication/flashcards`, `#/multiplication/test`). Links to locked subjects or unfinished activities redirect to the nearest safe screen. Browser Back works and stops any running session timers.
- [x] Original galaxy theme, flashcard animation, vertical × cards, number pad and results preserved.
- [x] Focus moves to the screen heading on navigation; visible focus ring; reduced-motion turns off star twinkle and card/ring animations.

## Tests (all run 2026-10-11 on this branch)

- `npm test` — 11/11 unit tests (registry, routing guards, local file references, no external scripts/analytics, self-contained SVGs).
- `npm run test:browser` — 76/76 headless-Chrome checks: landing at 320, 375, 390, 768 and 1280 px (no horizontal overflow, text fits, touch-target size, logo loads, background fills screen); disabled-card behavior; menu contents and readable disabled labels; redirects; flashcards start/stop; no timers after Menu, Quit or browser Back; time-out shows report (no forced test); optional quick check; test countdown; correct answer graded; page works when localStorage throws; no page errors; no missing files.
- Screenshots: `docs/screenshots/` (landing 390 px and 1280 px, Multiplication and Division menus).
- Not tested: real phones/tablets, Safari/Firefox, screen readers (headless Chrome only, locally and on the public URL).

## Deployment — GitHub Pages testing site (verified 2026-10-11)

- **URL:** https://bazeocrisy.github.io/Galaxy-Math/
- **Pages source:** `gh-pages` branch at `/ (root)`. It was already configured, so no settings change was needed (GitHub API: legacy build, public, HTTPS enforced).
- **Published commit:** `gh-pages` `b5bd614` = Phase 1–2 app commit `2b8ad91` + empty `.nojekyll`. The diff against the feature branch at `2b8ad91` is only `.nojekyll`.
- **Pages build:** `built` for `b5bd614` (2026-10-11 10:42 UTC).
- **Live files:** `index.html`, `js/registry.js`, `assets/galaxy-math-logo.svg` and `assets/favicon.svg` match the commit byte-for-byte.
- **Live browser suite** (`LIVE_URL=https://bazeocrisy.github.io/Galaxy-Math/ npm run test:browser`): **77/77 pass** on the public URL. It covers:
  - the landing page at 320, 375, 390, 768 and 1280 px
  - Addition and Subtraction showing Coming Soon and not opening
  - all four Division activities being locked, including direct links
  - Multiplication menu, Flashcards and Test
  - Menu, Quit and browser Back navigation with no leftover timers
  - no failed requests and no page errors
- I reviewed the live screenshots of the landing page (phone and desktop) and the Division menu by eye.
- **Repeatable process:** `npm run publish:pages` publishes an approved build. `npm run verify:pages` re-checks the live site. Both are documented in README.md. `verify:pages` was run against the live site and passed.

## Not yet implemented

- [ ] Multiplication Teach and Practice lessons (Phase 3).
- [ ] Division Teach and Practice lessons (Phase 4).
- [ ] Division and mixed flashcards; family/answer-hold/session options (Phase 5).
- [ ] Unified Test: 10/20/36 questions, timed or untimed, unanswered counted, results by family (Phase 6).
- [ ] Parent progress screen and local mastery (Phase 7).
- [ ] Full accessibility / cross-device regression pass (Phase 8).

## Notes for the owner

- `CLAUDE.md` and `README.md` mention a `worksheets/` folder and a `LICENSE` file; neither exists in this repository.

## Next Claude action

Owner tests Phase 1–2 on the live testing site (screenshots in `docs/screenshots/`). After approval, start Phase 3 (Multiplication Teach and Practice). Do not merge to `main` or publish to `gh-pages` without authorization. For approved builds, use `npm run publish:pages`.
