# Phase lanes

How a forge phase executes inside a `maximum-effort` worker lane instead of on the
main thread. Additive: it changes **where** a phase runs, never what forge does. Used
by the one-phase build loop and by crack-on alike — both spawn the same lane.

Fallback: no `maximum-effort` installed → phases run inline on the main thread,
exactly as forge does today.

## The unit — one lane, one whole phase

A lane runs `forge-build` → `forge-review` → `forge-ship` for a single phase, end to
end. Not one lane per step: the phase is the unit, matching today's single-context
loop, so the branch/squash contract in `references/branch-discipline.md` is untouched.
The adversarial eyes still come from `forge-review`'s third-party pass inside the lane
— the main thread adds no second review.

## The mapping

| maximum-effort | forge |
|---|---|
| the step | the phase |
| the step's `check:` | the phase's verifiable gate |
| the risk floor | `forge-harden`'s always-surface allowlist |
| the plan | `wiki/plan.md` |

Nothing here reads or writes `.maximum-effort/plan.md`. forge owns the plan and the
project record; maximum-effort owns only the lane.

## Model floor

| Phase touches | Worker |
|---|---|
| an always-surface allowlist surface — auth, the data model, payments, a new external service, a public API | Opus |
| anything else | Sonnet |

Spawn mechanics (how to pass the model, agent files, what a launch return means):
`maximum-effort/references/lanes.md`. Do not reinvent them here.

## Pool

**Home pool only.** forge gates commonly bind a port, and the codex sandbox denies
`listen` — a cross-pool phase lane fails on its own gate.

## What the lane gets

- the phase spec from `wiki/plan.md` — goal, boundary, `Design:` marker
- its branch (`phase/<n>-<slug>`) and its base branch
- its verifiable gate, verbatim
- the instruction: run `forge-build` → `forge-review` → `forge-ship` for this phase
- the worker preamble from `maximum-effort/references/roles.md`, including its forge
  override (commit freely on the phase branch, wiki writes are in scope, the gate is
  the `check:`)
- the leaf boundary: `Complete this directly. Do not spawn agents.`

The spawn prompt **is** the confirmation `forge-ship` § 3 asks for before the squash;
the lane never stops to ask.

It does **not** get the conversation transcript. If the phase spec doesn't carry
something the lane needs, that is a `BLOCKED`, not a guess.

## Ordering — strictly sequential

The next lane spawns only after the current one answers `DONE` with the gate's real
output **and** a `wiki/build-log.md` entry is present. Two phase lanes in flight would
race the base branch and break one-squash-commit-per-phase. No parallel phases, even
where the plan marks phases independent.

## The worker never asks the user

A lane has no user. Each of these comes back as `BLOCKED(<reason>)`:

| In the lane | Returns |
|---|---|
| one-way door (always-surface allowlist) | `BLOCKED(one-way door — <surface>)` |
| gate still red after `forge-review`'s fix attempts | `BLOCKED(gate red — <check>, <what failed>)` |
| unlocked `Design: explore` marker | `BLOCKED(design unlocked — phase <n>)` |
| gate un-runnable (human / browser / device / dashboard) | `BLOCKED(gate un-runnable — <the exact check the user must run>)` |

The **main thread** — not the lane — then applies forge's existing stop rules:
`references/crack-on.md` § Red gates, § Taste decisions (one-way doors), § Unlocked
design, § Un-runnable gates (skip and record, land gate-deferred), and in the
one-phase loop, forge's own stop-and-report. Lanes change where a phase executes,
never the loop's stop contract.

## Ledger

One JSON line per lane to `~/.maximum-effort/ledger.jsonl` in maximum-effort's
documented shape (`{"ts","tool","cwd","task","size","lane","model","effort","outcome","escalated_why"}`),
written from the lane's completion notification. `wiki/build-log.md` is unchanged and
remains the project record — the ledger is spend accounting, not history.
