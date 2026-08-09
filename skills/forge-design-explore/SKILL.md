---
name: forge-design-explore
description: Design exploration — generates 3-4 visual/interaction variants for a named UI surface BEFORE implementation. Rendered HTML variants on a served feedback board (ASCII only when the surface itself is a terminal UI), structured taste feedback, lock the direction as an ADR. Charter-safe — never about market appeal or conversion, only about which shape the user wants to build. Use after the plan names a UI surface or marks a phase Design explore, when asked to "explore designs", "show me variants", "design shotgun", "I don't know what this should look like", or any time you want options before committing.
---

# forge-design-explore

The divergent design step — multiple shapes for the *same* UI intent so the
user picks before code commits to one. Sister to `forge-harden-design`
(convergent — finds issues in a chosen shape) and `forge-polish` (runtime QA).

## Charter

Exploration is for craft, not market — never frame variants in conversion /
engagement / "users prefer" terms; the bar is which of these the *user* wants to
build, given what the brief said it should feel like.

## When to run

- **Standalone.** Most common. Invoke when staring at a phase that says
  "build the UI for X" and you don't yet know the shape.
- **Suggested.** `forge-plan` recommends this at hand-off when a phase's UI shape
  is genuinely open (and `forge-harden-design` may flag it during hardening) — the
  brief's "How it should feel" is firm but the layout isn't settled yet.

If the brief / plan already fixes the shape (e.g. "follow DESIGN.md
exactly"), say so and exit — exploration would be re-litigation.

## Process

### 1. Frame the surface

Identify the one specific surface to explore — a screen, a flow, an
interaction. If the request is "explore the design" generically, ask
(plain `AskUserQuestion`) which surface. Don't explore everything at once.

Read `wiki/brief.md` (especially "How it should feel"), `wiki/plan.md`'s
relevant phase, any `DESIGN.md` or design ADRs (see `forge-design-system`),
and the taste profile at `wiki/.forge/taste.md` if it exists — bias the
variant set toward the user's approved record, avoid resurrecting rejected
shapes, and **flag** conflicts out loud ("your record leans dense; this
brief asks for airy") rather than silently obeying either side.

### 2. Generate 3–4 variants

Each variant is a *different shape for the same intent*. Vary one
high-impact axis per variant — visual language, interaction model,
density, hierarchy. Don't just restyle the same layout.

Before presenting, run the checks in forge suite's `references/anti-slop.md`:
a variant that hits any blacklist pattern is **regenerated, not shown** — the
user never picks from slop. Then the **differentiation check**: if two
variants share the same layout skeleton, they are one variant — regenerate
the duplicate on a genuinely different axis.

For each variant, produce:

- **Name** — one or two words that capture the shape (`compact-table`,
  `card-grid`, `terminal-first`, `chat-stream`).
- **Mockup** — for any visual surface, **rendered HTML on the served feedback
  board is mandatory** (forge suite's `references/design-feedback-board.md`): it
  renders the variants, takes per-variant feedback, copies it back. Structure/
  layout is up to you (a ready template exists). ASCII is legitimate **only when
  the surface itself is a terminal UI** — "no browser reachable" is never a
  reason: the *user* opens the served board; the agent doesn't need a browser.
  Real layout, real text — no lorem ipsum, no "[chart here]" placeholders.
- **What it optimizes for** — one sentence tying back to the brief's
  "How it should feel".
- **What it costs** — concrete tradeoffs in craft terms (effort,
  responsive complexity, accessibility implications, future
  extensibility), never market terms.
- **What the first runnable version looks like** — one sentence on the
  thinnest possible implementation of this variant.

### 3. Present the variants

**Default — an HTML file with a feedback system.** Write the variants to
`wiki/.forge/explore-<surface>.html` and open it (generate-and-open contract in
`references/design-feedback-board.md`): it must render the variants, take feedback
per variant, and copy it back out — the exact layout is up to you (a ready
template exists if you want it). Lead with your recommendation and *why* —
anti-sycophantic; take a position. The user reacts per variant and pastes their
feedback back; fold objective fixes in and, if they want changes before choosing,
iterate.

**Terminal-UI path — `AskUserQuestion`** in the **Decision Brief** shape (forge
suite's `references/question-style.md`), each variant an option with the ASCII
mockup in the `preview` field. Only for surfaces that are themselves terminal/CLI
UIs — never a shortcut for a visual surface.

Three or four variants max. If five, you haven't picked a clear axis.

### 4. Lock the choice

Once the user picks (if the board feedback didn't make the choice unambiguous,
confirm it with one quick `AskUserQuestion`):

- Write an ADR (`wiki/decisions/NNNN-design-<surface>.md`) — Context ·
  Decision · Why · Alternatives considered (the *other* variants, in
  brief) · Consequences. Link from `wiki/index.md`.
- Update the relevant phase in `wiki/plan.md` to reference the chosen
  variant by name.
- If the project has a `DESIGN.md`, append a one-line entry pointing at
  the new ADR.
- Append to the taste profile (`wiki/.forge/taste.md`, format per forge
  suite's `references/wiki.md`): the approved variant's axis values, and
  any variant the user *rejected with a reason* — rejections steer future
  explorations as much as approvals.

### 5. Hand off

Recommend: continue with `forge-plan` if the exploration unblocked
planning, `forge-build` if the plan is ready and this was the missing
piece, or `forge` to resume the pipeline.

## Rules

- Exploration is divergent — never replay the same layout in three colors.
  Each variant must shape the *interaction* differently.
- Concrete mockups, no placeholders.
- Charter-safe: no market / conversion / "users prefer" framing.
- "I don't like any of them, let's try a different axis" is a fully valid
  answer — restart with a new axis, don't push the user to a forced pick.
- Stay in plan time — never write feature code from this skill. The choice
  becomes a plan input, not an implementation.

## References

- forge suite's `references/design-feedback-board.md` — the interactive board (default presentation) + generate-and-open contract
- forge suite's `references/anti-slop.md` — generation-time blacklist + differentiation check
- forge suite's `references/question-style.md` — Decision Brief format (the terminal-UI path)
