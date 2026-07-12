---
name: forge-plan
description: Turns the brief into a buildable, phased plan with every decision locked. Produces wiki/plan.md as ordered phases, each with a concrete verifiable gate and its own branch, plus seed ADRs for the real decisions. Prototype-first — phase 1 is the thinnest end-to-end thing that runs. Use after forge-discovery, when asked to "plan this", "make the build plan", or as stage 2 of forge before forge-harden.
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

### 2. Generate the approaches — at least two, equal weight

Before committing to an architecture, draft **2–3 genuinely different ways to
build the brief** (not three names for the same shape):

```
APPROACH A — <name>        (required: the MINIMAL VIABLE — fewest moving parts)
APPROACH B — <name>        (required: the IDEAL ARCHITECTURE — best long-term shape)
APPROACH C — <name>        (optional: the CREATIVE/LATERAL — a different framing
                            of the problem, include when one genuinely exists)
```

For each: a 1–2 sentence summary, effort (S/M/L), what it reuses from existing
code, two pros, two cons. **Default to the simplest approach that fully delivers
the brief's outcome** — the fewest moving parts, not the fewest features. An
approach with more parts earns each one against the brief; the burden is on
adding, not on cutting. The brief's ambition (locked at discovery) is the
tiebreaker on *outcome* — how excellent the result is — never a licence for
heavier means (`references/simplicity.md`). Present as one Decision Brief and lock
the choice as ADR 0001.

### 2b. Draft the architecture

