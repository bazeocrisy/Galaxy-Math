# Galaxy Math — instructions for Claude Code

## Start here

This repo begins with a working multiplication-only prototype, derived from Galaxy Flash Cards. Do not claim new functionality already exists. Read `docs/PRODUCT_SPEC.md` and `STATUS.md` before planning or coding.

## Nonnegotiable design

- Preserve the galaxy theme selected by the child: deep navy stars, purple-to-blue problem cards, teal/purple/pink answer faces, yellow answer text; clearly correct/incorrect test faces.
- Rename the expanded product **Galaxy Math**; logo concept: friendly rocket orbiting a glowing planet with + − × ÷ motifs. SVG originals should be committed (no hotlinked graphics).
- Landing screen has **Addition** and **Subtraction** (disabled, labeled Coming Soon) and **Multiplication** and **Division** (active when implemented). Show operation-specific menu **Teach, Practice, Flashcards, Test**.
- Calm teaching screens, large touch targets, accessible keyboard focus, readable contrast, mobile-first layout, prefers-reduced-motion support.
- Vertical multiplication facts, and correctly drawn long-division bracket for division.
- No account, child PII, advertising, telemetry, backend, paid packages, or analytics. Static GitHub Pages compatible. Persist local preferences/results with defensive localStorage reads and writes.
- Preserve current working flashcard experience; do not automatically force a quiz on leaving flashcards in the expanded product.
- Work on a feature branch, update `STATUS.md`, and stop short of merging to main or publishing without authorization.

## Implementation sequence

1. Audit existing `index.html`, document baseline issues and test plan.
2. Create shared subject registry (addition/subtraction disabled), Galaxy Math four-card landing screen, and second-level mode selector. Keep multiplication prototype accessible until new modes are verified.
3. Multiplication Teach and Practice: equal groups, repeated addition, arrays, problem interpretation, known-fact strategies; helpful feedback, no forced timer.
4. Division Teach and Practice: sharing, grouping, related facts, whole-number exact quotients, long-division notation where age-appropriate.
5. Flashcards: ×, ÷, optional mixed; selectable families 1–12, manual reveal or 2/3/5/10 sec auto reveal, separate answer-hold duration, pause, session end without forced test.
6. Test: 10/20/36 facts, timed or untimed, independent score, missed-fact review, accuracy including unanswered questions.
7. Local progress, mastery by family, parent summary; no identifying child information.
8. Automated correctness checks, browser testing, regression review, ready-for-owner-review report.

## Known baseline issues to verify

- `askCard()` schedules `tickDown()` immediately after render, potentially reducing usable countdown by ~1 second.
- Original `endPractice()` routes directly to an obligatory 10-card quick check. Expanded UX must make this optional.
- Original `setSpeed` couples session controls to stored settings; inspect mode independence.
- Only multiplication is implemented; division and teaching are not present.
- Original personal name must not be restored in browser title or public site UI.

## Acceptance criteria

- Four correctly labeled, responsive subject cards and safe disabled-state behavior.
- Multiplication and division offer all four working activities (once corresponding phases are marked complete).
- No division by 0; division questions generated as `dividend = divisor × quotient`, quotient integer.
- Correct scoring, no old intervals/timers after navigation, consistent countdown behavior, graceful localStorage failures.
- All fact groups 1–12 work; third-grade fluency within 100 distinct from optional 11s/12s extensions.
- Test in mobile, tablet and desktop widths; no page overflow or broken navigation.

Keep implementation incremental and do not silently delete `worksheets/` or strip existing features.