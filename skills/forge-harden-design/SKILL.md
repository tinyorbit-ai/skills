---
name: forge-harden-design
description: Plan-time design/UX review (senior designer persona). Walks the plan for information hierarchy, interaction states (loading / empty / error / success / partial), accessibility (keyboard, contrast, targets, screen reader), responsive intent, and the user journey's rough edges — BEFORE implementation. Three modes — EXPANSION (raise the bar), POLISH (bulletproof every touchpoint), TRIAGE (critical gaps only). Use when plan has a UI, when asked to "design-review the plan", "plan-time design audit", or via forge-harden orchestration. For runtime design QA on the built thing, see forge-polish.
---

# forge-harden-design

The senior designer's eye on the **plan**, not the running UI. Asks: does
this plan, as written, set up a designed thing or an undesigned thing? Runs
*before* implementation so the plan obligates the UI states up front.

## Charter

Design is part of the craft — critique the plan, never the premise, and
never frame findings in market/conversion terms; the bar is "intentional,
coherent, accessible", not "convert better" (`forge-principles`'s
`references/charter.md`).

## When it runs

- **Auto:** `forge-harden` invokes this when the plan ships a UI.
- **Standalone:** invoke directly to audit a plan's UI ambition any time.

If the plan has no UI surface, say so and exit.

## Modes

- **EXPANSION** — raise the design bar. Look for missing motion, missing
  visual hierarchy, missing system thinking. Plan-level upgrades, not just
  fixes.
- **POLISH** (default) — bulletproof every touchpoint. Every interaction
  state designed-in, every responsive breakpoint named, every accessibility
  obligation surfaced.
- **TRIAGE** — critical gaps only. Use when a previous design pass already
  covered the bulk and you're checking for remaining blockers.

State the mode upfront. Default to POLISH.

## Process

Prereq: `wiki/plan.md` exists and includes UI work. Read it, the brief
(`wiki/brief.md`'s "How it should feel"), `wiki/architecture.md`, and any
existing `DESIGN.md` or design ADRs. Past `wiki/learnings.md` rules count.

### 0. Principles (applied throughout, not recited)

1. **Empty states are features.** "No items found." is not a design — every
   empty state needs context and a primary action.
2. **Every screen has a hierarchy.** If everything competes, nothing wins.
3. **Specificity over vibes.** "Clean, modern UI" is not a design decision —
   name the type, the spacing scale, the interaction pattern.
4. **Edge cases are user experiences.** The 47-char name, zero results,
   first-time vs. thousandth use.
5. **Generic patterns are findings.** If a described surface would look like
   every AI-generated site, the plan under-specifies it.
6. **Responsive is not "stacked on mobile".** Each viewport gets intent.
7. **Accessibility is specified or it doesn't exist.**
8. **Subtraction default** and **design for trust** — `forge-principles`'s
   `references/craft-patterns.md`.

### 1. Rated passes — each writes an artifact into the plan

Run the **rate → fix-to-10 → re-rate loop** (forge suite's
`references/scoring.md`) over the six passes. The fix for each pass is a
**concrete artifact written into `wiki/plan.md`** (in the phase or a
`### Design` subsection) — prose obligations don't count as fixes.

- **Pass 1 — Information hierarchy.** Rate: does the plan say what the eye
  lands on first, second, third, per surface? Fix-to-10: a short ASCII
  sketch or ordered list per surface. Constraint worship: if this screen
  could only show 3 things, which 3?
- **Pass 2 — Interaction states.** Rate: loading / empty / error / success /
  partial committed for every screen? Fix-to-10: a state table —

  ```
  SURFACE         | LOADING | EMPTY | ERROR | SUCCESS | PARTIAL
  <each surface>  | <spec>  | <spec>| <spec>| <spec>  | <spec>
  ```

  Every cell one line; "n/a" must be argued, not assumed.
- **Pass 3 — Journey & feel.** Rate: does the plan honor the brief's "How it
  should feel" at each step? Fix-to-10: a storyboard for the core flow —

  ```
  STEP | USER DOES        | USER FEELS        | PLAN SPECIFIES?
  1    | <action>         | <target emotion>  | <what supports it / GAP>
  ```

  First-run, recovery-from-error, and return-after-absence are steps too.
- **Pass 4 — Specificity (anti-generic).** Rate: are surfaces described as
  specific, intentional UI — or placeholder patterns ("a dashboard with
  cards")? Fix-to-10: rewrite each vague description with a named, concrete
  alternative.
- **Pass 5 — System alignment.** Rate: do surfaces draw from one
  spacing/color/type system? If a `DESIGN.md` exists (see
  `forge-design-system`), annotate the plan with its tokens. If none exists
  and the plan implies 2+ surfaces, the 10 requires recommending
  `forge-design-system` — a missing system is a real gap, not a style choice.
- **Pass 6 — Responsive & accessibility.** Rate: breakpoints named, collapse
  behavior intentional, keyboard nav / contrast / target sizes (44px min) /
  screen-reader labels / motion reduction folded into phase gates? Fix-to-10:
  per-viewport intent lines + a11y obligations in the gates.

### 1b. Unresolved-decisions table

Close with the ambushes — design decisions the plan leaves open, with the
default that ships if nobody decides:

```
DECISION LEFT OPEN              | IF DEFERRED, WHAT SHIPS
Empty state for <surface>?      | "No items found."
Mobile nav pattern?             | Desktop nav crammed behind a hamburger
```

Each row becomes either a plan fix (objective) or a taste decision (below).

### 2. Fix policy

- **Objective** (missing state, missing accessibility obligation, missing
  responsive intent) → fix `wiki/plan.md` in place by adding to the phase's
  Work bullets or strengthening its gate (e.g. "manual: keyboard-only flow
  completes the task").
- **Taste** (which hierarchy, which interaction feel) → return as taste
  decisions for the orchestrator's batch. Decision Brief shape (forge
  suite's `references/question-style.md`).

### 3. Report

```
forge-harden-design (mode: EXPANSION | POLISH | TRIAGE)
  Scores (before → after): hierarchy <a>→<b> · states <a>→<b> · journey <a>→<b>
                           specificity <a>→<b> · system <a>→<b> · responsive+a11y <a>→<b>
  Artifacts written: <state table | storyboard | hierarchy sketches | decisions table>
  Findings fixed: <N>
  Taste decisions surfaced: <N>
```

If a previous `## Review` block exists, lead with the trend line per
`references/scoring.md`.

Orchestrator folds into the plan's `## Review` section. Standalone: write
the section yourself and present the taste batch.

## Rules

- Plan-time only. Runtime visual QA is `forge-polish`'s job.
- Never kill the project. Never frame in market/conversion.
- "Smaller on purpose" applies — a deliberately minimal UI is fine; demand
  intention, not size.
- Respect any `DESIGN.md` or system ADRs already in place (see
  `forge-design-system` for creating one).
- A pass without its artifact is unfinished — tables and storyboards go
  *into the plan*, not into the chat.

## References

- forge suite's `references/question-style.md` — Decision Brief format
- forge suite's `references/scoring.md` — the rate → fix-to-10 → re-rate loop
- `forge-principles`'s `references/craft-patterns.md` — constraint worship, subtraction default, design for trust
- `forge-design-system` — creates the DESIGN.md Pass 5 aligns against
