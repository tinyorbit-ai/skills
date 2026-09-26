---
name: forge-scope
description: Pressure-tests whether a forge brief or plan is the boldest version of what you already chose. Brief mode runs from forge-discovery; plan mode (expand, hold, trim) from forge-harden. Use when asked for an "ambition check", "am I thinking big enough", a "scope review" or to "trim the plan".
---

# forge-scope

One question, asked at two moments: *is this the boldest version of the thing you
chose?* It only pushes within the intent the user already picked. "I want it small"
is a complete answer and ends the check.

## Modes

- **brief** — after discovery drafts `wiki/brief.md` (forge-discovery runs it before
  the brief locks). Finds where the idea was shrunk without meaning to.
- **plan** — after `forge-plan`, where the plan has its own gravity and may have
  drifted from the brief. Three lenses: **EXPAND** (push the outcome up), **HOLD**
  (record that the shape is deliberate), **TRIM** (cut phases that don't serve the
  intent, for focus rather than value).

Pick the mode from the call: brief when there is no `wiki/plan.md` or discovery called
it, plan otherwise. In plan mode, the lens comes from the caller. With no lens given,
ask once in a live session; run from `forge-harden` or with no one to ask, use HOLD.

## Read first

`wiki/brief.md` (especially "How it should feel", "The hard/interesting part",
"Smallest useful version", "Three-year fit"), plus `wiki/plan.md` and
`wiki/architecture.md` in plan mode. If the brief has an `**Ambition check (...):**`
marker, build on it rather than re-litigating it.

## Process

### 1. Find the timid premises (brief, EXPAND)

Where has the idea or the plan quietly shrunk? Look for "just a simple…", "only…",
"for now…", "minimal v1", defaults picked for ease rather than for the vision, and a
hard part avoided rather than faced. In plan mode, also look for phases that
under-deliver the brief's feel or hard part (EXPAND), phases that don't trace to its
intent (TRIM), and choices that look right but nobody has said so (HOLD).

### 2. Describe the bolder version

Same intent and audience, a harder, cleaner, more complete realization. The boldest
version does the most with the fewest parts; a "bolder" idea that needs a heavier
system is usually a weaker idea wearing ambition. Tie it to the user's stated goal and
feel, never to reach, scale or revenue. Lead with what the finished thing feels like,
then the concrete shape and cost:

> Flat: "Add live reload. Phase 3 effort: ~1 day."
>
> Better: "Save the file and the preview is already right, no rerun, no refresh.
> Shape: a file watcher and re-render in phase 3, ~1 day, one new dependency."

In brief mode, also stack **2-4 small unlocks**: cheap (hours, not weeks),
independently adoptable, each making the thing more delightful to its own user. Never
a new feature direction dressed as delight.

### 3. Name the cost honestly

Effort, difficulty, the hard part they would have to face. No selling. For the bolder
version, each small unlock and each EXPAND item, also name:

- **Added proof burden** — the new observable evidence needed to trust or ship it,
  not just the implementation work.
- **Paired cut or pressure valve** — what leaves scope, or the explicit trigger and
  fallback that lets this slip without risking the core outcome. "We'll fit it in" is
  not a pressure valve.

An expansion missing either is not ready to offer.

For TRIM, list each phase or work bullet that doesn't trace to the brief, with where it
could land later. For HOLD, say which choices look deliberate and which look
unexamined.

### 4. Offer choices

Use the Decision Brief shape (`../forge/references/question-style.md`) and take a
position; the smaller version is always a legitimate pick.

- Bolder version: keep current / adopt bolder / take specific pieces.
- Small unlocks: one multi-select, each with its one-line cost.
- EXPAND: one question per expansion, never one bundled "expand everything?".
- HOLD: confirm and record / re-examine. TRIM: keep / park in improvements / delete.

From `forge-harden`, don't ask: return the choices as taste decisions and the
orchestrator batches them. With no one to ask at all, follow `forge-principles`
rule 10 and record every choice as an assumption.

### 5. Record

- Always write `**Ambition check (YYYY-MM-DD):** <held as-is | raised: what changed>`
  into `wiki/brief.md`. It is greppable, and later runs read it instead of reopening
  the question.
- Adopted changes update the brief body, and in plan mode `wiki/plan.md` plus an ADR
  if the shape changed. Record each adoption's proof burden and cut or pressure valve
  beside it, and in the affected plan gate.
- Rejected unlocks and trims go to `wiki/improvements.md` as parked, not deleted.
- HOLD confirmations become an ADR ("Scope held: <what>, because <why>").

### 6. Report

```
forge-scope (mode: brief | plan EXPAND | HOLD | TRIM)
  Findings: <N> · Changes applied: <list>
  Ambition shift: yes (brief updated) | no
  Parked in improvements.md: <N> · HOLD ADRs: <N>
  Proof burden + cut/pressure valve on every adoption: <N>/<N>
```

From `forge-harden`, this block folds into the plan's `## Review`. End with the result
line from `../forge/references/headless.md`.

## Rules

- Enthusiasm for the craft, never persuasion toward bigger for its own sake or toward a
  market. No new audience, monetization or growth angle.
- "Smaller on purpose" and "bigger on purpose" both end the review with respect.
- Architecture belongs to `forge-plan` and `forge-harden`; this is about the intent's
  ambition and the phase set's focus.
