---
name: forge-plan
description: Turns the brief into a buildable, phased plan with every decision locked. Produces wiki/plan.md as ordered phases, each with a concrete verifiable gate and its own branch, plus seed ADRs for the real decisions. Prototype-first — phase 1 is the thinnest end-to-end thing that runs. Use after forge-discovery, when asked to "plan this", "make the build plan", or as stage 2 of forge before forge-harden.
metadata:
  internal: true
---

# forge-plan

Turns `wiki/brief.md` into `wiki/plan.md`: an ordered list of **verifiable phases**,
each on its own branch, with every real decision locked and recorded as an ADR.

## Charter

The project is worth building — that's settled. Don't re-litigate scope on value
grounds. The scope is what the brief says; your job is to make it *buildable*, not
smaller-for-business-reasons. (You may split or reorder for engineering soundness —
that's different from cutting ambition.)

## Process

Prereq: `wiki/brief.md` exists and is filled. If not, run `forge-discovery` first.

### 1. Read the brief and the ground

Read `wiki/brief.md`, `wiki/architecture.md`, `CLAUDE.md`/`AGENTS.md`, and the
current codebase shape. Confirm the base branch and record it in the plan header.

### 2. Draft the architecture

Sketch the system: components, data flow, storage, external dependencies, the key
modules and their boundaries. Render it as a small ASCII or mermaid diagram. Write
the 30-second version into `wiki/architecture.md` (replace its stub).

### 3. Surface and lock every real decision

Enumerate the genuine decisions: language/framework/library choices, data model,
API/interface shape, persistence, project structure, build order, testing approach.
For each *non-trivial* one:

- Present the realistic options with a recommendation and a reason.
- Lock it with AskUserQuestion in the **Decision Brief** shape (forge suite's
  `references/question-style.md`): framing names the concrete tradeoff;
  recommended option carries the *why* and the evidence that would flip it.
- Write an ADR: `wiki/decisions/NNNN-slug.md` (Context · Decision · Why ·
  Alternatives · Consequences). Link it from `wiki/index.md`. Trivial choices don't
  need an ADR — reserve them for decisions a future reader would ask "why?" about.

### 4. Decompose into phases

Break the build into ordered phases. Hard rules:

- **Phase 1 is the thinnest end-to-end thing that runs** — a vertical slice that
  produces something you can execute and look at, not scaffolding or "set up the
  project". Prototype-first.
- Each later phase is a vertical slice that leaves the project in a working state.
- Each phase is small enough to hold in your head and complete on one branch.
- Phases are ordered; mark any two as explicitly parallel only if truly independent.

For **every phase**, specify:

```
## Phase N — <title>
**Branch:** `phase/<n>-<slug>`
**Goal:** <the observable end state when this phase is done>
**Verifiable gate:** <exact command(s) or check whose pass/fail is unambiguous>
**Work:** <bullets — what gets built>
**Decisions:** <links to the ADRs this phase depends on / introduces>
```

The **verifiable gate** is the contract. It must be concrete and runnable —
`typecheck && lint && test && build`, a named eval that must PASS, a script with a
specific expected output, or a precisely described manual check with an observable
result. "It works" / "looks right" is not a gate. Match gate rigor to the project:
a prototype's gate can be "the script runs and prints X"; don't over-engineer CI for
a toy, don't under-specify for something load-bearing.

### 5. Write `wiki/plan.md`

Replace the stub: header (base branch + the discipline reminder from the template),
then the ordered phases. Keep it scannable. Update `wiki/index.md` so [[plan]]
reflects it's filled and list the new ADRs under the Decisions section.

### 6. Hand off

State the phase count and phase 1's branch + gate. Recommend `forge-harden` to
harden the plan before building (or return to `forge`).

## Rules

- A flat task list is not a plan. No phases / no gates / no branches = not done.
- Don't write feature code. Architecture, decisions, phases only.
- Every locked decision gets an ADR with a non-empty "Alternatives considered".
- Every AskUserQuestion call follows the Decision Brief shape (forge suite's
  `references/question-style.md`).
- Don't reduce scope to make it "more shippable" — that's the gatekeeping forge
  rejects. Reorder and slice for soundness; keep the ambition the brief set.
