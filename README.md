# Galaxy Math 🚀

A space-themed, third-grade math learning application. This repository starts from the working **Galaxy Flash Cards** prototype and is being expanded through verified phases.

## Current status

**Multiplication 2.0, Division 1.0 and Subtraction 2.0.** All three subjects have the same five activities (Teach, Practice, Math Thinking Lab, Flashcards, Test), their own Parent Settings and their own Progress page. Subtraction reuses Mathbook's SubtractKit unchanged. Addition is Coming Soon. See `STATUS.md` for what was tested and `AUDIT-REPORT.md` for the independent audit.

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

## Division 1.0

Division uses the same screens as Multiplication. A subject profile (`PROFILES` in `js/app.js`) swaps the fact engine, question bank, lessons and wording.
- **Teach:** 15 lessons in three units: What division means · Division and multiplication · Use it and check it.
  - The lessons in order: What division means, Equal sharing, Equal grouping, Sharing or grouping?, Division equations (dividend, divisor, quotient and the division bracket), Arrays and division, Repeated subtraction, Divide using multiplication, Fact families, Missing divisors, Missing dividends, Division word problems, Check with multiplication, and Find and fix mistakes.
  - Leftovers (remainders) comes last and is labelled as an extension. Every other problem in the app divides exactly.
- **Practice, Lab, Flashcards and Test** work as they do in Multiplication.
  - Flashcards and Test use divisor families (÷1–÷10 core, ÷11–÷12 extension). A card shows *42 ÷ 7* and then *42 ÷ 7 = 6*.
  - A family is mastered at 90%+ in two separate tests.
- **Progress and settings:** kept separately from Multiplication.
  - Progress is v3: `{ v: 3, mult, div }`. Older data is upgraded into `mult`, and resetting one subject never touches the other.
  - Settings are stored per subject.

### The division question bank (`js/div-bank.js`)

| | Kind | Skill | Lesson |
|---|---|---|---|
| A | Division facts | Find a quotient using a multiplication fact | Divide using multiplication |
| B | Missing divisor | 24 ÷ ? = 6 | Missing divisors |
| C | Missing dividend | ? ÷ 4 = 6 | Missing dividends |
| D | Equal sharing | Number of groups known; find how many in each (plates picture) | Equal sharing |
| E | Equal grouping | Group size known; find how many groups (circled groups) | Equal grouping |
| F | Arrays | Use rows and columns to divide | Arrays and division |
| G | Repeated subtraction | Take away equal groups on a number line | Repeated subtraction |
| H | Fact families | Connect × and ÷ facts with the same three numbers | Fact families |
| I | Related multiplication | Use or check with a multiplication fact | Check with multiplication |
| J | Match the equation | Connect a picture to a division equation | Division equations |
| K | Word problems | Sharing or grouping stories (short and long) | Division word problems |
| L | Who is right? | Find and explain a division mistake (challenge) | Find and fix mistakes |

The bank follows these rules:
- No question divides by zero.
- Every picture holds exactly the numbers in the question.
- Sharing and grouping are never mixed up.
- No multiple-choice question has two correct options. For example, *Match* never offers *p ÷ q* beside *p ÷ d*, and *Related* never offers *q × d*.
- Fact-family distractors are true facts from other families.
- `js/bank-kit.js` holds the session, unlock and scoring logic that both banks share.

## Subtraction with regrouping (Mathbook SubtractKit)

Subtraction is not a second engine. It reuses Mathbook's SubtractKit **unchanged**, copied byte-for-byte from `bazeocrisy/Mathbook` @ `55b51bd`. See `docs/subtraction/SOURCE-AUDIT.md` for the hashes.

