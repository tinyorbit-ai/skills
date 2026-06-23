---
name: forge-discovery
description: Discovery conversation that turns a raw idea into a precise brief — base seven questions (what / who & when / how it should feel / hard part / constraints / non-goals / alternatives) plus a sharpening six (the specific moment, the friction it replaces, smallest useful version, watched-it-done observation, drawn-to/unsure, three-year fit), each with a push-until gate so vague answers get one sharp follow-up. Deliberately asks nothing about money, market, demand, or whether it's "worth it". Works from either a one-sentence idea or an existing one-pager/research doc — anchors on what you give it and never guesses the project from folder names. Use when you have an idea and need it pinned down, when asked to "shape this", "what are we building", or as stage 1 of forge before forge-plan.
---

# forge-discovery

Pins a fuzzy idea into a precise brief. Output: `wiki/brief.md`. This is the
"figure out exactly what we're building" stage.

## Charter

The project is worth building because you chose it, and you're the right person to
build it — **both settled; never ask whether it should exist or whether you're the
one to build it.** Everything else is fair game. Context is welcome — more is better
than less: if the user offers market, demand, business, competitive, or user context,
take it in gladly and let it sharpen the brief. The one thing you never do is turn
that context into a verdict on the two settled questions ("so is this worth it?",
"are you the right person?"). If only the user will ever use it, that's a complete
reason. Your job is to understand the build they want, not to qualify it.

## Process

If `wiki/` doesn't exist, run `forge-init` first.

### 1. Find the seed — anchor on what the user gave you

forge-discovery works from **the user's stated intent**, in one of three entry
modes. Detect which you're in *before* doing anything else:

- **One-liner seed** — the user gave a sentence ("a CLI that dedupes my photos") or
  a short description. Treat it as the spine. Go to §2 and lead each question with a
  guess derived from *that sentence*.
- **Document seed** — the user points at (or there obviously is) a one-pager,
  research note, or draft brief. **Ingest it first** (§1a).
- **No seed** — nothing was provided. **Ask for one first** (§1b). Do not proceed on
  inference.

**Never infer the project from folder names, the file tree, or incidental repo
structure — those are not a brief.** A *silent supporting scan* of
`CLAUDE.md`/`AGENTS.md`/`git log` is allowed only to learn the **stack and
conventions**, never to decide *what the project is*. If you catch yourself guessing
the idea from directory names, stop and ask the user instead (§1b).

#### 1a. Document seed — ingest, then ask only the gaps

Read the doc in full. Map what it already answers onto the **base seven** (§2) and
the **sharpening five** (§2b). Then:

1. Reflect back, compactly: "Here's what I extracted from your doc" (the filled
   sections) and "Here's what it doesn't pin down yet" (the gaps).
2. Ask **only the gaps**, in small batches (§2 rules). Do not re-ask anything the
   doc already answers — the user already did that work.
3. Proceed to §3.

#### 1b. No seed — ask for one before anything

If there's no sentence and no doc, ask plainly: *"Give me one sentence on what this
is — or point me at a one-pager / research note and I'll start from that."* Wait for
it. Do not scan-and-guess a hypothesis from the repo's structure.

### 2. Discovery — ask in small batches via AskUserQuestion

