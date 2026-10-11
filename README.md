# Galaxy Math 🚀

A space-themed, third-grade math learning application. This repository starts from the working **Galaxy Flash Cards** prototype and is being expanded through verified phases.

## Current status

**Multiplication is complete.** It has Teach (10 lessons), Practice, Flashcards and Test, plus a Progress page for grown-ups. Division opens to a menu where every activity is marked Coming soon. Addition and Subtraction are Coming Soon. See `STATUS.md` for what was tested.

| Multiplication activity | What it does |
|---|---|
| **Teach** | Ten lessons. Each one goes Goal → Picture → Worked example → Try it together (hints) → Check yourself (3 questions) → Finish. A lesson counts as complete only when at least 2 of the 3 check questions are right. |
| **Practice** | Choose times tables and 10/20/30 questions. There is no timer. Question types are facts, missing factors, equal groups, arrays, repeated addition and word problems. Hints are available on request. A child gets two tries, then an explanation with a picture. Ends with a review screen. **Practice my misses** reuses facts missed in Practice or Test. |
| **Flashcards** | The original purple cards in vertical notation. Flip on tap, or reveal after 2/3/5/10 s with a separate answer-hold time. Sessions last 3/5/10 min, with pause, shuffle and previous/next, and end with a summary. Flashcards never start a test, and their settings are separate from Test. |
| **Test** | 10/20/36 questions, untimed or 2/3/5/10 s each, with no hints. Unanswered questions count against the total. Results show the percentage, correct/incorrect/unanswered, missed facts, accuracy by table and speed (timed tests only). Buttons offer Retry missed and Retake. |
| **Progress** | Lessons, practice, tests, accuracy and mastery by table, missed facts and milestones. A table is mastered at 90% or better in two separate full tests with at least 5 questions from that table each time. Everything is stored only in this browser. |

## Tests

`npm test` (unit, Node 22+) and `npm run test:browser` (headless Chrome or Edge; set `CHROME_PATH` if needed). No dependencies to install.

To run the browser suite against the published site instead of a local server:
`LIVE_URL=https://bazeocrisy.github.io/Galaxy-Math/ npm run test:browser`

## Live testing site (GitHub Pages)

**URL:** https://bazeocrisy.github.io/Galaxy-Math/

| Branch | Role |
|---|---|
| `main` | Released code. Changed only by merging an approved pull request. |
| `feature/galaxy-math-foundation` | Development. Every finished phase is committed and pushed here. |
| `gh-pages` | **Testing site.** GitHub Pages publishes this branch from `/ (root)`. It holds owner-approved builds of the feature branch plus an empty `.nojekyll`. |

Pages settings (already configured): *Settings → Pages → Build and deployment → Deploy from a branch → `gh-pages` / `/ (root)`*.

### Publishing an approved build

Only publish a build the owner has approved. From a clean checkout:

```sh
git fetch origin
npm run publish:pages            # publishes origin/feature/galaxy-math-foundation
npm run publish:pages -- <ref>   # or a specific approved commit
```

`scripts/publish-gh-pages.mjs` does the following and stops at the first problem:

1. Checks that Pages is set to `gh-pages` at `/`, then runs `npm test`.
2. Merges the approved commit into `gh-pages` with `--no-ff` in a temporary worktree. It never force-pushes and never touches `main` or the feature branch. It then pushes `gh-pages`.
3. Waits for the GitHub Pages build of that exact `gh-pages` commit to report `built`.
4. Downloads every app file (`index.html`, `css/`, `js/`, `assets/`) from the public URL and compares it byte-for-byte with the commit.
5. Runs the full browser suite against the public URL (`LIVE_URL=…`).

To check the current live site without publishing anything, run `npm run verify:pages`. It runs steps 3–5 for the current `origin/gh-pages`.

The full browser suite takes a few minutes. To keep steps short, add `-- --skip-browser` (for example `npm run publish:pages -- --skip-browser`) and then run `LIVE_URL=https://bazeocrisy.github.io/Galaxy-Math/ npm run test:browser` as its own step.

The script authenticates with the same GitHub login `git push` uses (`git credential fill`). The GitHub CLI isn't required.

## Subjects

| Subject | Status |
|---|---|
| Addition (+) | Coming Soon placeholder |
| Subtraction (−) | Coming Soon placeholder |
| Multiplication (×) | **Complete:** Teach, Practice, Flashcards, Test, Progress |
| Division (÷) | Next. The menu exists, but every activity is locked. |

## Project layout

| File | Purpose |
|---|---|
| `index.html` | Page shell and screen containers |
| `css/galaxy.css` | Design system: tokens, light panels, buttons, controls, flashcard and test styles |
| `js/registry.js` | Subjects and which activities are ready; hash routes |
| `js/mult-math.js` | Multiplication engine: facts, question types, hints, explanations, test decks, scoring, mastery |
| `js/visuals.js` | Equal groups, arrays, number-line jumps and labelled equations as inline SVG |
| `js/mult-lessons.js` | The ten Teach lessons |
| `js/progress.js` | Local progress (versioned `localStorage` key `galaxy-math.progress`, in-memory fallback) |
| `js/app.js` | Router, shared components and the activity screens |
| `tests/` | Unit tests (`node --test`) and the headless-Chrome browser suite |

## Run locally

Open `index.html` in a modern browser. No build system or login is required. The scripts are plain (non-module) files, so the page also works when opened straight from disk.

## For Claude Code

Read `CLAUDE.md`, `docs/PRODUCT_SPEC.md`, and `STATUS.md` before any edits. Preserve the baseline; build on a feature branch and test each milestone. Do not deploy or merge without owner approval. When a build is approved for testing, publish it with `npm run publish:pages` (see above).

## Privacy

No child names, profiles, telemetry, external API calls, or student records should be committed. Save any progress locally in the browser.

MIT licensed; see LICENSE.