| Folder | What it is |
|---|---|
| `js/subtractkit/` and `css/subtractkit/` | The math (`sub-math.js`), the vertical workspace (`sub-workspace.js`) and its styles. **Do not edit**: `tests/subtraction.test.mjs` checks their SHA-256, and `.gitattributes` stops line-ending conversion. |
| `js/subtraction-vendor/` | Mathbook's teaching content (`content.js`: lessons, worked examples, Your Turn generators, skills, test blueprint, practice setup) and block pictures (`place-value.js`), also unchanged. |
| `js/sub-galaxy.js` | The Galaxy adapter. It handles navigation, the Teach, Practice, Test and Progress screens, and saving. It mounts workspaces with `SubtractKit.mount(el, options)` and destroys them on every route change. The Learn question forms are adapted from Mathbook's section adapter. |
| `js/sub-store.js` | Subtraction progress under its own key, `galaxy-math.subtraction` (v1). Each record is cleaned on its own. It never touches `galaxy-math.progress` (Multiplication and Division). |

- **Teach:** 9 lessons in three units.
  - The lessons are: Regrouping keeps the value (base-ten blocks), One exchange (52 − 27, 463 − 128), More than one exchange (532 − 168), Four-digit numbers (4,532 − 1,768), Across a zero, Across zeros next to each other (3,002 − 1,578), Do I need to regroup?, Find and fix mistakes, and Check with addition.
  - Each lesson goes Goal → See it (step-by-step demos with Back and Next, old digits crossed out and new values written above) → Your turn (guided decisions or a question with Hint and Show me) → Finish.
- **Practice:** 2, 3 or 4 digits, or Mixed; Easy, Medium, Hard or Mixed; 10, 25 or 50 problems.
  - These are the source generator's own definitions. 2-digit Medium and Hard are not possible, and the screen says why.
  - The workspace has regroup marks, Undo, Clear work, Check, specific feedback, Hints 1–4 and Show me. Work is kept after help.
  - **Each problem's outcome is recorded once** as one of: on your own, right after hints, completed with Show me, not right, or skipped. **Help is never counted as independent.**
- **Test:** Mathbook's 15-question blueprint (new numbers each time), in SubtractKit **test mode**: no Hint, Check, feedback or solution.
  - Questions can be answered in any order and are saved as you go.
  - Grading happens at Finish. The report gives correct, not right and unanswered; accuracy by kind of question and by difficulty; recommended lessons and practice; and worked answers, available only after finishing.
- **Progress** (for grown-ups): lessons (on own versus with help), the five practice outcomes (with first-try credit), the Lab, Flashcards (exposure only), tests, and a Reset that clears Subtraction progress only.

### Subtraction 2.0: Math Thinking Lab and Flashcards

