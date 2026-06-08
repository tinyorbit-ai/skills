---
name: forge-harden-scope
description: Plan-time scope review (charter-safe CEO analogue) — pressure-tests whether the plan is the boldest version of what the user already chose. Three modes — EXPAND (raise ambition within the chosen intent), HOLD (lock the current scope deliberately), TRIM (strip non-essential phases). Never reopens whether the project should exist or whether the user should build it; "smaller on purpose" is a respected answer. Use after forge-plan when ambition feels off, when asked "scope review", "is this ambitious enough", "trim the plan", or via forge-harden orchestration. Complements forge-ambition (which runs at brief time).
metadata:
  internal: true
---

# forge-harden-scope

The plan-time ambition / scope rethink. Sister to `forge-ambition` (which
runs at brief time); this one re-checks scope *after* planning, where the
plan has its own gravity and may have quietly drifted from the brief's
intent.

## Charter (hard boundary)

The project's right to exist and the user's fitness to build it are settled,
never re-litigated. This skill only pressure-tests scope *within the intent
the user already chose*. It never reopens "is it worth building" or "are you
the right person", and never suggests pivoting to a "better product".
Context is fine to consider; scope changes only toward a *more excellent or
more focused* version of the same thing, and only with the user's consent.
"I want it small" is a complete answer that ends the
review.

## Modes

- **EXPAND** — pressure ambition upward. Where has the plan quietly shrunk
  from the brief? Where did "for now" / "minimal v1" / "just a simple…"
  creep in? Surface, propose the bolder version, name the cost honestly,
  let the user choose.
- **HOLD** — confirm and record that the current scope is deliberate. The
  point isn't to expand — it's to make "this is the right shape" an
  explicit, recorded decision, not a default.
- **TRIM** — strip non-essential phases. If the plan has accumulated
  phases that don't serve the brief's intent, name them and propose
  removal. This is *not* "reduce scope for value reasons" — it's
  "reduce scope for *focus* reasons".

State the mode upfront. If the user invoked the skill without specifying,
ask in one Decision Brief: which lens?

## Process

Prereq: `wiki/plan.md` exists. Read it, `wiki/brief.md` (especially "How
it should feel", "The hard/interesting part", "Smallest useful version",
"Three-year fit"), and `wiki/architecture.md`. Read `forge-ambition`'s
brief-time output if it ran — don't re-litigate decisions already made
there; build on them.

### 1. Find the drift

Compare plan to brief. Where does the plan:

- *Under-deliver* the brief's intent? (the "feel", the "hard part", the
  three-year fit) — EXPAND mode
- *Quietly accept timid defaults* that the brief didn't ask for? — EXPAND
- *Carry phases that don't serve the brief's core intent*? — TRIM
- *Look exactly right but no one's said so*? — HOLD; record it.

### 2. Mode-specific work

**EXPAND**: list the timid premises with concrete examples from the plan.
For each, describe the bolder version — same intent, more excellent
realization. Name the *craft cost* honestly (effort, hard parts, time)
in the user's currency, never market currency.

**HOLD**: state plainly which scope choices look deliberate, which feel
unexamined, and which deserve to be recorded as held-on-purpose. Surface
those last via Decision Brief so they become explicit decisions.

**TRIM**: list phases or work bullets that don't trace back to the
brief's intent. For each, propose removal (and where the work could
re-land if the user does want it eventually). "Cuts" go to
`wiki/improvements.md` as deferred — they're not deleted, they're parked.

### 3. Offer choices

AskUserQuestion in the **Decision Brief** shape (forge suite's
`references/question-style.md`):

- For EXPAND findings: keep current / adopt bolder / take specific pieces.
- For HOLD findings: confirm-and-record / re-examine.
- For TRIM findings: keep phase / move to improvements / delete outright.

Take a position. The user's "I want it small" / "I want it sprawling" /
"yes, exactly this" all end the review with respect.

### 4. Apply

- Plan changes → edit `wiki/plan.md` in place.
- Ambition shifts → update `wiki/brief.md` and record an ADR if the shape
  itself changed.
- Trims → move work bullets / phases to `wiki/improvements.md` with the
  user's stated reason.
- HOLD confirmations → ADR ("Scope held: <what>, because <why>") so it
  isn't re-litigated later.

### 5. Report

```
forge-harden-scope (mode: EXPAND | HOLD | TRIM)
  Findings: <N>
  Plan changes applied: <list>
  Ambition shift: yes (brief updated) | no
  Trims → improvements.md: <N>
  HOLD ADRs written: <N>
```

Orchestrator folds into the plan's `## Review` section. Standalone:
write the section yourself.

## Rules

- One register: enthusiasm for the *craft*, never persuasion. No selling.
- "Smaller on purpose" is a complete answer. "Bigger on purpose" too.
- Never introduce a new audience, monetization, or growth angle.
- Don't redesign the architecture — that's `forge-harden-eng`. This is
  about *intent's* ambition and *phase set's* focus.
- Run this *after* `forge-plan`; brief-time ambition is `forge-ambition`'s
  job and shouldn't be duplicated here.

## References

- forge suite's `references/question-style.md` — Decision Brief format
