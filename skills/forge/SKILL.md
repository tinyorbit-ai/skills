---
name: forge
description: Build pipeline for a forge project (wiki/ brief and plan) — picks up where it left off, from setup to plan and harden, then builds, reviews and ships one phase, or all remaining phases via crack-on. Use when asked to "forge this", "forge help", "forge status", "forge crack-on" or "let's build X".
---

# forge

The orchestrator. It is **resumable**: every run starts by reading the project's state and telling you exactly where you left off, then continues from there.

Every stage builds to the bar in `forge-principles`.

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
  PLAN   init · discovery (+scope) · plan · design (system+explore, if UI) · harden
  BUILD  build · review (+polish +dx) · ship  ·· 1 phase/run · all: /forge crack-on
  LOOK   debug (root-cause) · retro (synthesis, auto at Done)
  WIKI   wiki (ask · ingest context · maintain index + health) ·· any time

Every skill also runs standalone — invoke any directly:
  /forge-init  /forge-discovery  /forge-scope  /forge-plan
  /forge-design-system  /forge-design-explore  (DESIGN.md, then design variants)
  /forge-harden [eng|security|design|dx]   (--auto for auto-decision)
  /forge-build  /forge-review  /forge-polish  /forge-dx
  /forge-ship  /forge-docs  /forge-debug  /forge-retro
  /forge-wiki                     (knowledge base — ask, ingest, maintain)

/forge with no args continues from ▶ Next.
```

Fill `<...>` from the live state. Keep the box; don't add a charter blurb.

## Step 1 — always: detect state and report "where you left off"

Run `node scripts/status.mjs` (in this skill's folder; `--json` for factories). It
reads `wiki/`, the plan, the build log and git, and applies the ladder below. Read the
files yourself only when you need more than it reports. Then print a short status block:

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
| plan ships UI and design is unresolved — no `DESIGN.md`, or any phase's `Design:` marker is an unlocked `explore` | Design | design cycle (Step 2) |
| plan has no `## Review` (not hardened) | Hardening | `forge-harden` |
| plan has `## Review` but `Lock status:` ≠ `locked` | Lock | present the lock gate (Step 2), then mark locked |
| plan locked (`Lock status: locked`), unbuilt phase exists | Build loop | see below |
| every plan phase has a build-log entry **and the latest is covered by a `wiki/retro.md` entry** | Done | report complete + open `improvements.md` |
| every plan phase has a build-log entry, **no retro covers the latest** | Wrap-up | invoke `forge-retro`, then report |

## Step 2 — run exactly the next thing, then stop

### Planning stages (init / discovery / plan / design / harden)

Invoke the one skill for the unmet stage (Claude: the Skill tool or `/name`; Codex:
`$name`). Each writes its wiki artifact. Then **stop and report**; the next `/forge`
continues. Exception: on a fresh project, offer to run setup → discovery → plan →
harden in one go.

### Design stage (plan ships UI, direction unresolved)

The shotgun fires **after planning, before hardening** — the user picks with their eyes before any code exists and before harden-design audits a guess. In order:

1. **`forge-design-system`** if no `DESIGN.md` — locks the materials
   (type/color/space/radius/motion) via the served specimen board.
2. **`forge-design-explore`** for each phase marked `Design: explore` — 3–4
   rendered variants on the served feedback board; the pick locks as an ADR and
   the phase's marker flips to `locked via [[decisions/NNNN]]`.

Exit criteria: `DESIGN.md` exists and no phase's `Design:` marker is an unlocked
`explore`. Like plan-lock, the markers persist in `wiki/plan.md` — a UI phase
cannot enter the build loop with its direction unlocked.

When `forge-harden` finishes — or when state detection lands on **Lock** (a
`## Review` block exists with `Lock status:` not yet `locked`, e.g. a prior run
hardened but the user never confirmed) — present the final lock gate
(AskUserQuestion): phase list with each phase's verifiable gate, open taste
decisions, which reviewer ran, and any unreconciled reviewer disagreement. On
confirm, **write `**Lock status:** locked` into the plan's `## Review` block** —
that persisted marker is the build loop's unlock; without it the next `/forge`
would re-present the gate. The build loop is now unlocked.

