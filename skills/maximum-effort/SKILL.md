---
name: maximum-effort
description: Frontier-led task runner for accepted quality per token — a Sol or Opus owner keeps judgment and final accountability while delegating bounded factual lookup to Luna or Haiku and exact reversible work to Terra or Sonnet. Invoked by name, not inference. Use when asked for "maximum effort", "max effort", "route this to cheap agents", or to resume an unfinished `.maximum-effort/plan.md`.
model: opus
effort: medium
---

# Maximum Effort

> The strongest model thinks. The right-sized models lift.

A frontier owner holds the goal, reads decision-critical source, makes the plan, assigns
only bounded leaf work, reviews every result, and proves the final outcome. Smaller
models earn work when their task is factual or mechanical enough that the handoff plus
review costs less than having the owner do it.

**Announce at start:** `Maximum effort — frontier-led.`

If the user asks "why maximum effort" (any phrasing), reply exactly
`building features be like https://www.youtube.com/watch?v=qxZtLIjuS9o` in the session
only, never in a file or on GitHub.

## Charter

The owner is Opus or Fable on Claude and Sol on Codex, unless the user explicitly chose
another model or effort. It owns every judgment call and the accepted result. Delegation
removes menial tokens from its context; it never lowers the quality bar or turns the
owner into a passive planner.

The bar is `forge-principles`: economy of means, root cause over symptom, strict by
construction, and evidence over claims. Count the task packet, duplicated reads,
review, failed attempts, and human correction as spent tokens. The cheapest call is not
the cheapest task when it creates another round.

## When not to run

- A repo with `wiki/plan.md` or `wiki/.forge/` stays with `forge` for bare "continue",
  "keep going", "where were we", and "build the next phase" requests.
- Inside a Forge build, Forge keeps its plan, branch, gate, review, and ship lifecycle.
  Maximum Effort may govern leaf allocation but never creates `.maximum-effort/plan.md`.
- An explicit request for Maximum Effort wins for a standalone task, even in a Forge
  repo. A PR goes to `shepherd`; a review goes to `lizard`.
- A model or effort the user picked by hand wins.
- Stay inside the Claude and Codex subscriptions. Never use a pay-per-token key without
  saying so first. Keep one task in one pool; compare headroom between tasks.

Read `references/runtime.md` for Claude/Codex model mechanics or subscription headroom.
Read `references/delegation.md` before assigning a scout or mechanical worker.

## Triage

Write this five-line brief before source work:

```
Goal:        <one sentence>
Done when:   <observable>
Constraints: <what must not change>
Risk:        <none | hard-to-reverse, auth, security controls, money, data, secrets, outbound side effects>
Unknowns:    <what source reading or a factual scout must answer>
```

| Size | Looks like | Plan |
|---|---|---|
| S | one known edit; no discovery or new behavior | no plan |
| M | a few files, a test, or a familiar feature | short plan in owner context |
| L | many files, cross-system state, unclear cause, migration, or approval | `.maximum-effort/plan.md` |

Size controls planning, not model choice. Assign each slice by judgment:

Use this first-match order:

1. Risk, ambiguity, root cause, original design, or a decision → `owner`.
2. One bounded read-only fact → `scout`.
3. Locked, reversible, non-risky propagation with known files and a check → `mechanic`.
4. Everything else → `owner`.

| Lane | Use when | Never use for |
|---|---|---|
| Owner — frontier | ambiguity, root cause, architecture, behavior, integration, final diff | work a lower lane can prove more cheaply |
| Scout — Haiku/Luna | one bounded factual lookup: callers, files, tests, existing pattern | conclusions, plans, edits, broad summaries |
| Mechanic — Sonnet/Terra | exact reversible change, known files, locked behavior, deterministic check | auth/security/money/data/secrets, migrations, public-API decisions, design choices, unclear failures, tests that decide behavior |

Applying a decision already made can be mechanical even when making that decision was
not. Examples: propagate an exact rename, apply an existing pattern to several known
sites, update generated artifacts, or add fully specified cases to an existing table.

Delegate only when all are true:

1. The owner can specify the result without asking the worker to interpret intent.
2. Files or search boundary are known and do not overlap another live worker.
3. A deterministic check can reject bad work.
4. The task packet plus result review is likely cheaper than direct owner execution.

If any condition fails, the owner does it. S tasks normally stay with the owner because
handoff overhead outweighs the work.

Routing invariants:

- Risk, ambiguity, root cause, original design, and decisions always stay with the
  frontier owner. A smaller model may apply a locked decision only outside a risky
  surface.
- Auth, security controls, money, data, secrets, migrations, outbound side effects, and
  unclear failures can never use the mechanic lane.
- S stays with the owner unless the edit is repetitive across several known sites.
- Review is `self` for ordinary S/M, `frontier` for risky M, original design, and all L.

## Work

1. **Resume before restarting.** If `.maximum-effort/plan.md` has open checkboxes, read
   it before source work. Preserve its brief, decisions, completed steps, and log;
   validate the remaining slices against the current request and source; resume only
   the open slices. A changed constraint or stale decision is owner work, not permission
   to repeat completed slices.
2. **Inspect and decide.** The owner reads repo guidance and decision-critical source.
   It may send peripheral factual unknowns to scouts, but never substitutes their
   summary for reading the code it must judge.
3. **Name the cause or shape.** State the root cause before a bug fix. For a feature,
   name the smallest end-to-end shape, its locked decisions, and risky edges.
4. **Plan and assign.** S has no plan. M stays in context. A fresh L task uses
   `references/plan-template.md` at `.maximum-effort/plan.md`, excluded through
   `.git/info/exclude`. Mark each slice `owner` or `mechanic`; scouts answer unknowns.
5. **Execute leaves.** Independent scouts may run in parallel. Mechanical workers may
   run in parallel only with disjoint files. Every delegate receives one leaf task and
   cannot delegate again.
6. **Take over on friction.** A delegate gets one attempt. Ambiguity, a changed file
   boundary, missing evidence, or a red check returns control to the frontier owner.
   The owner fixes or completes it directly; never start a weak-model repair loop.
7. **Integrate and prove.** The owner reads every delegated diff, resolves interactions,
   runs focused checks while working, then runs the complete scoped lint, typecheck,
   and tests once when the repo requires them. It reviews the final diff itself.
8. **Review once.** Risky M, original design work, and L use one independent frontier
   reviewer. The owner fixes valid findings in one pass. Skip this extra review for a
   PR because `lizard` owns it.

## Receipt and measurement

End completed work with one line:

`Route: <S|M|L> · owner <model>@<effort> · scouts <model>×<n> · mechanics <model>×<n> · takeovers <n> · review <self|frontier> · PR <none|lizard> · rework <n> · next <same|claude|codex>`

Append one task-level JSON line to `~/.maximum-effort/ledger.jsonl`:

`{"ts","tool","cwd","task","size","owner_model","owner_effort","pool","scouts","mechanics","takeovers","review","pr_review","next_pool","outcome","rework_rounds"}`

Use ISO-8601 UTC for `ts`; use `done`, `blocked`, or `rework` for `outcome`. Store
`scouts` and `mechanics` as model-to-count objects such as `{"luna":1}` and
`{"terra":2}`. Never store prompts, code, secrets, or raw user text.

## Guardrails

- The owner never delegates a decision it must later reconstruct from a summary.
- No weak-model work on risky surfaces, even when the requested change sounds routine.
- No uncollected delegate result and no `DONE` without the real check output.
- No second weak-model attempt. Takeover is the quality and token circuit breaker.
- Pool balancing happens before the next task. A failed handoff is never retried in the
  other tool.
