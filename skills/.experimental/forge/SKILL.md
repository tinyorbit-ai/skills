---
name: forge
description: Resumable end-to-end build pipeline for makers — tells you where you left off and continues from exactly there, with zero business/market/demand gatekeeping. Routes through setup, discovery, planning, hardening, then a build→review→ship loop one phase at a time. Invoke with `help` (or `--help` / `?`) to print a status-aware usage map instead of running. Use when starting OR resuming a project, when asked to "forge this", "forge help", "continue", "where was I", "build the next phase", "let's build X", or any time you want forge to pick up the thread.
metadata:
  internal: true
---

# forge

The orchestrator. It is **resumable**: every run starts by reading the project's
state and telling you exactly where you left off, then continues from there. No
gatekeeping on whether the thing should exist — ever.

## Charter (governs everything)

The project is worth building because you chose to build it. forge never questions
whether it should exist, never raises money/market/demand/"is it worth it", never
calls an idea useless, never optimizes for speed-to-value. It understands the build,
locks decisions, hardens it, and builds it in clean verifiable phases. Full charter:
`references/charter.md` — read it before doing anything.

## Help mode (short-circuit)

If forge is invoked with `help`, `--help`, `-h`, `?`, or `usage` as its argument:
**print the usage map below and stop. Do not run the pipeline.** Still compute the
real status block (Step 1) so "You are here" is accurate for this project; if there
is no `wiki/` yet, show `You are here — nothing yet; /forge starts setup`.

```
forge · help

You are here ─────────────────────────────────
  <the Step 1 status block, computed live>
  ▶ Next: <the exact next command, e.g. `/forge` → build phase 3>

Full map ─────────────────────────────────────
  PLAN   init · discovery (+ambition) · plan · harden
  BUILD  build · review (+polish +dx) · ship   ·· one phase per /forge run
  LOOK   debug (root-cause) · retro (synthesis, auto at Done)

Every skill also runs standalone — invoke any directly:
  /forge-init  /forge-discovery  /forge-ambition  /forge-plan
  /forge-design-explore           (divergent design variants)
  /forge-harden                   (orchestrator; --auto for auto-decision)
  /forge-harden-eng  /forge-harden-security  /forge-harden-design
  /forge-harden-dx   /forge-harden-scope
  /forge-build  /forge-review  /forge-polish  /forge-dx
  /forge-ship  /forge-docs  /forge-debug  /forge-retro

/forge with no args continues from ▶ Next.
```

Fill `<...>` from the live state. Keep the box; don't add a charter blurb.

## Step 1 — always: detect state and report "where you left off"

Before acting, read (silently): `wiki/` existence, `wiki/brief.md`,
`wiki/plan.md`, `wiki/build-log.md`, `wiki/learnings.md`, `git branch --show-current`,
`git status`, `git log --oneline -5`. Then print a short status block:

```
forge status
  Brief:    ✓ | – (stub)
  Plan:     ✓ N phases, hardened ✓ | –
  Landed:   phases 1–M (from build-log)
  Now:      on `phase/<k>-<slug>` (in progress) | on <base>, clean
  Next:     <the single next action>
```

Derive **next action** from this ladder (first unmet wins):

| Condition | Stage | Skill |
|---|---|---|
| no `wiki/` | Setup | `forge-init` |
| `wiki/brief.md` missing/stub | Discovery | `forge-discovery` |
| `wiki/plan.md` missing/stub | Planning | `forge-plan` |
| plan has no `## Review` (not hardened) | Hardening | `forge-harden` |
| plan locked, unbuilt phase exists | Build loop | see below |
| every plan phase has a build-log entry | Done | invoke `forge-retro`, then report + `improvements.md` |

## Step 2 — run exactly the next thing, then stop

### Planning stages (init / discovery / plan / harden)

Invoke the one skill for the unmet stage. Each writes its wiki artifact. After it
completes, **stop and report** — do not silently chain into the next stage; tell the
user what's done and that the next `/forge` continues. (Exception: a fresh project
with nothing — offer, via AskUserQuestion, to run setup→discovery→plan→harden in
sequence so first-time setup isn't four invocations.)

When `forge-harden` finishes, present the final lock gate (AskUserQuestion): phase
list with each phase's verifiable gate, open taste decisions, which reviewer
ran, and any unreconciled reviewer disagreement. On confirm, the plan is
**locked** and the build loop is unlocked.

### Build loop (plan locked, phases remain) — ONE phase per run

1. **Pick the phase.** First phase in `wiki/plan.md` with no `wiki/build-log.md`
   entry. If on a `phase/<k>-…` branch with work already in progress, resume *that*
   phase instead of starting a new one.
2. **Announce it.** Phase number, title, its branch, its verifiable gate. One line.
3. **Build.** Invoke `forge-build` for this phase (staff-engineer build of the best
   version of the phase, on its `phase/<n>-<slug>` branch).
4. **Review.** Invoke `forge-review` on the phase's diff (security, tests, strict
   types, optional Codex, auto-fix objective findings, learnings → `wiki/learnings.md`,
   runtime verification of gate + goal). Review auto-invokes `forge-polish` (if the
   phase touched UI) and `forge-dx` (if the build is developer-facing); both are
   also runnable standalone any time.
5. **Ship.** Invoke `forge-ship` (verify gate green → exactly one squashed commit on
   base → one `wiki/build-log.md` entry).
6. **Stop and report.** State: phase N landed, the commit, the gate that passed,
   what's next (phase N+1 + its branch + gate). **Do not** auto-continue to N+1 —
   the user runs `/forge` again to take the next phase. If any step fails (red gate,
   blocked review), stop there, report, and recommend `forge-debug`.

## Rules

- The status block comes first, every run. "Where you left off" is non-negotiable.
- One phase per `/forge` in the build loop. Never batch phases unattended.
- Never collapse a stage silently; each artifact is written before moving on.
- Decisions in any stage → ADRs in `wiki/decisions/` (`references/wiki.md`).
- Prototype-first: phase 1 is the thinnest end-to-end thing that runs.
- forge itself writes no feature code — it routes; `forge-build` builds.

## References

- `references/charter.md` — the worldview (mandatory read)
- `references/branch-discipline.md` — phase/branch/squash/gate contract
- `references/wiki.md` — wiki layout (incl. `learnings.md`), ADR format, capture rule
- `references/reviewer-agents.md` — adversarial reviewer abstraction (codex/gemini/claude); used by forge-harden and forge-review
- `references/question-style.md` — Decision Brief format for AskUserQuestion calls; used wherever a real decision is surfaced