### Build loop (plan locked, phases remain) — ONE phase per run

1. **Pick the phase, and enter at the right step.** The phase is the first in
   `wiki/plan.md` with no `wiki/build-log.md` entry (if on a `phase/<k>-…` branch
   with work in progress, that's the phase — don't start a new one). **Design
   precondition:** if this phase's `Design:` marker is an unlocked `explore`, run
   `forge-design-explore` for its surface first — no code before the direction is
   locked. Then enter the loop at the *furthest step whose output isn't yet
   present*, not blindly at build:
   - phase branch missing / no commits → start at **Build** (step 3).
   - branch has commits but the gate isn't green / review not done → resume at
     **Build/Review** (forge-build continues in-progress work; it won't re-scaffold).
   - gate green and review evidence exists but no build-log entry → go straight to
     **Ship** (step 5).
2. **Announce it.** Phase number, title, its branch, its verifiable gate. One line.
3. **Build.** Invoke `forge-build` on the phase branch.
4. **Review.** Invoke `forge-review` on the phase diff. It runs `forge-polish` when
   the phase touched UI and `forge-dx` when the build is developer-facing.
5. **Ship.** Invoke `forge-ship` (gate green on the rebased tree → build log, wiki and
   docs written on the phase branch → one squashed commit on base, or a PR with
   `--pr`).
6. **Stop and report.** State: phase N landed, the commit, the gate that passed,
   what's next (phase N+1 + its branch + gate). **Do not** auto-continue to N+1 —
   the user runs `/forge` again to take the next phase. If any step fails (red gate,
   blocked review), stop there, report, and recommend `forge-debug`.

### Crack-on mode (build loop only) — every remaining phase, back-to-back

`/forge crack-on` (also `--crack-on`, "crack on", "keep going", "don't stop", "run it
all") — **name the mode in the run's opening line**. Planning stages are unchanged;
only the post-lock loop changes — build → review → ship for every phase left until a
stop below fires, then the summary. Skips and full rules: `references/crack-on.md`.

- gate can't be run here (human, browser, device, dashboard) → **skip** and record it
- gate runs red → `forge-debug` + review's 3-attempt fix loop; still red → **stop**
- one-way door (`forge-harden`'s always-surface allowlist) → **stop and ask**
- unlocked `Design:` marker on a UI phase → **stop**, `forge-design-explore` next

End with the crack-on summary block from `references/crack-on.md`.

## Rules

- The status block comes first, every run. "Where you left off" is non-negotiable.
- One phase per `/forge` in the build loop by default, never batching unattended —
  `/forge crack-on` is the one deliberate opt-in exception to both.
- Never collapse a stage silently; each artifact is written before moving on.
- Decisions in any stage → ADRs in `wiki/decisions/` (`references/wiki.md`).
- Prototype-first: phase 1 is the thinnest end-to-end thing that runs.
- forge itself writes no feature code — it routes; `forge-build` builds.
- With no one to answer, follow `references/headless.md`, and end every run with its
  `FORGE_RESULT` line.

## References

- `forge-principles` — the quality bar every stage builds to
- `references/branch-discipline.md` — phase/branch/squash/gate contract
- `references/wiki.md` — wiki layout (incl. `learnings.md` + taste profile), ADR format, capture rule
- `references/reviewer-agents.md` — adversarial reviewer abstraction (codex/gemini/claude); used by forge-harden and forge-review
- `references/question-style.md` — Decision Brief format for AskUserQuestion calls; used wherever a real decision is surfaced
- `references/headless.md` — no-human rule, the Codex question tool, the `FORGE_RESULT` line
- `scripts/status.mjs` — deterministic state + next action (`--json`)
- `../forge-principles/references/voice.md` — banned hedges, push-twice rule, calibrated acknowledgment; governs every skill's tone
- `references/scoring.md` — the 0–10 rate → fix-to-10 → re-rate loop + confidence gates + trend lines
- `../forge-harden/references/craft-patterns.md` — named thinking moves (inversion, one-way doors, constraint worship, …) the personas apply
