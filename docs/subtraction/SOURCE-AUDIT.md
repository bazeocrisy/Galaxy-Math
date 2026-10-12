# Subtraction with regrouping: source audit (before integration)

Date: 2026-10-11. Auditor: the integration engineer (Claude Code main session). An independent QA agent checks this audit in [SUBTRACTION-INTEGRATION-AUDIT.md](SUBTRACTION-INTEGRATION-AUDIT.md).

## 1. The source archive

**Archive:** `C:\Users\bazeocrisy\Downloads\Mathbook-main.zip` (50,796,672 bytes, dated 2026-10-11 20:09).

**How it was identified:** all 23 ZIP files in Downloads were listed. Only this archive contains `assets/js/subtract/`, and none of the others contain anything named *subtract*.

**Version: verified, not assumed.**
- The archive has no `.git` folder. Its ZIP comment holds `55b51bdda5a81ed00838433603bfa20daeb10efb`, which is where GitHub stamps the commit an archive was built from.
- `git ls-remote https://github.com/bazeocrisy/Mathbook refs/heads/main` returned the same SHA, so the archive is current `main`.
- The GitHub API returned the blob IDs of the five files we reuse at that commit. Each one equals `git hash-object` of our copy (see §4).

**Handling:** the archive was only read; it was neither changed nor moved. It was extracted into a scratch folder outside both repositories. Mathbook (GitHub, and the local clones in `~/Projects/Mathbook*`) was never written to: no edit, commit, fetch, push, branch or rename.

## 2. Required files

All 15 required files are present.

| Group | Files | Present |
|---|---|---|
| Reusable component | `assets/js/subtract/sub-math.js` (22,425 B), `assets/js/subtract/sub-workspace.js` (57,917 B), `assets/css/subtract-workspace.css` (10,393 B) | ✅ |
| Teaching application | `curriculum/supplemental/subtract-regrouping/content.js`, `app.js`, `index.html`, `section.css` | ✅ |
| Documentation | `docs/supplemental/subtract-regrouping/INTEGRATION.md`, `SPEC.md`, `DESIGN.md`, `design-review.md`, `math-test-review.md` | ✅ |
| Tests | `tests/subtract-math.test.js`, `tests/subtract-regrouping.test.js`, `tests/subtract-regrouping.browser.mjs` | ✅ |

## 3. What is implemented and tested (from INTEGRATION.md, then checked)

**Component.** `SubtractKit.mount(el, options)` has five modes: `demo`, `guided`, `independent`, `test` and `view`.
- **Methods:** `getState`, `setState`, `check`, `result`, `hint`, `showSolution`, `undo`, `clearWork`, `reset`, `on`/`off` and `destroy`, plus `SubtractKit.validState`.
- **Events:** `answer`, `step`, `hint`, `complete`, `reset` and `change`.
- **Theming:** `--sk-*` CSS variables.
- **Side effects:** it never touches storage and adds no listeners to the document or window. I checked with grep: there are no `localStorage` or `document.addEventListener` calls in either JS file.

**Math (`SubtractKit.math`).**
- Operands satisfy 0 ≤ bottom ≤ top ≤ 9,999.
- The standard right-to-left method makes one adjacent exchange at a time through zeros.
- Difficulty levels:
  - **none:** no exchange.
  - **easy:** exactly one exchange.
  - **medium:** two or more exchanges, with no zero chain.
  - **hard:** an exchange passes through a zero; `chain` counts the zeros.
- A 2-digit problem can only be Easy, and `unavailableReason` explains why for each unsupported combination.
- `generateSession` never repeats a pair.
- Grading reads only the final answer. Regroup marks are reported separately.

**Teaching content (`content.js`).** It has no DOM and no storage. It holds:
- 9 Learn steps with worked examples and seeded Your Turn generators;
- Practice Together problems and targeted skills;
- the 15-question test blueprint;
- the Practice setup (sizes, difficulties and lengths);
- the Parent Guide.

**Tests run here against the untouched staged source:**
- `node --test tests/subtract-math.test.js tests/subtract-regrouping.test.js`: **19/19 pass**.
- `node tests/subtract-regrouping.browser.mjs` (headless Chrome, foreground): **94/94 pass**. This covers:
  - mounting without Mathbook, and two instances side by side;
  - exporting and restoring state, and rejecting bad state;
  - `destroy()` removing its listeners;
  - a host theme keeping the columns aligned;
  - **test mode never showing hints, Check or the solution, even if asked**;
  - real mouse clicks, touch at 390 px and keyboard focus;
  - regrouping a guided zero chain.

## 4. Hashes (the core copies are unchanged)

