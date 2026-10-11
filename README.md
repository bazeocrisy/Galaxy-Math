# Galaxy Math 🚀

A space-themed, third-grade math learning application. This repository starts from the working **Galaxy Flash Cards** prototype and is being expanded through verified phases.

## Current status

**Multiplication 2.0.** Five activities, a shared question bank of 12 kinds of problems, Parent Settings and a Progress page. Division opens to a menu where every activity is locked. Addition and Subtraction are Coming Soon. See `STATUS.md` for what was tested and `AUDIT-REPORT.md` for the independent audit.

| Activity | Purpose | What the child does |
|---|---|---|
| **Teach** | Show me how | 13 lessons. Each one goes Goal → Explanation → See it (picture) → Worked example → Try it together (hints) → Check yourself (3 questions) → Finish. A lesson counts as complete only when at least 2 of the 3 check questions are right. |
| **Practice** | Let me try | Press Start: 10 mixed problems (no timer). Help comes in steps: a clue after the first miss, a strategy with a picture after the second, then a worked explanation. **Practice my misses** brings back missed problems of the same kind. |
| **Math Thinking Lab** | Make me think | Choose 10, 25 or 50 problems. Kinds of problems are mixed and never named before answering. There are no hints, one try per problem, and Skip is allowed. Every answer gets an explanation. The report shows results by kind of problem, missed problems, recommended lessons and Practice my misses. |
| **Flashcards** | Help me remember | Pick a times table (or Mixed) and press Start. The answer shows after 5 seconds (or sooner with *Show answer*). Pause and *I'm done* are available. |
| **Test** | Show what I know | Press Start. No hints. Unanswered questions count against the total. Results show the percentage, missed facts, accuracy by table and speed (timed tests only). |

**Parent Settings** (saved on the device, not locked) cover times tables, 11s/12s extension, problems per practice, which kinds of problems the Lab uses, flashcard timing, session length and order, and test questions, timer and tables. **Progress** keeps four kinds of evidence apart:
- understanding (lessons)
- practice (with hints)
- reasoning (Lab)
- independent tests

It shows results by kind of problem and by times table. Statuses are constructive ("Just starting", "Growing", "Getting stronger", "Strong"). A table is mastered at 90%+ in two separate tests. A kind of problem is "Strong" only after 10+ problems at 90%+ across 2+ sessions.

### The question bank (`js/mult-bank.js`)

| | Kind | Skill | Lesson |
|---|---|---|---|
| A | Multiplication facts | Recall or work out a product | Strategies |
| B | Missing factor | Find an unknown factor | Missing factors |
| C | Repeated addition | Add equal groups (groups and size shown) | Repeated addition |
| D | Match the equation | Connect addition or a picture to an equation | Pictures, addition and equations |
| E | Equal groups | Total of equal groups | Equal groups |
| F | Arrays | Rows × columns | Arrays |
| G | Switch the order | Commutative property | Switch the order |
| H | Fact families | × and ÷ facts with the same three numbers | Fact families |
| I | Word problems | Find equal groups in a story (short and long stories) | Word problems |
| J | Check the work | Decide if an answer is right; fix it | Check the work |
| K | Times as many | Multiplicative comparison (a grade-4 stretch, marked as a challenge) | Times as many |
| L | Equal products | Keep an equation balanced (4 × 6 = 3 × ?) | Equations |

Each generated problem has:
- a stable type ID, skill, difficulty and related lesson
- the prompt, the correct answer and the accepted answer format
- distractors (multiple choice only)
- a picture, a clue, a strategy and a worked explanation

Rules that keep the choices fair:
- Multiple-choice distractors never include a second correct answer. For example, *6 × 4* is never offered beside *4 × 6* when matching *6 + 6 + 6 + 6*.
- Fact-family distractors are true facts from other families, so a child never sees a false fact shown as an option.
- Unit tests check every type against every fact from 1 × 1 to 12 × 12.

## Tests

`npm test` (unit, Node 22+) and `npm run test:browser` (headless Chrome or Edge; set `CHROME_PATH` if needed). No dependencies to install.

Run the browser suite in Edge: `CHROME_PATH="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" npm run test:browser`.

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
| Multiplication (×) | **2.0:** Teach, Practice, Math Thinking Lab, Flashcards, Test, Parent Settings, Progress |
| Division (÷) | Next. The menu exists, but every activity is locked. |

## Project layout

| File | Purpose |
|---|---|
| `index.html` | Page shell and screen containers |
| `css/galaxy.css` | Design system: tokens, light panels, buttons, controls, flashcard and test styles |
| `js/registry.js` | Subjects and which activities are ready; hash routes |
| `js/mult-math.js` | Multiplication engine: facts, original question generators, test decks, scoring, mastery |
| `js/mult-bank.js` | Shared question bank (12 kinds A–L), mixed sessions, Lab unlock rules, skill statuses |
| `js/visuals.js` | Equal groups, arrays, number-line jumps and labelled equations as inline SVG |
| `js/mult-lessons.js` | The 13 Teach lessons |
| `js/progress.js` | Local progress (versioned `localStorage` key `galaxy-math.progress`, v1 data migrated, in-memory fallback) |
| `js/app.js` | Router, shared components and the activity screens |
| `tests/` | Unit tests (`node --test`) and the headless-Chrome browser suite |

## Run locally

Open `index.html` in a modern browser. No build system or login is required. The scripts are plain (non-module) files, so the page also works when opened straight from disk.

## For Claude Code

Read `CLAUDE.md`, `docs/PRODUCT_SPEC.md`, and `STATUS.md` before any edits. Preserve the baseline; build on a feature branch and test each milestone. Do not deploy or merge without owner approval. When a build is approved for testing, publish it with `npm run publish:pages` (see above).

## Privacy

No child names, profiles, telemetry, external API calls, or student records should be committed. Save any progress locally in the browser.

MIT licensed; see LICENSE.