Cover the **base seven** below, then the **sharpening five** in §2b. Lead each
with your best guess from the **seed** (§1 — the user's sentence or doc) so the user
corrects rather than writes essays. One or two questions per round, never the whole
list at once.

**Base seven** — the shape:

- **What is it?** One paragraph, the user's words. The thing itself.
- **Who uses it, and when?** Could be only the user. A person in a situation, not a
  market segment. What are they doing right before and right after they touch it.
- **How should it feel to use?** Fast? Calm? Playful? Invisible? Powerful? The
  experiential target — this drives a lot of later design decisions.
- **What's the hard or interesting part?** Your *hunch* at what'll be tricky — the
  technical knot you're least sure how to crack, the design problem, the thing you
  want to learn. A guess is fine; you'll only really know once you build. "Not sure
  yet" is a valid answer.
- **Constraints.** Stack/platform/language preferences, things that must be true,
  how much surface you want this to have, anything fixed.
- **Non-goals.** What it is explicitly *not*. The things you will not build. This
  is as important as the goals and prevents scope drift later.
- **Alternatives & prior art.** Other shapes you considered, existing things in the
  space, and why this shape over those. (Framed as design context — not "why won't
  competitors win", purely "what shape and why this one".)

**Every question has a push gate.** Each of these (and the sharpening six below)
has a "push until you hear" bar and named red flags in `references/questions.md` —
when an answer is vague, push once with the sharper frame from there, then once
more if needed, never a third time (forge suite's `references/voice.md`: banned
hedges, calibrated acknowledgment, respecting "just do it"). If two answers
contradict (e.g. "must be dead simple" + a large feature list), name the tension
and resolve it with them now.

### 2b. Sharpening pass — six forcing questions (charter-safe)

After the base seven, run these six. They're adapted from gstack's
office-hours forcing questions, **stripped of every business/market/demand
hook** — every one asks about the build, the experience, or the craft. Skip a
question if the answer is already in the base-seven answers.

**These are generative prompts, not an interrogation.** The push gates target
unexamined vagueness, never honest uncertainty: *"I don't know yet — I'll learn
that by building it"* is a completely valid answer to any of them. Offer it
explicitly, take it at face value, and move on.

- **The specific moment.** Name the concrete moment this thing serves. Not "a
  user" — *which* moment, the action right before, the action right after.
  Concrete enough that you could film it.
- **The friction it replaces.** What you currently do (or would do) without
  this — and the friction in it. Measure in *effort, attention, or annoyance*,
  never in money. If "nothing, this is new", say so — that's a valid answer.
- **The smallest version that's already useful.** What's the thinnest version
  of this thing that would *already* be worth using? This becomes the seed for
  phase 1; spend real thought here.
- **Watched anyone do it the current way?** Have you actually watched the thing
  this replaces being done — yourself included — and what *surprised* you?
  Surprise is the gate: the difference between knowing the workflow and having
  looked at it. "Haven't watched" is fine — it becomes a phase-1 note ("do it
  manually once before automating it"), not a blocker.
- **What you're most drawn to — or most unsure about.** Imagining the finished
  thing, which part are you most excited to use, and which part are you least sure
  about? (If something already surprised you imagining it, name that — but no need
  to manufacture a surprise.) Whichever pulls hardest often points at the real shape.
- **Three-year fit.** Three years from now, do you want this to be *more*
  essential, *less* essential, or the same? Bigger surface, sharper niche, or
  archived after the itch is scratched? All three are valid — the point is to
  *know* now so the plan doesn't drift.

Lead with your best read on each, like before. Two questions per round, not all
six at once.

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
charter-safe (it never reopens whether the project should exist or whether the user
should build it; "smaller on purpose" is a valid answer it must accept). Fold its
outcome into the brief. Skip only if the user explicitly says they don't want it.

### 4. Write `wiki/brief.md`

Replace the stub. Sections, in this order:

- **What it is** — the paragraph from question 1.
- **Who & when** — the specific moment from §2b plus the base who/when.
- **How it should feel** — the experiential target.
- **The hard/interesting part** — the hunch at what'll be tricky (or "not sure yet").
- **The friction it replaces** — what the user does without it today, in
  effort/attention, plus anything observed/surprising from the watched-it-done question.
- **Smallest useful version** — the seed for phase 1.
- **Three-year fit** — more essential / less essential / same, and why.
- **Constraints** — stack, platform, fixed shape.
- **Non-goals** — what it explicitly is *not*.
- **Shape chosen** — the picked shape with a one-line *why* over alternatives.
- **What you're drawn to / unsure about** — the pull or doubt from §2b, captured so
  later phases honor it instead of designing it away. Omit if the answer was "don't
  know yet".

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

## References

- `references/questions.md` — per-question push-until gates and red flags
- forge suite's `references/voice.md` — banned hedges, push-twice rule, "just do it" escape hatch
- forge suite's `references/question-style.md` — Decision Brief format for the shape lock
