---
name: forge-build
description: Builds the next phase of a locked forge plan as a staff engineer would — the best possible version of THAT phase, on its own branch, within its boundary, then hands off to forge-review. Use when a plan is locked and a phase is ready to build, when asked to "build the next phase", "build phase N", "implement this phase", or as the build step of the forge loop.
---

# forge-build

Builds one phase of `wiki/plan.md`. Staff-engineer mode: the best version of *this
phase*, not the fastest, not beyond its boundary.

## Charter

The project is worth building — that's settled, never re-litigated. "Best version"
means craft and durability, **not** scope expansion and **not** speed-to-value.
Build the phase as written, excellently. Ambition lives in the plan; honor it.

## Before building

1. Read `references/charter.md` (suite) and `wiki/learnings.md` — past review
   lessons are rules you build by *now*, so review doesn't have to catch them again.
2. Read the phase in `wiki/plan.md`: its **goal**, **verifiable gate**, **work**
   bullets, **branch**, its **Design:** marker, and the ADRs it depends on
   (`wiki/decisions/`). Read `wiki/architecture.md` for the intended shape.
3. If the phase touches UI and `DESIGN.md` exists, **read it — it is the design
   source of truth.** Every surface uses its tokens (type, color, spacing scale,
   radius, motion); an off-system value (raw hex, px off the scale, a font not in
   the system) is a defect of the same class as a type error, not a style
   preference. The phase's locked design ADR binds the same way. If the phase's
   `Design:` marker is an unlocked `explore`, stop — the design cycle owns it;
   route to `forge-design-explore` before building.
4. Identify the phase: first phase with no `wiki/build-log.md` entry. If already on
   that phase's branch with work in progress, continue it; don't restart.

## Branch

Create or switch to the phase branch off the base branch (base recorded in
`wiki/plan.md` header):

```
git switch -c phase/<n>-<slug>      # or: git switch phase/<n>-<slug> if it exists
```

Never build on the base branch. Commit freely on the phase branch — small, coherent
commits as the work progresses (this is encouraged, not optional).

## Build, staff-engineer grade

Build the phase's work to a standard you'd defend in review:

- **Hit the goal exactly.** Everything the phase's goal/work specifies; nothing from
  later phases. If you discover work that belongs to a later phase, note it in
  `wiki/improvements.md` and leave it — do not pull it forward.
- **Delete what this phase supersedes.** Code, config, and tests the phase's work
  replaces get removed *in the same phase* — the old path, the branch that can no
  longer be reached, the shim whose last caller just went away. That is finishing
  the work, not scope creep; leaving both paths alive is the phase's own mess, and
  the next builder inherits it as "legacy". If a removal is genuinely unsafe, name
  the consumer that needs it and record an ADR — never default to keeping it "for
  compatibility" without one (`references/simplicity.md`).
- **Match the codebase.** Read neighboring code first; follow its patterns, naming,
  and idioms. New code should read like the surrounding code.
- **Default-deny before adding.** A new dependency, config surface, wrapper,
  abstraction, or service boundary needs the phase's work to demand it — otherwise
  prefer the existing path, and inline over abstract until a second caller exists.
  Keep functions small and performant: reach for the straightforward algorithm
  before the clever one, and never an accidental quadratic (`references/simplicity.md`).
- **Honor the ADRs.** Build along the recorded decisions. If a decision turns out
  wrong while building, stop, write/update the ADR with what you learned, and raise
  it — don't silently diverge.
- **Strict by construction.** Write to the project's strictest setting from the
  start (typed, no escape hatches, no `any`/equivalent — see `forge-review`'s
  `references/strictness.md`). Don't leave it for review to fix.
- **Tests as you go, sized to the risk.** Write the phase's tests with the code, not
  after. The target is *coverage* — every behavior the phase adds is caught by
  something that goes red if it regresses — not one test per behavior. Prefer the
  fewest tests that would actually catch it: one crossing the real seam over five
  mirroring the implementation, a real object over a mock, a fixture no bigger than
  its assertion. Tests are parts you pay for on every future change
  (`references/simplicity.md`), so match the depth to the risk the phase carries.
- **Handle the edges.** Empty/nil/error/timeout/concurrent paths the phase implies.
- **Capture the why.** Any non-trivial decision made while building → ADR; any
  surprising failure → `wiki/notes/`. Tell the user in the same turn.

Keep the phase's verifiable gate in mind as the target the whole time — build so it
will pass for the right reasons, not so it merely passes.

## Hand off

When the phase's work is complete and committed on its branch:

1. Run the phase's verifiable gate yourself once and show the result. If red, fix it
   (root-cause via `forge-debug` if non-trivial) before handing off — don't pass a
   broken phase to review.
2. Hand to **`forge-review`** for the full security / tests / strict-types /
   optional-Codex / auto-fix pass. Do not run `forge-ship` from here — review gates
   shipping.
3. Report: phase built, branch, commits, gate status, handing to review.

## Rules

- One phase only. Never start the next phase from here.
- Stay on the phase branch; never commit to base.
- Build to the strict standard now; review enforces, it shouldn't have to author.
- No scope creep — the plan sets ambition; later phases own later work. Removing
  what *this* phase superseded is not creep; it's the phase finishing its own work.
- Capture decisions/incidents to the wiki as they happen, and say so.
