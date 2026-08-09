---
name: forge-design-system
description: Creates the project's design source of truth — DESIGN.md — before UI implementation. Forces the memorable-thing question, proposes 2-3 named aesthetic directions, locks typography (anti-default — never system-ui-as-personality), color philosophy, a 4px spacing scale, radius and motion discipline, and generates an HTML specimen page so the user picks with their eyes. Charter-safe — taste and coherence, never brand-as-market. Use when a plan implies UI surfaces and no DESIGN.md exists, when asked to "set up a design system", "pick fonts and colors", "make a DESIGN.md", or when forge-harden-design flags a missing system.
---

# forge-design-system

The convergent system step that runs *before* surfaces get designed.
`forge-design-explore` picks the shape of one surface; this skill locks the
**materials every surface is built from** — type, color, space, radius,
motion — so phases draw from one system instead of each inventing its own.
Output: `DESIGN.md` at the repo root, the design source of truth that
`forge-harden-design` (Pass 5), `forge-design-explore`, `forge-build`, and
`forge-polish` all align against.

## Charter

A design system here is craft infrastructure, never branding-for-market — the bar is
"every surface feels like one intentional thing", calibrated to the brief's "How it
should feel", and the user's taste is the client.

## When it runs

- **Suggested:** by `forge-plan` / `forge-harden-design` when the plan
  implies 2+ UI surfaces and no `DESIGN.md` exists.
- **Standalone:** any time, including pre-plan.
- If a `DESIGN.md` already exists: audit it against the brief and fill
  gaps — never rebuild from scratch without being asked.
- If the build has no UI: say so and exit.

## Process

### 1. Read the ground

`wiki/brief.md` ("How it should feel" is the spine), the taste profile at
`wiki/.forge/taste.md` if it exists (prior approved/rejected directions —
bias toward what the user has approved; *flag* conflicts rather than
silently overriding: "your record leans minimal; this brief asks for
playful"), any design ADRs, and the actual stack (what CSS/toolkit the
plan chose — tokens must land in its vocabulary).

### 2. The memorable thing (forcing question)

Ask, verbatim enough: **"What's the one thing someone should remember
after seeing this for the first time?"** One sentence. Push once if the
answer is a vibe ("that it's clean") rather than a thing ("the graph
animates as data arrives") — per `forge-principles`'s `references/voice.md`.
The answer is the lodestar every later trade-off resolves against; it goes at
the top of `DESIGN.md`.

### 3. Propose 2–3 named aesthetic directions

Generate genuinely different directions for the same feel — e.g.
`industrial/utilitarian` (function-first, data-dense, mono as the
personality font) vs. `warm editorial` (serif display, generous whitespace,
ink-on-paper palette) vs. `playful instrument` (chunky type, springy
motion, saturated accent). For each: one paragraph of what it feels like,
the typography and color it implies, and what it would be *wrong* for.
Present as one Decision Brief with a recommendation tied to the brief's
feel and the memorable thing.

### 4. Lock the system

For the chosen direction, specify — concretely, in the stack's token
vocabulary:

- **Typography.** Three roles — display, body, code/data — each a named
  typeface with the weights used. **Anti-default rule:** `system-ui` /
  `-apple-system` as the *personality* font is the "gave up on typography"
  signal; Inter/Geist only as a deliberate choice with a stated reason,
  never as the path of least resistance. Tabular numerals wherever data
  aligns.
- **Color.** A restrained philosophy, stated in one line (e.g. "the accent
  is rare and meaningful — data gets the color; chrome stays neutral"),
  then the palette as semantic tokens (bg / surface / text / muted /
  accent / danger) with contrast-checked values.
- **Spacing.** A 4px-base scale with named steps (e.g. 4 / 8 / 12 / 16 /
  24 / 32 / 48 / 64). Components use steps, never raw values.
- **Radius.** Per element class (controls / cards / pills) — one value
  each, not "rounded everywhere".
- **Motion.** Durations by size (micro ~100ms / short ~150ms / medium
  ~250ms / long ~400ms) + one easing stance + reduced-motion behavior.
- **Voice.** Three adjectives for microcopy and one empty-state example in
  that voice (empty states are features).

### 5. Specimen page — pick with eyes, give feedback per section

Generate the specimen as an **HTML file with a feedback system** (forge suite's
`references/design-feedback-board.md`) at `wiki/.forge/specimen.html` — real text,
no lorem. Before presenting, check every section against forge suite's
`references/anti-slop.md` and regenerate any that hits the blacklist — the user
never reacts to slop. It must render the locked system, take feedback per section, and copy it
back out; the layout is up to you (a ready template exists). Give the user
something to react to for each part — typography, color (swatches *and* in use:
a card, a button row, a data row, an empty state), spacing, radius, motion, voice.
If the type/color choice was genuinely close, show the 2–3 finalists side-by-side.
Open it via the generate-and-open contract — serve it and report a clickable URL,
don't just point at the path — have the user react per section and copy the
feedback back. Fold objective fixes in and iterate until it reads as "yes, that's
the thing". Don't skip this — adjectives lie, specimens don't.

### 6. Write it down

- **`DESIGN.md`** at the repo root — per `references/design-md.md`:
  memorable thing, direction, tokens, usage rules, anti-patterns.
- **ADR** (`wiki/decisions/NNNN-design-system.md`) — Context · Decision ·
  Why · Alternatives (the other directions, briefly) · Consequences.
- **Taste profile** — append the approved direction/fonts/palette (and any
  explicitly rejected finalists) to `wiki/.forge/taste.md` per the forge
  suite's `references/wiki.md` so future explorations start from the
  user's record, not from zero.
- Link both from `wiki/index.md`. Tell the user what was written.

### 7. Hand off

Recommend `forge-design-explore` for the first open surface, or back to
`forge-plan` / `forge` if this ran pre-plan. Downstream contract: any
phase that introduces an off-system value (raw px, unnamed color, new
font) now has an objective finding waiting in `forge-polish`.

## Rules

- The memorable thing comes first; a system with no lodestar is a theme,
  not a design.
- Anti-default is a hard rule for the personality layer; defaults are fine
  for the invisible layer (body text can be quiet — that's a choice too,
  stated).
- Specimen before lock — never finalize type/color the user hasn't seen
  rendered.
- 2–3 directions, never one. One direction presented is not a choice.
- Respect the taste profile; flag conflicts instead of silently obeying
  either side.
- Charter-safe: feel and coherence, never market/brand-positioning.

## References

- `references/design-md.md` — DESIGN.md structure + a worked example
- forge suite's `references/anti-slop.md` — the blacklist the specimen must clear before presentation
- forge suite's `references/design-feedback-board.md` — the interactive specimen board + generate-and-open contract
- forge suite's `references/question-style.md` — Decision Brief format
- forge suite's `references/scoring.md` — used by harden-design when auditing against this
- `forge-principles`'s `references/voice.md` — the push on vibe-answers