| Galaxy Math path | Mathbook path | SHA-256 (archive entry = Galaxy copy) | Git blob (GitHub @ 55b51bd = Galaxy copy) |
|---|---|---|---|
| `js/subtractkit/sub-math.js` | `assets/js/subtract/sub-math.js` | `979083c4bc2cedb3719b3cfb7c98d29f7e28e0bf5ceef8cc82c709d425c707cd` | `e71689b69df874b4d25fd7bbc0d643c7d6397688` |
| `js/subtractkit/sub-workspace.js` | `assets/js/subtract/sub-workspace.js` | `55622222ea9458bcb317fbf2662a36ea7dc265dafd303156d8cb8db56dd0db68` | `b9d5fd740d1c957e15ef805d78e5a534a6a2741e` |
| `css/subtractkit/subtract-workspace.css` | `assets/css/subtract-workspace.css` | `0f1da5fd7e816252e2f5dbccbbd7b0b815dbd9c05b9089f7affdcb8a9790cc35` | `0f837fa017990f58584f4743ff1b3d89bed07a02` |
| `js/subtraction-vendor/content.js` | `curriculum/supplemental/subtract-regrouping/content.js` | `ec6d6879a5076704723a065f6f03afe93996a26734173e2dead56fbdd39979e8` | `49f52efca034fda46eb1d0b65f8d8811876aacf0` |
| `js/subtraction-vendor/place-value.js` | `assets/js/place-value.js` | `5221dc674f51549a53e148e2caaee6494ed213a562707b6f895dc6ad81487c34` | `39aa2f77f4cf7eeb377c831bd23a695472d0679a` |

These are computed, not typed: the archive entry and the Galaxy copy were hashed separately and are equal. The GitHub blob IDs come from the GitHub contents API at commit 55b51bd. `tests/subtraction.test.mjs` (`VENDORED`) holds the same SHA-256 values and fails if any byte changes.
- `.gitattributes` marks these folders `-text`, so Git's line-ending conversion on Windows can never alter them.
- `git ls-tree HEAD` shows the committed blobs equal GitHub's.

## 5. Previously reported issues: current status in the source

I checked these against the code and the two review documents, not from memory. Every finding in both reviews is closed.

| Issue | Status at 55b51bd | Evidence |
|---|---|---|
| **SR-M01** (one bad value discards a whole record) | Closed | math-test-review "Re-check of SR-M01 … SR-M10": entry-by-entry sanitizers, with good entries kept after forged saves. *Galaxy note:* these sanitizers live in Mathbook's `app.js`, which we do not import. Galaxy's own store (`js/sub-store.js`) follows the same rule and is unit-tested for it. |
| **SR-M02** (unchecked values stop a screen) | Closed | Same re-check: all 13 routes render with damaged data. *Galaxy note:* our adapter validates each saved response against its question (`validResponse`), and each workspace state with `SubtractKit.validState`. |
| Hint behaviour (SR-M04: hints restart per column; level 1 never gives the answer) | Closed | Re-check and Phase A. Confirmed here: `TEXT.hintLabel` / `S.hintCol` in `sub-workspace.js`. |
| Show me (SR-D28–D30, the Show me player) | Closed | Exchanges are shown before answers. The child's grid fills only at the last part. `answer`/`complete` fire with `helped: true, shown: true`. |
| Assisted completion | Closed | `S.helped` is sticky in the state. Mathbook records help and never counts it as independent. |
| State restoration (SR-D30, refresh mid-play) | Closed | `S.show` and `shownDone` are validated in `validState`. |
| Test-mode answer protection | Closed | `allowHints` / `allowCheck` / `allowSolution` are false in test mode whatever the options say, and `hint()` / `showSolution()` do nothing (Mathbook browser test). Confirmed again in Galaxy's browser suite. |
| Destroy and remount (SR-M11: methods threw after `destroy()`) | Closed (a27f1fa) | After `destroy()` every method is a safe no-op. One `AbortController` removes all listeners. |
| Browser compatibility | Supported, with limits | Needs `AbortController`, CSS grid and container queries (`cqi`, `@container`), so any current Chrome, Edge, Firefox or Safari. The workspace has **not** been tested on real devices or in Safari or Firefox. |

**Open minor note in the source** (not a defect): Mathbook keeps a refresh-mid-demo position for some players only. design-review SR-D26 accepts it by decision.

## 6. Integration limitations and decisions

- **Reused unchanged:** the three SubtractKit core files, `content.js` (lessons, examples, Your Turn generators, skills, test blueprint, setup) and `place-value.js` (block SVGs). None needed changes.
- **Adapted, not imported:**
  - Mathbook's adapter `app.js` (its shell, router and `mathbook:v2:` storage) is **not** loaded.
  - The Learn question forms (blocks exchange, decide, mistake, check), their wording and the grading helpers were ported into `js/sub-galaxy.js`, without the shell, router or storage. The source is cited in the file header.
- **Not brought over:**
  - **Practice Together** (parent-led guided set), **Practice One Skill** and the **Parent Guide** pages. Practice here is "Practice on My Own" with the original setup. These are listed as known gaps.
  - **Math Thinking Lab** and **Flashcards** have no verified subtraction implementation in the source, so they stay **Coming soon**.
- **Storage:** Galaxy stores subtraction under its own key, `galaxy-math.subtraction` (v1). Multiplication and Division (`galaxy-math.progress`) and Parent Settings (`galaxy-math.settings`) are never read or written by subtraction code.
