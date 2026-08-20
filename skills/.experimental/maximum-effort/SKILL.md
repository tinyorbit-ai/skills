---
name: maximum-effort
description: Token-frugal task runner — triages any task by size and risk, sends read-only scouting to the cheapest model, implementation to a mid-tier worker, and only the hard decision (the plan, the root cause, the review of a risky hunk) to the frontier model, then hands off to lizard and shepherd. Same flow in Claude Code and Codex. Use when a task touches more than one file, when asked to "maximum effort", "max effort this", "plan this then do it", "route this to cheap agents", "continue" a half-done plan, or whenever you would otherwise run a whole multi-file job on the session model.
metadata:
  internal: true
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

## When not to run

- The repo has `wiki/.forge/` and the ask is a forge phase → `forge` owns it. Stop.
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
| M | a few files or a new test; a pattern you know; nothing to discover | scouts → plan (no stop) → workers |
| L | many files, cross-service, unclear cause, or any step the user must approve | scouts → brain writes the plan → **user approves** → workers → brain reviews risky hunks |

**Risk → floor.** A step is *risky* when it is hard to reverse, touches auth / money /
data loss / secrets (the surface decides, not the intent — a behaviour-preserving
refactor there is still risky), has outbound side effects that cannot be recalled
(email, payments, webhooks, messages), or crosses systems with unclear state. Risky
steps run on the Opus (Sol) worker whatever the size, and the brain reviews their diff
before close. Everything else never goes above the Sonnet (Terra) worker.

## Lanes

| Lane | Model | Gets | Returns |
|---|---|---|---|
| Scout | Haiku / Luna — fresh context, read-only, parallel | one unknown | files, symbols, callers, tests, one-line risk — ≤ 1 K tokens |
| Worker | Sonnet / Terra (Opus / Sol on a risky step) | brief + plan + its step + the scout findings it needs | `DONE` or `BLOCKED(reason)` |
| Brain | Fable / Sol @ xhigh — L plans, re-plans, risky-hunk review | brief + findings + `forge-principles` | the plan file, or `APPROVE` / `BLOCK`. Never executes. |

The coordinator never reads source files itself — that is what scouts are for. Spawn
mechanics per tool, the role preambles, and the fallback when a role agent is missing:
`references/lanes.md` and `references/roles.md`.

## The flow

1. **Triage.** Brief, size, risky steps. If `.maximum-effort/plan.md` exists with open
   checkboxes, this is a continuation — skip to step 4. Fully ticked → overwrite it.
2. **Scout.** One scout per unknown, all in parallel. No unknowns → no scouts.
3. **Plan.** M: the coordinator writes it. L: the brain writes it. Both land in
   `.maximum-effort/plan.md` in the shape of `references/plan-template.md`; add
   `.maximum-effort/` to `.git/info/exclude` (never the repo's `.gitignore`). One line
   per step:
   `- [ ] N. <what> — files: <paths> — check: <command → expected> — rollback: <how> — risky: <yes|no>`
   Steps that share no file may carry `(independent of N)`. L only: stop and ask the
   user to approve (AskUserQuestion / request_user_input) before anything runs.
4. **Execute.** One worker per step, in order unless marked independent. Every worker
   prompt ends with the leaf boundary: `Complete this directly. Do not spawn agents.`
   The worker runs the step's check before it answers. Tick the box on `DONE`, log the
   run in the plan's `## Log`.
5. **Blocked.** Same reason twice → the brain re-plans the remaining steps from the
   plan plus a five-line state summary — never the raw transcript. Back to 4.
   Escalation is a diagnosis, not a reflex:
   - understood the problem, skipped files / tests / edges → same model, more effort
   - had the full context and still misread it → bigger model
   - the step was underspecified → fix the step; never buy context with model
6. **Close.** Risky hunks → brain review. Then one receipt line, exactly this shape:
   `Route: <S|M|L> · scouts <model>×<n> · plan <model> · workers <model>×<n> (<step> <model>: <why>) · fable <n>`
   Append one JSON line per lane run to `~/.maximum-effort/ledger.jsonl` —
   `{"ts","tool","cwd","task","size","lane","model","effort","outcome","escalated_why"}` —
   no prompts, no code, no secrets. Hand off: `lizard` before the PR, `shepherd` for it.

## Context hygiene

One task per session. `/compact` before step 4 on L. Workers get the plan, never the
transcript. Parallel is for wall-time on independent work, not a token trick — scouts
qualify because each one keeps file contents out of the main thread.

## Two pools

Both tools can run each other's lanes. When this tool's 7-day usage is higher than the
other's by 15 points or more (`~/.claude/rate-limits.json` vs the last `rate_limits` in
`~/.codex/sessions`), scouts and workers go through the other pool — commands in
`references/lanes.md`. The brain stays home. The receipt says `(codex pool)` or
`(claude pool)`.

## Guardrails

- A model or effort the user picked by hand always wins.
- Stay inside the two subscriptions — never route to a pay-per-token key without saying so.
- Never keep the frontier model running because it was needed earlier — downgrade after
  the hard part.
- The check is the step. A worker that answers `DONE` without its check output is
  `BLOCKED`.
