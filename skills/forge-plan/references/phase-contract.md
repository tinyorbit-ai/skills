# Phase contract

Read this file in full during forge-plan step 4.

## Order by evidence, not feature breadth

Phase 1 is the thinnest end-to-end workflow that runs — never scaffolding. Make
it expose the highest-risk material bet when that can stay thin. After that,
order phases by risk retired per unit of work: falsify the highest-impact,
least-certain bet before adding feature breadth that depends on it. Mark phases
parallel only when neither consumes the other's evidence. Each phase is a
self-contained vertical slice, small enough for one branch, that leaves the
project working.

For every material bet, add this exact block under `## Risk contracts`:

```markdown
### Risk — <bet name>
**Hypothesis:** <specific claim that must be true>
**Falsification gate:** <command/experiment + observable result that disproves it>
**Fallback:** <simpler viable path if falsified>
**Trigger:** <numeric or observable condition that activates the fallback>
**Last cheap decision phase:** Phase <N> — <why later reversal becomes expensive>
```

Schedule the falsification gate no later than the named phase. A fallback without
a trigger is wishful thinking; a gate that can only confirm the hypothesis is not
falsification. Phase order must retire the highest-impact/lowest-confidence bet
before breadth that depends on it.

## Exact phase block

Use `## Phase N — <title>` exactly — the evals and router machine-read it.

```markdown
## Phase N — <title>
**Branch:** `phase/<n>-<slug>`
**Goal:** <observable end state>
**Risks retired:** <links/names from Risk contracts, or none>
**Verifiable gate:** <exact command/check and expected output>
**Design:** none | follow DESIGN.md | explore | locked via [[decisions/NNNN-…]]
**Work:** <bullets>
**Decisions:** <linked ADRs>
```

The `Design:` value is exactly one form above, never prose. `explore` routes to
forge-design-explore; `none` means no UI.

The gate must assert the Goal's own observable — name the command and the expected
output that only this phase's work can produce. `typecheck && lint && test` runs at
review and ship on every phase anyway; it proves hygiene, **never the goal, so it is
never sufficient as the gate**.

```
Bad  (proves hygiene, not the phase):
  Goal: users can dedupe a folder from the CLI
  Gate: typecheck && lint && test

Good (proves the goal, observably):
  Goal: users can dedupe a folder from the CLI
  Gate: `dedupe ./fixtures/dupes` exits 0 and prints "reclaimed 312 MB";
        `dedupe ./fixtures/clean` prints "nothing to do"
```

Self-check before locking each phase: *if this gate passed while the goal were
false, what would catch it?* Rewrite when the answer is nothing. A precisely
described manual check with an observable result is valid; "it works" or "looks
right" is not. Match rigor to the project (a prototype's gate can be "the script
runs and prints X"), but the goal-anchor rule holds at every level.

Every behavior introduced by Goal, gate, or Work — state transition, default,
interface, or config knob — must trace to a brief clause or linked ADR. Otherwise
cut it or let the user own it through an ADR.

## Human evidence gate

When the brief says real use is unknown / unwatched, attach an explicit
`**Human evidence gate:**` to the phase that first delivers the smallest useful
workflow. Require observed use by the named person/group, the task they attempt,
the evidence captured, and a go/change/stop decision. This gate runs after the
workflow exists and blocks every billing, scale, or polish phase. Do not replace
it with design review, automated tests, analytics, or the builder's opinion.

## Release closure

The final phase is explicitly titled `Release closure`. Its Work and gate cover
every item below as proved work or `n/a — <reason>`:

- security and authz; abuse controls; secret scanning;
- backup/restore and upgrade (for stateful builds);
- observability and actionable alerts;
- packaging plus supported-platform/provider matrix;
- operator/user runbooks;
- a release smoke from the exact shipped artifact/path.

The release smoke must install/deploy the packaged artifact through the real
release path and exercise the smallest useful workflow. A source-tree test is
not a release smoke.
