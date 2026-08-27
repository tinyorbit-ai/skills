---
name: forge
description: Resumable end-to-end build pipeline for makers — tells you where you left off and continues from exactly there. Routes through setup, discovery, planning, hardening, then a build→review→ship loop one phase at a time, with a wiki knowledge base alongside. Add `crack-on` to run every remaining phase back-to-back instead of stopping after each one; invoke with `help` (or `--help` / `?`) to print a status-aware usage map instead of running. Use when starting OR resuming a project, when asked to "forge this", "forge help", "forge crack-on", "crack on", "keep going", "don't stop", "run it all", "continue", "where was I", "build the next phase", "let's build X", or any time you want forge to pick up the thread.
---

# forge

The orchestrator. It is **resumable**: every run starts by reading the project's state and telling you exactly where you left off, then continues from there.

## Charter (governs everything)

**Context is welcome** — more is better than less, as *input* that sharpens the build. forge optimizes for craft and durability over speed-to-value. Full charter in
`forge-principles`'s `references/charter.md` — a **mandatory read before anything**.

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
  PLAN   init · discovery (+ambition) · plan · design (system+explore, if UI) · harden
  BUILD  build · review (+polish +dx) · ship  ·· 1 phase/run · all: /forge crack-on
  LOOK   debug (root-cause) · retro (synthesis, auto at Done)
  WIKI   wiki (ask · ingest context) · wiki-maintain (index · health) ·· any time

Every skill also runs standalone — invoke any directly:
  /forge-init  /forge-discovery  /forge-ambition  /forge-plan
  /forge-design-system  /forge-design-explore  (DESIGN.md, then design variants)
  /forge-harden                   (orchestrator; --auto for auto-decision)
  /forge-harden-eng  /forge-harden-security  /forge-harden-design
  /forge-harden-dx   /forge-harden-scope
  /forge-build  /forge-review  /forge-polish  /forge-dx
  /forge-ship  /forge-docs  /forge-debug  /forge-retro
  /forge-wiki  /forge-wiki-maintain   (knowledge base — ask, ingest, upkeep)

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
| plan ships UI and design is unresolved — no `DESIGN.md`, or any phase's `Design:` marker is an unlocked `explore` | Design | design cycle (Step 2) |
| plan has no `## Review` (not hardened) | Hardening | `forge-harden` |
| plan has `## Review` but `Lock status:` ≠ `locked` | Lock | present the lock gate (Step 2), then mark locked |
| plan locked (`Lock status: locked`), unbuilt phase exists | Build loop | see below |
| every plan phase has a build-log entry **and the latest is covered by a `wiki/retro.md` entry** | Done | report complete + open `improvements.md` |
| every plan phase has a build-log entry, **no retro covers the latest** | Wrap-up | invoke `forge-retro`, then report |

## Step 2 — run exactly the next thing, then stop

### Planning stages (init / discovery / plan / design / harden)

Invoke the one skill for the unmet stage. Each writes its wiki artifact. After it
completes, **stop and report** — do not silently chain into the next stage; tell the
user what's done and that the next `/forge` continues. (Exception: a fresh project
with nothing — offer, via AskUserQuestion, to run setup→discovery→plan→harden in
sequence so first-time setup isn't four invocations.)

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
   Each sub-skill also guards its own entry (build continues, review re-runs
   idempotently, ship checks branch position), so re-entry is always safe.
2. **Announce it.** Phase number, title, its branch, its verifiable gate. One line.
3. **Build.** Invoke `forge-build` for this phase (staff-engineer build of the best
   version of the phase, on its `phase/<n>-<slug>` branch) — under Maximum Effort's
   frontier-led allocation when installed. One frontier phase owner keeps judgment and
   integration while bounded factual or mechanical leaves may use smaller models. This
   changes only model allocation, never the loop's lifecycle (`references/phase-lanes.md`).
4. **Review.** Invoke `forge-review` on the phase's diff (security, tests, strict
   types, optional Codex, auto-fix objective findings, learnings → `wiki/learnings.md`,
   runtime verification of gate + goal). Review auto-invokes `forge-polish` (if the
   phase touched UI) and `forge-dx` (if the build is developer-facing); both are
   also runnable standalone any time.
5. **Ship.** Invoke `forge-ship` (verify gate green → one squashed commit on base,
   plus an optional `docs:` commit if `forge-docs` changed docs → one
   `wiki/build-log.md` entry).
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

```
forge · crack-on — complete | stopped at phase <n>
  Landed     phase <n> <title> — <commit>            (one line per phase)
  Gates      ✓ <gate that passed>  ·  ⏸ <skipped> → you run `<exact check>`
  Decisions  <taste decision deferred, its phase, the position taken>
  Your eyes  <one-way door hit; gate-deferred phases; anything else needing you>
  Left       <phases not attempted, and why the run stopped>
```

## Rules

- The status block comes first, every run. "Where you left off" is non-negotiable.
- One phase per `/forge` in the build loop by default, never batching unattended —
  `/forge crack-on` is the one deliberate opt-in exception to both.
- Never collapse a stage silently; each artifact is written before moving on.
- Decisions in any stage → ADRs in `wiki/decisions/` (`references/wiki.md`).
- Prototype-first: phase 1 is the thinnest end-to-end thing that runs.
- forge itself writes no feature code — it routes; `forge-build` builds.

## References

- `forge-principles`'s `references/charter.md` — the worldview (mandatory read)
- `references/branch-discipline.md` — phase/branch/squash/gate contract
- `references/wiki.md` — wiki layout (incl. `learnings.md` + taste profile), ADR format, capture rule
- `references/reviewer-agents.md` — adversarial reviewer abstraction (codex/gemini/claude); used by forge-harden and forge-review
- `references/question-style.md` — Decision Brief format for AskUserQuestion calls; used wherever a real decision is surfaced
- `forge-principles`'s `references/voice.md` — banned hedges, push-twice rule, calibrated acknowledgment; governs every skill's tone
- `references/scoring.md` — the 0–10 rate → fix-to-10 → re-rate loop + confidence gates + trend lines
- `forge-principles`'s `references/craft-patterns.md` — named thinking moves (inversion, one-way doors, constraint worship, …) the personas apply
- `references/phase-lanes.md` — frontier-led model allocation inside a Forge phase
