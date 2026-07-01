---
name: forge-ship
description: Lands a completed phase under forge's branch discipline — rebases the phase branch onto the latest base, verifies the phase's gate plus scoped typecheck/lint/tests on the rebased tree, squash-merges back as exactly one commit, reconciles wiki/architecture.md, appends the build-log entry, and runs wiki index upkeep. Use when a phase from wiki/plan.md is done and ready to merge, or when asked to "ship this phase", "land it", "merge the phase", or "close out phase N".
---

# forge-ship

Lands one phase. Enforces the contract: rebase onto the latest base → green gate on
the rebased tree → exactly one squashed commit on the base branch → one build-log
entry. Never lands ungated, on a stale base, or with messy history.

## Charter

The project is worth building. Shipping here means **landing a verified phase
cleanly** — not "get it out fast", not "is it shippable as a product". The only bar
is: did the phase's declared gate pass.

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
    (AskUserQuestion) before continuing.
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
failed; recommend `forge-debug`. A phase never lands on a red or hand-waved gate.

If the gate is a manual check, perform it and record the observed result verbatim —
"looks fine" is not acceptable; state what was observed and why it satisfies the gate.

### 3. Squash-merge to base (confirm first)

Outward/irreversible-ish action — confirm with the user before doing it, unless they
said proceed. Determine base branch from `wiki/plan.md` header.

```
git switch <base>
git merge --ff-only origin/<base>    # bring base current; skip if no remote
git merge --squash phase/<n>-<slug>
git commit -m "phase <n>: <one-line summary> (gate: <gate>)"
```

Because the phase branch was just rebased onto base (§2), this squash cannot
conflict and the committed tree is byte-identical to the one the gate passed on —
that identity is what makes §2's green mean "green on base". If git still reports
a conflict, base moved after the rebase: abort the merge, return to §2, rebase
again. Never resolve conflicts on base.

One commit. The base branch history stays one gated commit per phase. Do **not**
push unless the user asks (their standing rule); if they do ask, confirm, then push.

### 4. Append the build-log entry

Prepend to `wiki/build-log.md` (newest on top):

```markdown
## Phase N — <title>
**Branch:** `phase/<n>-<slug>` → squashed to `<base>`

- <what was built, briefly>
- <the *why* of any notable decision; link the ADR — [[decisions/NNNN-...]]>
- <any scope cut → also note in [[improvements]]>
- **Gate:** <exact gate> — green (<one line on how verified>).
```

If decisions or incidents arose during the phase that aren't yet captured, write/
update the ADR or `wiki/notes/` entry now and link it. Update `wiki/index.md` if new
ADRs/notes were added.

Then **reconcile `wiki/architecture.md`** — this skill owns keeping it honest. If
the phase added or changed a component, a boundary, the data flow, a scale
assumption, or the central bet: update the doc (including its parts list) now and
add "architecture updated" to the build-log entry. If nothing changed shape, state
that explicitly in the entry. A phase never lands with a stale architecture doc.

### 4b. Wiki upkeep (automatic)

Run **`forge-wiki-maintain --fix`**: every index regenerated, safe health fixes
applied. Each landed phase leaves the wiki internally consistent — this runs every
ship, not when someone remembers.

### 5. Doc drift (auto if applicable)

If the landed phase's diff touched a documented surface (README, `docs/`,
`--help` text, exported API surface, OpenAPI spec, any `*.md` outside
`wiki/`), invoke **`forge-docs`** scoped to the just-landed commit. It
auto-fixes concrete drift (renamed commands, changed signatures, moved env
vars) and surfaces structural gaps as taste decisions. If no doc surface
was touched, skip cleanly and say so.

`forge-docs`'s commits (if it actually edits anything) land on the base
branch as one additional commit per phase, prefixed `docs:`. This is the
only exception to "one commit per phase on base" — and only when docs
actually changed. If the doc edits touch anything that participates in the
build (generated help text, doc tests, typed examples), re-run §2's scoped
verification before committing; prose-only docs land as-is.

### 6. Report

State: phase landed, the single commit hash on base, the gate that passed, the
build-log entry written, whether `forge-docs` ran and what it changed, and
what the next phase + its branch + its gate are (from the plan). Optionally
offer to create the next phase branch.

## Rules

- No green gate **on the rebased tree**, no merge. No exceptions — escalate to the
  user instead. Rebase-then-verify is what makes "green" mean green on base.
- One squashed phase commit on the base branch — plus, **only when `forge-docs`
  actually changed docs**, one optional follow-up `docs:` commit (§5). No other
  commits on base. If a squash would lose important message detail, put it in the
  build-log entry, not in extra base commits.
- Never push or open a PR unless explicitly asked; never commit on base outside the
  squash-merge commit.
- Don't skip the build-log entry — an unlogged phase is an incomplete phase.
