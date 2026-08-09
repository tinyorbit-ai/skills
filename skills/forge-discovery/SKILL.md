---
name: forge-discovery
description: Discovery conversation that turns a raw idea into a precise brief — base seven questions (what / who & when / how it should feel / hard part / constraints / non-goals / alternatives) plus a sharpening six (the specific moment, the friction it replaces, smallest useful version, watched-it-done observation, drawn-to/unsure, three-year fit), each with a push-until gate so vague answers get one sharp follow-up. Deliberately asks nothing about money, market, demand, or whether it's "worth it". Works from either a one-sentence idea or an existing one-pager/research doc — anchors on what you give it and never guesses the project from folder names. Use when you have an idea and need it pinned down, when asked to "shape this", "what are we building", or as stage 1 of forge before forge-plan.
---

# forge-discovery

Pins a fuzzy idea into a precise brief. Output: `wiki/brief.md` — the outcome
pinned so the rest of forge can build it as high-quality, simple, performant software.

## Charter

**Ask nothing about money, market, demand, or whether it's "worth it."** Understand
the build the user wants and don't qualify it — if only they will ever use it,
that's a complete answer.

## Process

If `wiki/` doesn't exist, run `forge-init` first.

### 1. Find the seed — anchor on what the user gave you

forge-discovery works from **the user's stated intent**, in one of three entry
modes. Detect which you're in *before* doing anything else:

- **One-liner seed** — the user gave a sentence ("a CLI that dedupes my photos") or
  a short description. Treat it as the spine and budget the questions (§1c).
- **Document seed** — the user points at (or there obviously is) a one-pager,
  research note, or draft brief. **Ingest it first** (§1a).
- **No seed** — nothing was provided. **Ask for one first** (§1b). Do not proceed on
  inference.

**Never infer the project from folder names, the file tree, or repo structure —
those are not a brief.** A silent scan of `CLAUDE.md`/`AGENTS.md`/`git log` may
inform **stack and conventions** only; caught guessing the idea from directory
names → stop and ask the user instead (§1b).

#### 1a. Document seed — ingest, then ask only the gaps

Read the doc in full. Map what it already answers onto the **base seven** (§2) and
the **sharpening six** (§2b). Then:

1. Reflect back, compactly: what the doc answers (the filled sections) and what
   it doesn't pin down yet (the gaps).
2. Ask **only the gaps**, in small batches (§2 rules) — never re-ask what the doc
   already answers. Then proceed to §3.

#### 1b. No seed — ask for one before anything

If there's no sentence and no doc, ask plainly: *"Give me one sentence on what this
is — or point me at a one-pager / research note and I'll start from that."* Wait for
it. Do not scan-and-guess a hypothesis from the repo's structure.

#### 1c. One-liner seed — budget the interrogation

A sentence answers more than it looks like. Before asking anything, fill every
question you can **from the sentence itself**, marked as inferences, and open with
one reflect-back round: "here's what I read into it — correct me." Then ask **only
what stayed blank — budget ~6 questions**, using the folds in §2. **Stop when
What, the specific moment, the feel, and the smallest useful version are sharp** —
a sharp brief beats a complete questionnaire; the rest land in the brief as open
questions. Three-year fit is optional color, never a required turn.

### 2. Discovery — ask in small batches via AskUserQuestion

Cover the **base seven** below, then the **sharpening six** in §2b — under your
entry mode's governor (§1a asks only the doc's gaps; §1c budgets a one-liner to
~6). Lead each with your best guess from the **seed** so the user corrects rather
than writes essays. One or two questions per round, never the whole list at once.
**The folds:** "who & when" and §2b's "specific moment" are one question — ask it
once, in the filmable-moment form; likewise "hard part" folds into §2b's
"drawn-to/unsure". Never ask both halves of a fold.

**Base seven** — the shape:

- **What is it?** One paragraph, the user's words. The thing itself.
- **Who uses it, and when?** Could be only the user. A person in a situation, not
  a market segment — asked in its sharp form, §2b's *specific moment* (one fold).
