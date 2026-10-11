# Galaxy Math 🚀

A space-themed, third-grade math learning application. This repository starts from the working **Galaxy Flash Cards** prototype and is being expanded through verified phases.

## Current status

**Phase 2:** `index.html` has the four-subject landing page and a Teach · Practice · Flashcards · Test menu. Only multiplication **Flashcards** and **Test** work today; everything else is clearly marked Coming Soon. Guided teaching, division activities and progress reports are **not yet** built. See `STATUS.md`.

## Tests

`npm test` (unit, Node 22+) and `npm run test:browser` (headless Chrome or Edge; set `CHROME_PATH` if needed). No dependencies to install.

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

Read `CLAUDE.md`, `docs/PRODUCT_SPEC.md`, and `STATUS.md` before any edits. Preserve the baseline; build on a feature branch and test each milestone. Do not deploy or merge without owner approval.

## Existing assets

The `worksheets/` directory contains the original printable multiplication practice sheets and their generator.

## Privacy

No child names, profiles, telemetry, external API calls, or student records should be committed. Save any progress locally in the browser.

MIT licensed; see LICENSE.