# Galaxy Math — Product Specification

## Product
Galaxy-themed third-grade math app, evolving from the existing multiplication flashcard prototype. Four operations on the landing page: Addition (+) and Subtraction (−) labeled **Coming Soon** and disabled; Multiplication (×) and Division (÷) are the current development priorities.

## Student navigation
Home → Operation → Teach / Practice / Flashcards / Test → Results → menu. Large tap targets, accessible keyboard controls, mobile-first screens. Retain original galaxy palette and original flashcard functionality; do not force a quiz after flashcard sessions.

## Teach
- Multiplication: equal groups, repeated addition, arrays, rows/columns, equations, commutative property, strategies for facts 1–12.
- Division: fair sharing, equal grouping, related multiplication facts, fact families, missing factors, and age-appropriate long-division bracket notation.
- Each lesson: learning goal, visual model, guided example, independent check, corrective feedback. No countdown.

## Practice
Select fact family, operation, and 10/20/30 questions. Answer independently; optional hints and visual explanations, immediate helpful feedback, review misses. Untimed.

## Flashcards
Select families 1–12, multiplication/division/mixed; manual flip or reveal at 2/3/5/10 seconds; separate answer-hold duration; optional 3/5/10-minute session, pause, and independent exit. Preserve galaxy card animations (honor reduced motion).

## Test
10/20/36 questions, timed or untimed; timed question options 2/3/5/10 seconds. No teaching hints during assessment. Include correct/incorrect/unanswered and score denominator based on all assigned questions. Results by family and missed-question review.

## Content guardrails
- Division uses multiplication-derived exact integer quotients; never divide by zero.
- Separate third-grade within-100 fluency benchmark from optional 11 and 12 extension.
- Correct score, timer, and answer validation logic; avoid duplicate questions where feasible.
- Instruction and memorization are distinct modes.

## Progress & parent
No login or child PII. Defensive localStorage persistence, schema versioning, completed lessons, scores, missed facts, mastery by family, parent dashboard. Initial mastery guidance: at least 90% twice on separate assessments; speed is only evaluated on timed recall work.

## Brand and technical
Name: **Galaxy Math**. Friendly rocket orbiting planet; + − × ÷ motifs. Original local SVG logo; navy, cosmic purple, blue, teal, yellow. Static GitHub Pages compatible, core functionality offline, no analytics or advertisements. Unit tests for math generation, timers, scoring, persistence; browser QA phone/tablet/desktop.

## Delivery order
1. Audit original single-file prototype and test baseline.
2. Child-friendly four-operation home and mode menu; disabled placeholders.
3. Multiplication Teach/Practice.
4. Division Teach/Practice.
5. Multiplication/Division/Mixed Flashcards.
6. Unified Test and missed-fact report.
7. Parent progress, mastery and persistence.
8. Visual, accessibility and regression QA.

Develop on feature branch; update STATUS.md and present screenshots. Do not merge to main or publish until the owner authorizes it.
