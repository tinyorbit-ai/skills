---
name: forge-ship
description: Lands a completed phase under forge's branch discipline — verifies the phase's gate is green, squash-merges the phase branch back to the base branch as exactly one commit, and appends the phase's build-log entry to the wiki. Use when a phase from wiki/plan.md is done and ready to merge, or when asked to "ship this phase", "land it", "merge the phase", or "close out phase N".
metadata:
  internal: true
---

# forge-ship

Lands one phase. Enforces the contract: green gate → exactly one squashed commit on
the base branch → one build-log entry. Never lands ungated or with messy history.

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

### 2. Run the verifiable gate — and show it

Run the exact gate command(s) from the phase spec. Show the output. **If it is not
unambiguously green, stop.** Do not merge. Report what failed; recommend
`forge-debug`. A phase never lands on a red or hand-waved gate.

If the gate is a manual check, perform it and record the observed result verbatim —
"looks fine" is not acceptable; state what was observed and why it satisfies the gate.

### 3. Squash-merge to base (confirm first)

Outward/irreversible-ish action — confirm with the user before doing it, unless they
said proceed. Determine base branch from `wiki/plan.md` header.

```
git switch <base>
git merge --squash phase/<n>-<slug>
git commit -m "phase <n>: <one-line summary> (gate: <gate>)"
```

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
actually changed.

### 6. Report

State: phase landed, the single commit hash on base, the gate that passed, the
build-log entry written, whether `forge-docs` ran and what it changed, and
what the next phase + its branch + its gate are (from the plan). Optionally
offer to create the next phase branch.

## Rules

- No green gate, no merge. No exceptions — escalate to the user instead.
- Exactly one commit per phase on the base branch. If a squash would lose important
  message detail, put it in the build-log entry, not in extra base commits.
- Never push or open a PR unless explicitly asked; never commit on base outside the
  squash-merge commit.
- Don't skip the build-log entry — an unlogged phase is an incomplete phase.
