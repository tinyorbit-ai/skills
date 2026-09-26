---
name: forge-ship
description: Lands a finished forge phase — rebases onto base, reruns the gate plus typecheck, lint and tests, squash-merges it as one commit, and updates the build log and wiki. Use when a phase in wiki/plan.md is done, or when asked to "ship this phase", "merge the phase" or "close out phase N".
---

# forge-ship

Lands one phase. Enforces the contract: rebase onto the latest base → green gate on
the rebased tree → exactly one squashed commit on the base branch → one build-log
entry. Never lands ungated, on a stale base, or with messy history. `--pr` lands through
a pull request instead of a local squash.

## The contract (enforced here)

- A phase is executed on its own branch `phase/<n>-<slug>` off the base branch.
- Any number of commits on the phase branch; **never commit directly on the base
  branch** (also the user's standing rule).
- A phase lands as **exactly one squashed commit** on the base branch.
- It lands **only after its verifiable gate (from `wiki/plan.md`) is green**.
- Each landed phase appends **one** `wiki/build-log.md` entry.

## Process

### 1. Identify the phase and check position

- Read `wiki/plan.md`; identify which phase this is and its declared **verifiable
  gate** and branch name.
- `git branch --show-current`. You must be on the phase branch `phase/<n>-<slug>`.
  - If on the base branch with phase work uncommitted: create the phase branch now
    and move the work onto it. Do not proceed on base.
  - If the phase branch name doesn't match the plan, reconcile with the user
    (AskUserQuestion); with no one to ask, use the branch you are on and note it.
- `git status` clean or all phase work committed on the phase branch first (commit
  freely here — that's allowed and expected).

### 2. Sync with base, then verify — on the tree that will actually land

Rebase first, so the gate runs against reality, not a stale branch point:

```
git fetch origin                 # skip if no remote
git rebase origin/<base>         # or <base> when there's no remote
```

Conflicts are resolved **here, on the phase branch — never during the merge**. If
the rebase conflicts, resolve each hunk, `git rebase --continue`, and treat the
result as new work: everything below runs on the rebased tree.

Then run, and show the output of:

1. **The exact gate command(s) from the phase spec** — this proves the phase goal.
2. **The scoped verification** — typecheck, lint, and the tests covering what this
   phase's diff touched (the affected packages/modules, not the whole monorepo).
   Scoped means zoned in on the change: a full suite that takes hours is not the
   contract; the touched surface is. If the project's full suite *is* fast, run it.

**If any of it is not unambiguously green, stop.** Do not merge. Report what
failed; recommend `forge-debug`, and end with `FORGE_RESULT` status `blocked`, gate
`red`. A phase never lands on a red or hand-waved gate.

If the gate is a manual check, perform it and record the observed result verbatim —
"looks fine" is not acceptable; state what was observed and why it satisfies the gate.

### 3. Write the record on the phase branch, before landing

Everything the phase changes in the repo goes into the phase branch now, so the
landing is one commit and base is never edited afterwards.

1. **Build-log entry.** Prepend to `wiki/build-log.md` (newest on top):

   ```markdown
   ## Phase N — <title>
   **Branch:** `phase/<n>-<slug>` → squashed to `<base>` | PR to `<base>`

   - <what was built, briefly>
   - <the *why* of any notable decision; link the ADR — [[decisions/NNNN-...]]>
   - <any scope cut → also note in [[improvements]]>
   - **Gate:** <exact gate> — green (<one line on how verified>) | deferred (<the check the user must run>).
   ```

   Write or update any ADR or `wiki/notes/` entry the phase needs and link it.
2. **Architecture.** If the phase added or changed a component, boundary, data flow,
   scale assumption or the central bet, update `wiki/architecture.md` (parts list
   included) and add "architecture updated" to the entry. Otherwise say "architecture
   unchanged" in the entry.
3. **Wiki upkeep.** Run `../forge-wiki/scripts/wiki-maintain.mjs --fix` with node
   (the path is relative to this skill's folder). It regenerates every index and applies the
   safe fixes; read its `_health-report.md` and write any missing Summary lines.
4. **Docs.** If the diff touched a documented surface (README, `docs/`, `--help`
   text, exported API, OpenAPI, any `*.md` outside `wiki/`), run `forge-docs` on the
   phase diff. It edits on this branch.
5. Commit these on the phase branch. If the docs edits touch anything that builds
   (generated help, doc tests, typed examples), re-run §2's scoped verification.

### 4. Land

**Local (default).** Squashing to a local base is reversible until pushed, so with no
one to ask, proceed (`forge-principles` rule 10); in a live session confirm first.
Determine the base branch from the `wiki/plan.md` header.

```
git switch <base>
git merge --ff-only origin/<base>    # bring base current; skip if no remote
git merge --squash phase/<n>-<slug>
git commit -m "phase <n>: <one-line summary> (gate: <gate>)"
```

The phase branch was just rebased (§2), so this cannot conflict and the tree is the
one the gate passed on. If git still reports a conflict, base moved: abort, go back
to §2. Never resolve conflicts on base. Don't push unless the user asked.

**`--pr` (factories, protected bases).** Don't touch base. Push the phase branch and
open a PR against `<base>` (`gh pr create --fill`, or hand the branch to `shepherd
--once` when installed). The PR is squash-merged by whoever owns the merge; the
build-log entry is already in it. Report the PR URL.

### 5. Report

State: phase landed (commit on base, or PR URL), the gate that passed, the build-log
entry, whether `forge-docs` changed anything, and the next phase with its branch and
gate. End with the result line from `../forge/references/headless.md`:

`FORGE_RESULT {"skill":"forge-ship","status":"done","phase":N,"gate":"green","notes":"<commit or PR URL>"}`

## Rules

- No green gate on the rebased tree, no landing. Escalate instead. The one exception
  is a crack-on gate the agent cannot run (human, browser, device): it lands with
  `gate: deferred` and the exact check in the build-log entry (`../forge/references/crack-on.md`).
- Exactly one squashed commit per phase on base, holding the code, the build-log
  entry, the wiki and the docs. No other commits on base.
- Never commit on base outside the squash commit. Never push to base unless asked.
- An unlogged phase is an incomplete phase.
