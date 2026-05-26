---
name: forge-harden-design
description: Plan-time design/UX review (senior designer persona). Walks the plan for information hierarchy, interaction states (loading / empty / error / success / partial), accessibility (keyboard, contrast, targets, screen reader), responsive intent, and the user journey's rough edges — BEFORE implementation. Three modes — EXPANSION (raise the bar), POLISH (bulletproof every touchpoint), TRIAGE (critical gaps only). Use when plan has a UI, when asked to "design-review the plan", "plan-time design audit", or via forge-harden orchestration. For runtime design QA on the built thing, see forge-polish.
metadata:
  internal: true
---

# forge-harden-design

The senior designer's eye on the **plan**, not the running UI. Asks: does
this plan, as written, set up a designed thing or an undesigned thing? Runs
*before* implementation so the plan obligates the UI states up front.

## Charter

Design is part of the craft. Critique the plan, never the premise. Never
recommend killing the project; never frame findings in market/conversion
terms. The bar is "intentional, coherent, accessible", not "convert better".

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

### 1. Walk the plan for these

- **Information hierarchy.** For each UI surface the plan implies, what's
  the primary thing the eye should land on? Does the plan say it? If
  unclear, that's a finding — name it in the phase.
- **Interaction states.** Loading / empty / error / success / partial —
  every plan that ships a screen must commit to all five. Missing states in
  the plan = missing states in the build. Add them to the phase work bullets.
- **Accessibility obligations.** Keyboard navigation, focus order, color
  contrast, target sizes, screen-reader labels, motion reduction. Each is
  a plan-level commitment, not a "we'll get to it" — fold into phase gates
  where the work touches an input or output surface.
- **Responsive intent.** What breakpoints? What collapses? What stays
  fixed? Plans that say "mobile + desktop" without specifics produce
  unintentional designs.
- **The journey's rough edges.** First-run, empty state, recovery from
  error, return after long absence. Plans almost always over-spec the
  happy path and under-spec the edges. Flag the gap.
- **System vs. one-off.** If the plan implies multiple surfaces, does it
  set up spacing/color/type *system* decisions, or will each phase invent
  its own? If the latter, a system ADR is missing — recommend it.

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
  Findings fixed: <N>
  States added to phases: <list>
  Accessibility obligations folded: <N>
  Taste decisions surfaced: <N>
```

Orchestrator folds into the plan's `## Review` section. Standalone: write
the section yourself and present the taste batch.

## Rules

- Plan-time only. Runtime visual QA is `forge-polish`'s job.
- Never kill the project. Never frame in market/conversion.
- "Smaller on purpose" applies — a deliberately minimal UI is fine; demand
  intention, not size.
- Respect any `DESIGN.md` or system ADRs already in place.

## References

- forge suite's `references/question-style.md` — Decision Brief format