- **How should it feel to use?** Fast? Calm? Playful? Invisible? Powerful? The
  experiential target — this drives a lot of later design decisions.
- **What's the hard or interesting part?** Your *hunch* at the knot — technical,
  design, or the thing you want to learn. A guess is fine; "not sure yet" is a
  valid answer. (Folds with §2b's drawn-to/unsure — ask once.)
- **Constraints.** Stack/platform/language preferences, things that must be true,
  how much surface you want this to have, anything fixed.
- **Non-goals.** What it is explicitly *not*. The things you will not build. This
  is as important as the goals and prevents scope drift later.
- **Alternatives & prior art.** Other shapes you considered, existing things in the
  space, and why this shape over those. (Framed as design context — not "why won't
  competitors win", purely "what shape and why this one".)

**Every question has a push gate.** Each (base seven and sharpening six) has a
"push until you hear" bar and named red flags in `references/questions.md` — when
an answer is vague, push once with the sharper frame, then once more if needed,
never a third time (`forge-principles`'s `references/voice.md`). If two answers
contradict ("dead simple" + a large feature list), name the tension and resolve
it with them now.

### 2b. Sharpening pass — six forcing questions

After the base seven, run these six. Skip any question already answered (the §2
folds apply here).

**Generative prompts, not an interrogation.** Push gates target unexamined
vagueness, never honest uncertainty — *"I don't know yet, I'll learn by building
it"* clears any gate. Offer it explicitly, take it at face value, move on.

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
  Surprise is the gate. "Haven't watched" is fine — mark real use as unknown and
  require a scheduled human-evidence gate after the smallest useful workflow
  exists and before billing, scale, or polish. It is not a discovery blocker.
- **What you're most drawn to — or most unsure about.** Imagining the finished
  thing, which part are you most excited to use, and which least sure about?
  Whichever pulls hardest often points at the real shape.
- **Three-year fit** *(optional color — never a required turn)*. More essential,
  less, or the same in three years? All answers are valid — the point is to
  *know* now so the plan doesn't drift.

Lead with your best read, two questions per round, like before.

### 3. Reflect back — offer shapes

Synthesize what you heard into 2–3 candidate **shapes** — different ways to build
the *same intent* ("a CLI", "a local web app", "a library + thin demo"). For each:
what it optimizes for, what it costs, what the first runnable version looks like.
Build approaches only.

Lock the chosen shape with AskUserQuestion in the **Decision Brief** shape
(forge suite's `references/question-style.md`): concrete framing, named stakes,
recommendation with the *why* and the evidence that would flip it.

### 3b. Ambition check (auto)

Before writing the brief, invoke **`forge-ambition`** on the draft — it
pressure-tests whether this is the most ambitious version of *the thing the user
already chose* ("smaller on purpose" is a valid answer it must accept). Fold its
outcome into the brief. Skip only if the user declines.

### 4. Write `wiki/brief.md`

Read and apply `references/brief-contract.md` in full. It defines the exact
section order, the unknown-real-use marker, ADR handling, and source filing.

### 5. Hand off

- Update `wiki/index.md`: replace the `{ONELINE}` placeholder with a real
  one-sentence summary from the brief; mark [[brief]] as filled.
- Recommend `forge-plan` next (or return to `forge` for the full pipeline).

## Rules

- No code. No file scaffolding beyond the brief + any ADR.
- Flag an incoherent or impossible requirement when you hit one — resolving it
  with the user is part of pinning the brief down.
- The brief must make the *non-goals* and *the feel* explicit — those two are the
  most common things later stages need and the most common things left implicit.

## References

- `references/questions.md` — per-question push-until gates and red flags
- `references/brief-contract.md` — required brief shape and human-evidence marker
- `forge-principles`'s `references/voice.md` — banned hedges, push-twice rule, "just do it" escape hatch
- forge suite's `references/question-style.md` — Decision Brief format for the shape lock