**Math Thinking Lab** (`js/sub-bank.js`, a question adapter around SubtractKit.math)
- **Format:**
  - 10, 25 or 50 problems in the shared Galaxy Lab screen, one at a time.
  - No hints and no timer. The kind of problem is named only after answering. Skip is allowed.
  - After each answer: the right answer, a short worked explanation, and "See it worked" (SubtractKit's demo mode).
  - Regrouping problems are answered in SubtractKit's test-mode grid.
- **Mix:** a session uses every allowed kind before repeating one, never repeats a problem, and never gives the same kind twice in a row.
- **Size grows with readiness:**
  - Level 1: 2- and 3-digit numbers, one exchange.
  - Level 2: adds more exchanges, across one zero and 4-digit numbers with one exchange.
  - Level 3: everything up to 4-digit numbers across zeros.
  - A parent can fix the level in Parent Settings.
- **Report:** accuracy, right / not right / skipped, results by kind, missed problems with explanations, recommended lessons, Practice my misses (new problems of the missed kinds) and Start another challenge.
- **Records:** Lab results are kept apart from Practice and the Test.

| | Kind | | Kind |
|---|---|---|---|
| A | Vertical subtraction (in the workspace) | G | Word problems |
| B | Missing number taken away | H | Estimate and check (reasonable answers) |
| C | Missing starting number | I | Place value of a regrouped number |
| D | Correct exchanges | J | Regrouping across zeros |
| E | Find and fix mistakes | K | Compare strategies |
| F | Check with addition | L | Match a bar model or story to an equation |

**Flashcards**
- **Decks:** 2-digit, 3-digit, 4-digit or Mixed, using problems from SubtractKit's generator. There are three mixes: Gentle, Standard (the default) and Challenge.
- **Timing:** the answer shows after 8, 12 or 15 seconds, depending on the size of the numbers. It can also be shown early with a tap, and the cards can be paused. Cards never move on by themselves.
- **After the answer:**
  - "See the regrouping" plays SubtractKit's demo.
  - The child can tap "I knew it" or "Not yet". This is recorded as practice and confidence only, never as mastery.
- **Parent Settings (Subtraction):** reveal time, cards per session, the problem mix and the Lab size. They are stored in `galaxy-math.subtraction` (v2), not in the other subjects' settings.

## Tests

`npm test` (unit, Node 22+) and `npm run test:browser` (headless Chrome or Edge; set `CHROME_PATH` if needed). The browser command runs the Multiplication suite (`tests/browser.test.mjs`), the Division suite (`tests/browser-division.test.mjs`) and the Subtraction suites (`tests/browser-subtraction.test.mjs`, `tests/browser-subtraction2.test.mjs`). No dependencies to install.

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
| Subtraction (−) | **2.0 (Mathbook SubtractKit):** Teach (9 lessons), Practice, Math Thinking Lab, Flashcards, Test, Parent Settings, Progress |
| Multiplication (×) | **2.0:** Teach, Practice, Math Thinking Lab, Flashcards, Test, Parent Settings, Progress |
| Division (÷) | **1.0:** Teach (15 lessons), Practice, Math Thinking Lab, Flashcards, Test, Parent Settings, Progress |

## Project layout

| File | Purpose |
|---|---|
| `index.html` | Page shell and screen containers |
| `css/galaxy.css` | Design system: tokens, light panels, buttons, controls, flashcard and test styles |
| `js/registry.js` | Subjects and which activities are ready; hash routes |
| `js/mult-math.js` | Multiplication engine: facts, original question generators, test decks, scoring, mastery |
| `js/bank-kit.js` | Logic shared by both banks: mixed sessions, Lab unlock rules, skill statuses, scoring |
| `js/mult-bank.js` | Multiplication question bank (12 kinds A–L) |
| `js/div-math.js` | Division facts and test decks (built on the multiplication engine; never ÷0) |
| `js/div-bank.js` | Division question bank (12 kinds A–L) |
| `js/div-lessons.js` | The 15 division Teach lessons |
| `js/visuals.js` | Equal groups, arrays, number-line jumps, sharing plates, circled groups, the division bracket and labelled equations as inline SVG |
| `js/mult-lessons.js` | The 13 Teach lessons |
| `js/subtractkit/`, `css/subtractkit/`, `js/subtraction-vendor/` | Mathbook SubtractKit and its teaching content, vendored unchanged (hash-checked) |
| `js/sub-galaxy.js`, `js/sub-store.js` | Subtraction adapter and its storage (`galaxy-math.subtraction`, v2) |
| `js/sub-bank.js` | Subtraction reasoning bank for the Math Thinking Lab (12 kinds A–L) |
| `js/progress.js` | Local progress (versioned `localStorage` key `galaxy-math.progress`, v3 per subject, v1/v2 data migrated, in-memory fallback) |
| `js/app.js` | Router, shared components and the activity screens |
| `tests/` | Unit tests (`node --test`) and the headless-Chrome browser suite |

## Run locally

Open `index.html` in a modern browser. No build system or login is required. The scripts are plain (non-module) files, so the page also works when opened straight from disk.

## For Claude Code

Read `CLAUDE.md`, `docs/PRODUCT_SPEC.md`, and `STATUS.md` before any edits. Preserve the baseline; build on a feature branch and test each milestone. Do not deploy or merge without owner approval. When a build is approved for testing, publish it with `npm run publish:pages` (see above).

## Privacy

No child names, profiles, telemetry, external API calls, or student records should be committed. Save any progress locally in the browser.

MIT licensed; see LICENSE.