# Phase & branch discipline

The non-negotiable execution contract. `forge-plan` writes plans that obey it;
`forge-ship` enforces it; `forge`, `forge-build`, and `forge-review` assume it.

## Rules

1. **Work happens in phases.** The plan (`wiki/plan.md`) is an ordered list of
   phases. Phases are executed strictly in order unless the plan marks two as
   explicitly parallel.

2. **One branch per phase.** Before any code for phase N is written, create a
   branch off the current base branch:
   ```
   git switch -c phase/<n>-<slug>
   ```
   `<slug>` is a short kebab summary of the phase (e.g. `phase/2-retrieval`).

3. **Commit freely inside the phase branch.** As many commits as the work needs.
   This branch is your scratch space. (Aligns with the user's rule: commit freely
   on non-base branches; never commit directly on the base branch.)

4. **Rebase before landing.** Before a phase merges, fetch and rebase the phase
   branch onto the latest base (`git fetch origin && git rebase origin/<base>`).
   Conflicts are resolved on the phase branch, never during the merge — and the
   gate runs on the *rebased* tree, so "green" means green against what will
   actually land.

5. **A phase merges back as exactly ONE commit.** When the rebased phase branch's
   verifiable gate is green, it collapses to a single commit on the base branch:
   ```
   git switch <base> && git merge --squash phase/<n>-<slug>
   git commit -m "phase <n>: <one-line summary> (gate: <gate>)"
   ```
   A rebased branch squashes without conflict and lands the exact tree the gate
   passed on. The base branch history is therefore one clean commit per phase —
   bisectable, each commit a known-good gated state.

6. **No merge without a green gate — plus scoped verification.** Every phase
   declares a *verifiable gate*: a concrete command or check whose pass/fail is
   unambiguous and that proves the phase's own goal. At land time the gate runs
   alongside typecheck, lint, and the tests covering the phase's diff (scoped to
   the touched surface — not an hours-long full suite; the full suite only when
   it's fast). "It seems to work" is not a gate. Everything is run and shown
   green before merge.

7. **Every merged phase gets one build-log entry.** `forge-ship` appends to
   `wiki/build-log.md`: the phase, its branch, what was done, the *why* of any
   notable decision, and the exact gate that was met before merge.

## Why squash-per-phase

The base branch becomes a sequence of verifiable checkpoints. Anyone (you, later)
can `git log` the base branch and read the project's real history at the phase
grain, each commit a state where the gate passed. The messy iteration stays on the
phase branch where it belongs.
