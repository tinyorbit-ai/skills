---
name: forge-discovery
description: Discovery conversation that turns a raw idea into a precise brief — base seven questions (what / who & when / how it should feel / hard part / constraints / non-goals / alternatives) plus a sharpening five (the specific moment, the friction it replaces, smallest useful version, what surprised you imagining it, three-year fit). Deliberately asks nothing about money, market, demand, or whether it's "worth it". Use when you have an idea and need it pinned down, when asked to "shape this", "what are we building", or as stage 1 of forge before forge-plan.
metadata:
  internal: true
---

# forge-discovery

Pins a fuzzy idea into a precise brief. Output: `wiki/brief.md`. This is the
"figure out exactly what we're building" stage.

## Charter

The project is worth building because you chose it. **Do not ask whether it should
exist.** Forbidden, by design — never ask about, hint at, or factor in: market size,
demand evidence, monetization, competitors-as-threat, "is this worth building",
"will anyone use it", "what's the fastest path to value", or how to validate the
idea. If only the user will ever use it, that is a complete reason. Your job is to
understand the build they want, not to qualify it.

## Process

If `wiki/` doesn't exist, run `forge-init` first.

### 1. Context scan (silent)

Read `CLAUDE.md`/`AGENTS.md`, any existing `wiki/brief.md`, `git log --oneline -15`,
and obvious entry-point files. Form a hypothesis of the idea before asking anything.

### 2. Discovery — ask in small batches via AskUserQuestion

Cover the **base seven** below, then the **sharpening five** in §2b. Lead each
with your best guess from the context scan so the user corrects rather than
writes essays. One or two questions per round, never the whole list at once.

**Base seven** — the shape:

- **What is it?** One paragraph, the user's words. The thing itself.
- **Who uses it, and when?** Could be only the user. A person in a situation, not a
  market segment. What are they doing right before and right after they touch it.
- **How should it feel to use?** Fast? Calm? Playful? Invisible? Powerful? The
  experiential target — this drives a lot of later design decisions.
- **What's the hard or interesting part?** The bit that makes this worth your
  attention — the technical knot, the design problem, the thing you want to learn.
- **Constraints.** Stack/platform/language preferences, things that must be true,
  how much surface you want this to have, anything fixed.
- **Non-goals.** What it is explicitly *not*. The things you will not build. This
  is as important as the goals and prevents scope drift later.
- **Alternatives & prior art.** Other shapes you considered, existing things in the
  space, and why this shape over those. (Framed as design context — not "why won't
  competitors win", purely "what shape and why this one".)

Take positions. If the user is vague on the feel or the hard part, propose a
concrete option and let them react. Anti-sycophantic: if two answers contradict
(e.g. "must be dead simple" + a large feature list), name the tension and resolve
it with them now.

### 2b. Sharpening pass — five forcing questions (charter-safe)

After the base seven, run these five. They're adapted from gstack's
office-hours forcing questions, **stripped of every business/market/demand
hook** — every one asks about the build, the experience, or the craft. Skip a
question only if the answer is unambiguously in the base-seven answers.

- **The specific moment.** Name the concrete moment this thing serves. Not "a
  user" — *which* moment, the action right before, the action right after.
  Concrete enough that you could film it.
- **The friction it replaces.** What you currently do (or would do) without
  this — and the friction in it. Measure in *effort, attention, or annoyance*,
  never in money. If "nothing, this is new", say so — that's a valid answer.
- **The smallest version that's already useful.** What's the thinnest version
  of this thing that would *already* be worth using? This becomes the seed for
  phase 1; spend real thought here.
- **What surprised you imagining it.** When you imagine using the finished
  thing, what's the part that surprises you — something better than expected,
  or something harder than expected? That surprise often points at the real
  shape.
- **Three-year fit.** Three years from now, do you want this to be *more*
  essential, *less* essential, or the same? Bigger surface, sharper niche, or
  archived after the itch is scratched? All three are valid — the point is to
  *know* now so the plan doesn't drift.

Lead with your best read on each, like before. Two questions per round, not all
five at once.

### 3. Reflect back: offer shapes, not verdicts

Synthesize what you heard into 2–3 candidate **shapes** — different ways to build
the *same intent* (e.g. "a CLI", "a local web app", "a library + thin demo"). For
each: what it optimizes for, what it costs, what the first runnable version looks
like. These are build approaches, never "should you build it" — every option
assumes the project happens.

Lock the chosen shape with AskUserQuestion in the **Decision Brief** shape
(forge suite's `references/question-style.md`): concrete framing, named stakes,
recommendation with the *why* and the evidence that would flip it.

### 3b. Ambition check (auto)

Before writing the brief, invoke **`forge-ambition`** on the draft. It pressure-tests
whether this is the most ambitious version of *the thing the user already chose* —
strictly charter-safe (no money/market/demand; "smaller on purpose" is a valid
answer it must accept). Fold its outcome into the brief. Skip only if the user
explicitly says they don't want it.

### 4. Write `wiki/brief.md`

Replace the stub. Sections, in this order:

- **What it is** — the paragraph from question 1.
- **Who & when** — the specific moment from §2b plus the base who/when.
- **How it should feel** — the experiential target.
- **The hard/interesting part** — the bit that makes it worth your attention.
- **The friction it replaces** — what the user does without it today, in
  effort/attention.
- **Smallest useful version** — the seed for phase 1.
- **Three-year fit** — more essential / less essential / same, and why.
- **Constraints** — stack, platform, fixed shape.
- **Non-goals** — what it explicitly is *not*.
- **Shape chosen** — the picked shape with a one-line *why* over alternatives.
- **What surprised you** — the surprise from §2b, captured so later phases
  honor it instead of designing it away.

Keep it tight — a page, not an essay. Every section earns its place.

If any genuine decision was made here (the shape, a fixed constraint), also write an
ADR per `wiki/` conventions and link it from `wiki/index.md`.

### 5. Hand off

- Update `wiki/index.md`: replace the `{ONELINE}` placeholder (or
  `_filled by forge-discovery_`) under "What this is (one line)" with a real
  one-sentence summary derived from the brief. Mark [[brief]] as filled.
- Recommend `forge-plan` next (or returning to `forge` for the full pipeline).

## Rules

- No code. No file scaffolding beyond the brief + any ADR.
- If you notice yourself about to evaluate the idea's merit — stop, that's not this
  skill's job. Shape the build; never grade the premise.
- The brief must make the *non-goals* and *the feel* explicit — those two are the
  most common things later stages need and the most common things left implicit.