Sketch the chosen approach: components, data flow, storage, external dependencies,
the key modules and their boundaries. Render it as a small ASCII or mermaid diagram.
Write it into `wiki/architecture.md` (replace its stub) with all four sections the
template names: **components & boundaries** (each boundary with the one-line *why
it's drawn there* — what change it isolates: the maintainability case), **data
flow**, **the central bet** (and what evidence would revisit it), and **scale
assumptions** — what breaks at 10× / 100× the data or load, and which phase
addresses it (or why none needs to). Short is still the bar; a stub is not.

Then write the **parts list** into `architecture.md` too: every component,
dependency, and abstraction on one line with the reason it's load-bearing — the
reason must name the brief clause it serves, not restate the part. A part with no
reason gets cut before the plan is written — the plan doesn't lock while one part
sits unjustified. Prefer reusing an existing path over introducing a new one.
(`forge-ship` reconciles this doc as every phase lands — you're writing v1 of a
living document, not a plan-time artifact.)

### 3. Surface and lock every real decision

Enumerate the genuine decisions: language/framework/library choices, data model,
API/interface shape, persistence, project structure, build order, testing approach.
For each *non-trivial* one:

- Present the realistic options with a recommendation and a reason.
- Lock it with AskUserQuestion in the **Decision Brief** shape (forge suite's
  `references/question-style.md`): framing names the concrete tradeoff;
  recommended option carries the *why* and the evidence that would flip it.
- Write an ADR: `wiki/decisions/NNNN-slug.md` with these section headings
  verbatim — Context · Decision · Why · **Alternatives considered** ·
  Consequences ("Options weighed" and friends break the wiki's health greps).
  Link it from `wiki/index.md`. Trivial choices don't need an ADR — reserve them
  for decisions a future reader would ask "why?" about.

### 4. Decompose into phases

Break the build into ordered phases. Hard rules:

- **Phase 1 is the thinnest end-to-end thing that runs** — a vertical slice that
  produces something you can execute and look at, not scaffolding or "set up the
  project". Prototype-first.
- Each later phase is a vertical slice that leaves the project in a working state.
- Each phase is small enough to hold in your head and complete on one branch.
- Phases are ordered; mark any two as explicitly parallel only if truly independent.
- **Each phase is self-contained.** A builder who reads only this phase plus its
  linked ADRs — with no other context — has everything needed to crack on. Spell out
  the goal, the work, and the decisions inline; richness in the spec is welcome (the
  economy you protect is the software's parts, not the plan's words).

For **every phase**, specify:

```
## Phase N — <title>
**Branch:** `phase/<n>-<slug>`
**Goal:** <the observable end state when this phase is done>
**Verifiable gate:** <exact command(s) or check whose pass/fail is unambiguous>
**Design:** none | follow DESIGN.md | explore | locked via [[decisions/NNNN-…]]
**Work:** <bullets — what gets built>
**Decisions:** <links to the ADRs this phase depends on / introduces>
```

The **Design:** marker routes the design cycle: `explore` means the surface's
shape is open and `forge` will run `forge-design-explore` (which locks an ADR and
flips the marker) before this phase can build. `none` for phases with no UI.
The marker is machine-read by `forge`'s router: its value is **exactly one of
the four forms above — never prose**. "Follow the design an earlier phase
locked" is spelled `locked via [[decisions/NNNN-…]]`, not "follow the phase-N
ADR"; there is no fifth form. Free-text here breaks the design gate.

The **verifiable gate** is the contract, and it must assert the **phase Goal's own
observable** — name the command and the expected output that only this phase's
work can produce. `typecheck && lint && test` runs at review and ship on every
phase anyway; it proves hygiene, **never the goal, so it is never sufficient as
the gate**.

```
Bad  (proves hygiene, not the phase):
  Goal: users can dedupe a folder from the CLI
  Gate: typecheck && lint && test

Good (proves the goal, observably):
  Goal: users can dedupe a folder from the CLI
  Gate: `dedupe ./fixtures/dupes` exits 0 and prints "reclaimed 312 MB";
        `dedupe ./fixtures/clean` prints "nothing to do"
```

Self-check before locking each phase: *"if the gate passed but the goal were
false, what would have caught it?"* — if the answer is nothing, rewrite the gate.
A precisely described manual check with an observable result is a valid gate; "it
works" / "looks right" is not. Match rigor to the project (a prototype's gate can
be "the script runs and prints X"), but the goal-anchor rule holds at every level.

Second self-check — the parts-list rule (§2b) extended to **behaviors**: every
behavior a phase's Goal, gate, or Work bullets introduce — an automatic state
transition, a derived default, a new interface surface or config knob — must
trace to a brief clause or a linked ADR. A behavior that traces to neither is
invented scope no matter how helpful it feels: cut it, or record it as an ADR so
the user owns the decision. "Plausibly what they'd want" is not a trace.

### 5. Write `wiki/plan.md`

Replace the stub: header (base branch + the discipline reminder from the template),
then the ordered phases. Keep it scannable. Update `wiki/index.md` so [[plan]]
reflects it's filled and list the new ADRs under the Decisions section.

### 6. Hand off

Design is a routed stage, not a suggestion. Enumerate every UI surface the plan
ships and set each phase's **Design:** marker before handing off:

- **UI phases exist and no `DESIGN.md`** → the design cycle runs next; `forge`
  routes to `forge-design-system` first (it locks the shared type/color/space
  system so phases don't each invent one).
- **A phase whose UI shape is genuinely open** ("build the UI for X" with no
  settled layout) → mark it `Design: explore`. `forge` will not let that phase
  enter the build loop until `forge-design-explore` locks its direction as an
  ADR and flips the marker to `locked via [[decisions/NNNN]]`.
- Shape already fixed → `Design: follow DESIGN.md`. No UI → `Design: none`.

Both design skills present their work as a **served** interactive feedback board
(forge suite's `references/design-feedback-board.md`) — the user picks with their
eyes before any code exists.

Then state the phase count, phase 1's branch + gate, which phases carry
`Design: explore`, and hand back to `forge` (design cycle if unresolved,
`forge-harden` otherwise).

## Rules

- A flat task list is not a plan. No phases / no gates / no branches = not done.
- One approach presented is not a choice. Minimal-viable and ideal-architecture
  are both always on the table, at equal weight (§2).
- Don't write feature code. Architecture, decisions, phases only.
- Every locked decision gets an ADR with a non-empty "Alternatives considered".
- Every AskUserQuestion call follows the Decision Brief shape (forge suite's
  `references/question-style.md`).
- Don't reduce scope on value judgments ("is this worth it?") — that's the
  gatekeeping forge rejects. But flagging a plan as **too large to build well**
  is engineering judgment, and it's required: when the phases exceed what can be
  built soundly, say so, propose the buildable shape, and record the cut in
  `improvements.md` as a deliberate scope decision. Reorder and slice for
  soundness; keep the ambition the brief set.
- And don't add parts the brief doesn't demand. Economy of means keeps the ambition
  while removing machinery; it applies to the software, not to the plan — which
  should be as thorough as the build needs (`references/simplicity.md`).
- Nor behaviors: anything a Goal, gate, or Work bullet *does* that neither the
  brief nor an ADR asked for is invented scope (§4's traceability self-check).
