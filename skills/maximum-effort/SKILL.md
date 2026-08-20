---
name: maximum-effort
description: Token-frugal task runner — triages any task by size and risk, sends read-only scouting to the cheapest model, implementation to a mid-tier worker, and only the hard decision (the plan, the root cause, the review of a risky hunk) to the frontier model, then hands off to lizard and shepherd. Same flow in Claude Code and Codex. Invoked by name, not by inference — use when asked to "maximum effort", "max effort this", "plan this then do it", "route this to cheap agents", or to resume a half-done `.maximum-effort/plan.md`. Stands down for forge — in a repo with a forge plan, forge owns the phases and spawns these lanes itself, so bare "continue", "keep going", "where were we", "next phase" and "build the next phase" go to forge, never here.
model: opus
effort: medium
---

# Maximum Effort

> Maximum effort, spent only where it counts.

One coordinator, three lanes. Reading goes to the cheapest model, implementation to a
mid-tier worker, and only the hard decision — the plan, the root cause, the review of a
risky hunk — to the frontier model. Same flow in Claude Code and Codex; the per-tool
mechanics live in `references/lanes.md`.

**Announce at start:** `Maximum effort — triaging.` Then go quiet until the brief.

If the user asks "why maximum effort" (any phrasing), reply exactly
`building features be like https://www.youtube.com/watch?v=qxZtLIjuS9o` — in the
session only, never in a file or on GitHub.

## Charter

The bar is `forge-principles` — economy of means, evidence over claims, root cause over
symptom. A cheaper model is never permission to skip a test or a step's check. Going
cheaper is free; going up needs a named failure.

Frugality governs *where* reading happens, never *how much*: scouts are more reading,
just placed in a cheaper window — forge's "context is welcome" stance is honoured, not inverted.

## When not to run

- `wiki/plan.md` or `wiki/.forge/` exists and `forge` is installed → forge owns it. Stop.
  forge spawns these same lanes itself when it wants them (`forge/references/phase-lanes.md`)
  — standing down loses nothing. Unless the user asked for maximum effort by name, which
  always wins (Guardrail: a model or effort the user picked by hand always wins).
  Fallback: no `forge` installed → triage as normal.
- The ask is a PR → `shepherd`. A review → `lizard`.
- S-size (one file, you already know the change) → do it on the main thread. Say
  `Route: S` and nothing else.

## Triage

Write the brief first — five lines, nothing else:

```
Goal:        <one sentence>
Done when:   <observable>
Constraints: <what must not change>
Risk:        <none | the risky steps, named>
Unknowns:    <questions a scout answers, one per line>
```

**Size → flow.**

| Size | Looks like | Flow |
|---|---|---|
| S | one file, an edit you could dictate — no new test, nothing to look up | main thread does it. No scouts, no plan file. |
| M | a few files or a new test; a pattern you know; nothing to discover; a small feature built on existing patterns, even if it is only one page | scouts → plan (no stop) → workers |
| L | many files, cross-service, unclear cause, a data/schema migration or a backfill, or any step the user must approve | scouts → brain writes the plan → **user approves** → workers → brain reviews risky hunks |

**Risk → floor.** A step is *risky* when it is hard to reverse, touches auth / money /
data loss / secrets (the surface decides, not the intent — a behaviour-preserving
refactor there is still risky), has outbound side effects that cannot be recalled
(email, payments, webhooks, messages), or crosses systems with unclear state. Risky
steps run on the Opus (Sol) worker whatever the size, and the brain reviews their diff
before close. Everything else never goes above the Sonnet (Terra) worker.

**Design → floor.** A step is *design* when it **decides** how something looks or feels —
inventing a surface's shape, choosing type/colour/spacing/motion with no precedent to
follow. **Applying** an already-decided system — existing theme tokens, an existing
palette, a locked `DESIGN.md`, an established component's conventions — is ordinary
work and stays on Sonnet, however visual the file looks. Design steps run on the Fable
(Sol) worker whatever the size: a cheap model returns competent generic defaults, and
generic is the failure here. Precedence: a step that is both design and risky runs on
Fable and still gets the brain's risky-hunk review. Not design merely because a step
touches a file that renders something — wiring an existing component to data is
ordinary work.

## Lanes

| Lane | Model | Gets | Returns |
|---|---|---|---|
| Scout | Haiku / Luna — fresh context, read-only, parallel | one unknown | files, symbols, callers, tests, one-line risk — ≤ 1 K tokens |
| Worker | Sonnet / Terra (Opus / Sol on a risky step, Fable / Sol on a design step) | brief + plan + its step + the scout findings it needs | `DONE` or `BLOCKED(reason)` |
| Brain | Fable / Sol @ xhigh — L plans, re-plans, risky-hunk review | brief + findings + `forge-principles` | the plan file, or `APPROVE` / `BLOCK`. Never executes. |

