---
name: forge-design-explore
description: Design exploration — generates 3-4 visual/interaction variants for a named UI surface BEFORE implementation. ASCII or HTML mockup variants side-by-side, structured taste feedback, lock the direction as an ADR. Charter-safe — never about market appeal or conversion, only about which shape the user wants to build. Use after the plan names a UI surface, when asked to "explore designs", "show me variants", "design shotgun", "I don't know what this should look like", or any time you want options before committing.
metadata:
  internal: true
---

# forge-design-explore

The divergent design step — multiple shapes for the *same* UI intent so the
user picks before code commits to one. Sister to `forge-harden-design`
(convergent — finds issues in a chosen shape) and `forge-polish` (runtime QA).

## Charter

Exploration is for craft, not market. Never frame variants in
conversion / engagement / "users prefer" terms. The bar is: which of these
does the *user* want to build, given what the brief said it should feel like?

## When to run

- **Standalone.** Most common. Invoke when staring at a phase that says
  "build the UI for X" and you don't yet know the shape.
- **Suggested.** `forge-discovery` and `forge-plan` may suggest this if the
  brief's "How it should feel" is firm but the shape is genuinely open.

If the brief / plan already fixes the shape (e.g. "follow DESIGN.md
exactly"), say so and exit — exploration would be re-litigation.

## Process

### 1. Frame the surface

Identify the one specific surface to explore — a screen, a flow, an
interaction. If the request is "explore the design" generically, ask
(plain `AskUserQuestion`) which surface. Don't explore everything at once.

Read `wiki/brief.md` (especially "How it should feel"), `wiki/plan.md`'s
relevant phase, and any `DESIGN.md` or design ADRs.

### 2. Generate 3–4 variants

Each variant is a *different shape for the same intent*. Vary one
high-impact axis per variant — visual language, interaction model,
density, hierarchy. Don't just restyle the same layout.

For each variant, produce:

- **Name** — one or two words that capture the shape (`compact-table`,
  `card-grid`, `terminal-first`, `chat-stream`).
- **Mockup** — ASCII layout for terminal/CLI surfaces, or an HTML/CSS
  snippet for web. Real layout, real text. No lorem ipsum, no
  "[chart here]" placeholders. (For a richer HTML pass, hand off to a
  HTML-generation tool — but the variant itself must be concrete.)
- **What it optimizes for** — one sentence tying back to the brief's
  "How it should feel".
- **What it costs** — concrete tradeoffs in craft terms (effort,
  responsive complexity, accessibility implications, future
  extensibility), never market terms.
- **What the first runnable version looks like** — one sentence on the
  thinnest possible implementation of this variant.

### 3. Present the variants

`AskUserQuestion` in the **Decision Brief** shape (forge suite's
`references/question-style.md`). Each variant becomes an option; use
the `preview` field with the ASCII mockup. Lead with your recommendation
and *why* — anti-sycophantic; take a position.

Three or four options max. If five, you haven't picked a clear axis.

### 4. Lock the choice

Once the user picks:

- Write an ADR (`wiki/decisions/NNNN-design-<surface>.md`) — Context ·
  Decision · Why · Alternatives considered (the *other* variants, in
  brief) · Consequences. Link from `wiki/index.md`.
- Update the relevant phase in `wiki/plan.md` to reference the chosen
  variant by name.
- If the project has a `DESIGN.md`, append a one-line entry pointing at
  the new ADR.

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

- forge suite's `references/question-style.md` — Decision Brief format
