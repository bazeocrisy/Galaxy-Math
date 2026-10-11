# Galaxy Math 🚀

A space-themed, third-grade math learning application. This repository starts from the working **Galaxy Flash Cards** prototype and is being expanded through verified phases.

## Current status

**Phase 2:** `index.html` has the four-subject landing page and a Teach · Practice · Flashcards · Test menu. Only multiplication **Flashcards** and **Test** work today; everything else is clearly marked Coming Soon. Guided teaching, division activities and progress reports are **not yet** built. See `STATUS.md`.

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
4. Downloads every app file (`index.html`, `js/`, `assets/`) from the public URL and compares it byte-for-byte with the commit.
5. Runs the full browser suite against the public URL (`LIVE_URL=…`).

To check the current live site without publishing anything, run `npm run verify:pages`. It runs steps 3–5 for the current `origin/gh-pages`.

The script authenticates with the same GitHub login `git push` uses (`git credential fill`). The GitHub CLI isn't required.

## Planned subjects

| Subject | Status |
|---|---|
| Addition (+) | Coming Soon placeholder |
| Subtraction (−) | Coming Soon placeholder |
| Multiplication (×) | Build first |
| Division (÷) | Build second |

Each active subject will offer **Teach · Practice · Flashcards · Test**.

## Run locally

Open `index.html` in a modern browser. No build system or login is required.

## For Claude Code

Read `CLAUDE.md`, `docs/PRODUCT_SPEC.md`, and `STATUS.md` before any edits. Preserve the baseline; build on a feature branch and test each milestone. Do not deploy or merge without owner approval. When a build is approved for testing, publish it with `npm run publish:pages` (see above).

## Existing assets

The `worksheets/` directory contains the original printable multiplication practice sheets and their generator.

## Privacy

No child names, profiles, telemetry, external API calls, or student records should be committed. Save any progress locally in the browser.

MIT licensed; see LICENSE.