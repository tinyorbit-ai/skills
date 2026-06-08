---
name: forge-harden-dx
description: Plan-time developer-experience review (DX lead persona) for dev-facing builds. Audits API/CLI ergonomics, naming, error-message intent, setup friction, the first five-minute experience, and which docs surface the plan obliges — BEFORE implementation. Three modes — EXPANSION (competitive bar), POLISH (every touchpoint), TRIAGE (critical gaps only). Use when plan ships a library / API / CLI / SDK, when asked to "DX-review the plan", "plan-time DX audit", or via forge-harden orchestration. For runtime DX testing of the built thing, see forge-dx.
metadata:
  internal: true
---

# forge-harden-dx

The DX lead's review of the **plan**, not the running thing. Asks: does
this plan obligate a respectful, learnable developer surface, or does it
leave DX to chance? Runs *before* implementation.

## Charter

DX is part of the craft. Critique the plan, never the premise. Never kill
the project; never frame in adoption-metrics or market-share terms. The
bar is "respect the developer's time and attention" — not "win a market".

## When it runs

- **Auto:** `forge-harden` invokes this when the plan ships a library /
  API / CLI / SDK.
- **Standalone:** invoke directly any time.

If the plan ships no developer-facing surface, say so and exit.

## Modes

- **EXPANSION** — raise the DX bar. Look for missing surface (a CLI flag
  that should exist; an SDK helper that obviously belongs). Plan-level
  upgrades, not just fixes.
- **POLISH** (default) — bulletproof every touchpoint. First-run, error
  messages, naming, install path, the smallest example a docs reader could
  copy-paste and succeed with.
- **TRIAGE** — critical gaps only. Use when re-running after an earlier
  DX pass covered the bulk.

State the mode upfront. Default to POLISH.

## Process

Prereq: `wiki/plan.md` exists and ships a dev-facing surface. Read it,
`wiki/brief.md` (especially "Who & when"), `wiki/architecture.md`, and
`wiki/learnings.md` (past DX rules count).

### 1. Walk the plan for these

- **The five-minute experience.** From "I have nothing" to "it did the
  thing once" — does the plan obligate this path? Which phase delivers it?
  If no phase does, the plan is missing the most important DX deliverable.
- **API / CLI ergonomics.** Function/command names; argument shape;
  defaults; required vs. optional; naming consistency across surface.
  Each plan-locked decision here should be an ADR (or already is).
- **Error messages as a deliverable.** Plans usually say "handle errors"
  generically. Demand specifics: what does a developer see when they pass
  bad input? When they misconfigure? When auth fails? Bad error messages
  are a feature gap, not a finishing touch.
- **`--help` / type signatures / docstrings.** The plan should say where
  these come from (auto-generated from types? hand-written?) and which
  phase establishes the pattern.
- **Install + setup friction.** What's the install command? Does it work
  on the platforms the brief named? Are there silent prerequisites
  (Node version, env var, OAuth dance)? Each one needs to be in the plan.
- **The first five docs the developer reads.** Quickstart, the main
  reference page, the example. Which phase produces each? If "docs come
  later" is the implicit plan, name it as a finding.

### 2. Fix policy

- **Objective** (missing five-minute path, missing error-message
  obligation, missing install verification) → fix `wiki/plan.md` in place:
  add to phase Work bullets or strengthen the phase gate to include the
  developer-side check.
- **Taste** (which naming style, which docs flavor) → return as taste
  decisions for the orchestrator's batch. Decision Brief shape (forge
  suite's `references/question-style.md`).

### 3. Report

```
forge-harden-dx (mode: EXPANSION | POLISH | TRIAGE)
  Findings fixed: <N>
  Phase obligations added: <list>
  Five-minute path: phase <n> | MISSING (fixed)
  Taste decisions surfaced: <N>
```

Orchestrator folds into the plan's `## Review` section. Standalone: write
the section yourself and present the taste batch.

## Rules

- Plan-time only. Runtime DX testing is `forge-dx`'s job.
- Never kill the project. Never frame in adoption/market.
- "Smaller on purpose" applies — a library that doesn't try to be
  everything is fine; demand intention, not feature count.

## References

- forge suite's `references/question-style.md` — Decision Brief format