The coordinator never reads source files itself — that is what scouts are for. Spawn
mechanics per tool, the role preambles, and the fallback when a role agent is missing:
`references/lanes.md` and `references/roles.md`.

## The flow

1. **Triage.** Brief, size, risky steps. If `.maximum-effort/plan.md` exists with open
   checkboxes, this is a continuation — skip to step 4. Fully ticked → overwrite it.
2. **Scout.** One scout per unknown, all in parallel. No unknowns → no scouts. Every
   lane prompt — scout, worker, brain — ends with the leaf boundary: `Complete this
   directly. Do not spawn agents.`
3. **Plan.** M: the coordinator writes it. L: the brain writes it. Both land in
   `.maximum-effort/plan.md` in the shape of `references/plan-template.md`; add
   `.maximum-effort/` to `.git/info/exclude` (never the repo's `.gitignore`). One line
   per step:
   `- [ ] N. <what> — files: <paths> — check: <command → expected> — rollback: <how> — risky: <yes|no>`
   Steps that share no file may carry `(independent of N)`. Every step passes the
   default-deny before it is written: no new file for a single caller (inline until a
   second caller exists), no option for a value the brief fixes, one test across the
   real seam over five that mirror the module. L only: stop and ask the user to approve
   (AskUserQuestion / request_user_input) before anything runs.
4. **Execute.** One worker per step, in order unless marked independent. The worker
   runs the step's check before it answers. Spawn, then collect every lane's
   answer before the turn ends — parallel means parallel calls in one message, not a
   background job picked up later (mechanics: `references/lanes.md`). Only once an
   answer is in hand: tick the box on `DONE`, log the run in the plan's `## Log`. A
   turn that ends with a lane still out orphans it.
5. **Blocked.** Same reason twice → the brain re-plans the remaining steps from the
   plan plus a five-line state summary — never the raw transcript. Back to 4.
   Escalation is a diagnosis, not a reflex:
   - understood the problem, skipped files / tests / edges → same model, more effort
   - had the full context and still misread it → bigger model
   - the step was underspecified → fix the step; never buy context with model
6. **Close.** Risky hunks → brain review; a `BLOCK` becomes a new step for a worker,
   never a patch by the coordinator. Before the receipt, re-read the plan: every box
   ticked or no receipt — an open box is either a lane still to collect or a tick that
   never landed. Then one receipt line, exactly this shape:
   `Route: <S|M|L> · scouts <model>×<n> · plan <model> · workers <model>×<n> (<step> <model>: <why>) · fable <n>`
   Append one JSON line per lane run to `~/.maximum-effort/ledger.jsonl` —
   `{"ts","tool","cwd","task","size","lane","model","effort","outcome","escalated_why"}`,
   `ts` as ISO-8601 UTC (`2026-08-20T12:00:00Z`) — no prompts, no code, no secrets. Hand off: `lizard` before the PR, `shepherd` for it.

## Context hygiene

One task per session. `/compact` before step 4 on L. Workers get the plan, never the
transcript. Parallel is for wall-time on independent work, not a token trick — scouts
qualify because each one keeps file contents out of the main thread.

## Two pools

Both tools can run each other's lanes. When this tool's 7-day usage is higher than the
other's by 15 points or more (`~/.claude/rate-limits.json` vs the last `rate_limits` in
`~/.codex/sessions`), scouts and workers go through the other pool — commands in
`references/lanes.md`. The brain stays home, and so does any step whose check binds a
port or needs the network (the foreign pool runs sandboxed). The receipt says
`(codex pool)` or `(claude pool)`.

A foreign-pool lane that returns nothing, errors, or runs past 10 minutes is re-run
once in the home pool. A scout that still returns nothing leaves its unknown open —
never read as "no findings".

## Guardrails

- A model or effort the user picked by hand always wins.
- The coordinator's only writes are `.maximum-effort/plan.md` and `.git/info/exclude`.
  Source changes come from workers, every time — including the fix for a review finding.
- Stay inside the two subscriptions — never route to a pay-per-token key without saying so.
- Never keep the frontier model running because it was needed earlier — downgrade after
  the hard part.
- The check is the step. A worker that answers `DONE` without its check output is
  `BLOCKED`.
- A lane whose answer you never collected is `BLOCKED`, not `DONE` — go get it before
  you close.
