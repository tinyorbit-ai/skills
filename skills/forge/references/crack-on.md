# Crack-on mode

The unattended build loop. `forge` routes here when the run is invoked with
`crack-on`; every rule below is scoped to the build loop and changes nothing about
how a phase is built, reviewed, or shipped — only how many of them happen per run.

## Invocation

`/forge crack-on`, `/forge --crack-on`, or a plain-language ask — "crack on",
"keep going", "don't stop", "run it all". Any of them arms the mode for that run
only; the next `/forge` with no argument is back to one phase per run.

**Name the mode in the opening line of the run**, before the status block, so it is
never ambiguous which mode is active:

```
forge · crack-on — phases 3–7 remaining, running them back-to-back
```

## Scope — the build loop only

Planning stages are **unchanged**. `forge-init`, `forge-discovery`, `forge-plan`,
the design cycle, `forge-harden`, and the lock gate each still run one at a time
and stop, because each one needs the user. Crack-on cannot skip the lock gate: a
plan without `**Lock status:** locked` has no build loop to run.

After the lock, instead of one phase per run: for every remaining phase, in plan
order, run the normal loop — pick the phase, announce it in one line, `forge-build`,
`forge-review`, `forge-ship` — then immediately take the next one. No "stop and
report" between phases; the report is the end summary.

## Frontier-led allocation

When `maximum-effort` is installed, each remaining phase uses the frontier-led policy
in `references/phase-lanes.md` — the same contract as a single-phase `/forge` run, not
a crack-on special case. A frontier phase owner keeps judgment and integration while
smaller models may receive bounded factual or mechanical leaves. Every stop condition
in this file still applies because the owner returns `BLOCKED(reason)` to the main
thread. The end summary is unchanged.

## Un-runnable gates — skip, never fail

A gate is **un-runnable** when clearing it needs a human or a surface this run
can't drive: a visual/browser check, a device (phone, printer, hardware), an
external dashboard or console, a third-party account, someone else's eyes.

1. Run every part of the gate that *is* runnable (typecheck, lint, the tests
   covering the diff, any headless check). Those still have to pass.
2. Skip the un-runnable part. Record the phase number and the **exact** check the
   user must run — a command they can paste, or a precise instruction ("open
   `/settings` at 375px and confirm the sidebar collapses"), never "check the UI".
3. The phase lands **gate-deferred**, not green. Say so in the `forge-ship`
   build-log entry (`Gate: deferred — <check>`) and in the end summary. A skipped
   gate is never reported as a gate that passed.

Deferring is the whole point of the mode — the run keeps moving and the user gets
one batch of checks to run at the end instead of a stop per phase.

## Red gates — one recovery attempt, then stop

A gate that *can* be run and fails is a real failure, not a deferral:

1. Invoke `forge-debug` for the root cause.
2. Let `forge-review`'s existing 3-attempt fix loop try. If it goes green, carry
   on to the next phase as if nothing happened (the end summary still notes it).
3. Still red after that → **stop the run there and report.** Do not start the next
   phase: every later phase builds on this one, so stacking work on a broken phase
   multiplies the debugging surface instead of adding progress.

Same for any hard failure — a rebase conflict `forge-ship` can't resolve, a broken
base branch, a missing dependency the run can't install.

## Taste decisions — batched, except one-way doors

Objective findings are auto-fixed by `forge-review` exactly as in normal mode.
Genuine taste decisions are **collected, not surfaced** — they go into the end
summary as one batch, with the phase each came from and the position the run took
in the meantime (a build that stalls on taste is not unattended).

The exception is a **one-way door**: `forge-harden`'s always-surface allowlist
(principle 5) — framework, language, persistence model, public API shape, a new
external service, a new runtime dependency, the auth model, the data model, or an
edit to a user-locked ADR. Those **stop and ask**, in the Decision Brief shape
(`references/question-style.md`), same bar as `forge-harden --auto`: the user would
want to own this in retrospect. Answer received → the run continues.

## Unlocked design → stop

If the next phase is a UI phase whose `Design:` marker is still an unlocked
`explore`, **stop**. The design pick needs the user's eyes, and building the wrong
shape and redoing it costs more than the stop does. Report which phase it is and
that `forge-design-explore` runs next; after the pick locks, `/forge crack-on`
resumes from there.

## The end summary

Printed however the run ends — plan complete, red gate, one-way door, unlocked
design. It is the only report the user gets for the whole run, so it carries
everything they'd otherwise have learned phase by phase:

| Row | Contents |
|---|---|
| `Landed` | one line per phase — number, title, the squashed commit sha |
| `Gates` | every gate that passed; every gate skipped, with the exact check to run |
| `Decisions` | each deferred taste decision, its phase, and the position taken |
| `Your eyes` | one-way doors hit, gate-deferred phases, anything else needing them |
| `Left` | phases not attempted, and the reason the run stopped |

Rules: never round a gate-deferred phase up to green; never leave a skipped check
described vaguely; if nothing landed, say that first rather than leading with the
list of what didn't happen.

## What crack-on never changes

Review depth, the branch-per-phase and squash-merge contract, the ADR capture rule,
wiki writes, or the bar for "green". It is the same loop with the stops removed —
if a phase would not have shipped in normal mode, it does not ship here.
