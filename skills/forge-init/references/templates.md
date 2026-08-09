# forge-init templates

Copy these verbatim, substituting `{PROJECT}` (repo/project name). `{ONELINE}`
is intentionally left as `_filled by forge-discovery_` — discovery writes the
real one-liner once the brief is captured. Don't prompt the user for it here.
Today's date: get it from the environment.

---

## `wiki/index.md`

```markdown
# {PROJECT} — Engineering Wiki

Obsidian-style wiki. **Source of truth for the _why_.** Code says what; this says why.

## What this is (one line)

{ONELINE}

## Map of content

- [[brief]] — what we're building, for whom, the feel, non-goals
- [[plan]] — the phased build plan; each phase has a verifiable gate + branch
- [[architecture]] — components & boundaries, central bet, scale assumptions (reconciled by forge-ship each phase)
- [[build-log]] — one entry per phase: the gate met before merge
- [[learnings]] — review lessons + the rule-to-remember (running)
- [[retro]] — build retrospectives, synthesis across phases (running)
- [[improvements]] — what I'd do with more time / deliberate scope cuts (running)

### Decisions (ADRs)

_None yet — the first ADR lands with [[plan]]._

### Incident notes

_None yet — root-cause writeups land here as they happen._

## Knowledge base

Ingested context the build rests on — business rationale, research, email,
conversations. Living articles with Timelines; ingest with `forge-wiki`.

- [[knowledge/INDEX]] — topic directory for ingested context

## Reading order

1. [[brief]] — what and why
2. [[plan]] — how, in phases
3. [[architecture]] — the shape of it
```

---

## `wiki/brief.md`

```markdown
# Brief — {PROJECT}

Part of [[index]]. Status: **stub — fill with `forge-discovery`.**

<!-- forge-discovery writes: what it is · who it's for · how it should feel ·
     the hard/interesting part · constraints · non-goals · alternatives weighed -->
```

---

## `wiki/plan.md`

```markdown
# Plan — {PROJECT}

Part of [[index]]. Status: **stub — fill with `forge-plan`.**

**Base branch:** `{BASE}`
**Discipline:** each phase runs on `phase/<n>-<slug>`; squash-merges back as ONE
commit after its verifiable gate is green; one [[build-log]] entry per phase.

<!-- forge-plan writes the ordered phases. Each phase:
     ## Phase N — <title>
     **Branch:** `phase/<n>-<slug>`
     **Goal:** <the verifiable end state>
     **Verifiable gate:** <exact command/check that must pass before merge>
     **Work:** <bullets>
     **Decisions:** <links to ADRs created for this phase> -->
```

---

## `wiki/architecture.md`

```markdown
# Architecture — {PROJECT}

Part of [[index]]. Status: **stub — v1 written by `forge-plan`, reconciled by
`forge-ship` every phase.**

<!-- Required sections (short is the bar; a stub is not):
## Components & boundaries — each boundary with the one-line *why it's drawn
   there* (what change it isolates — the maintainability case)
## Data flow — the 30-second walk-through
## The central bet — and what evidence would revisit it
## Scale assumptions — what breaks at 10× / 100× the data or load, and which
   phase addresses it (or why none needs to)
## Parts list — every component/dependency/abstraction, one line each, with the
   brief clause it serves; a part with no reason gets cut
Link ADRs for the *why*. -->
```

---

## `wiki/build-log.md`

```markdown
# Build log

Part of [[index]]. One entry per phase: the verifiable gate that was met before
merge. Newest on top. Appended by `forge-ship`.
```

---

## `wiki/learnings.md`

```markdown
# Learnings

Part of [[index]]. Running log appended by `forge-review`. Newest on top. One entry
per review pass that found something worth remembering. Later builds/reviews read
and enforce these.

<!-- Entry shape (one line per lesson; confidence = how generalizable the rule is):
- **YYYY-MM-DD · phase N · confidence N/10** — found: <what> · fixed: <how> ·
  **rule:** <generalizable lesson, phrased so the next build avoids it>
Plus one structured review record line per review pass (what trend lines read):
> review · phase N · findings high/med/low A/B/C · passes 0–7 run · terminal block green -->
```

---

## `wiki/retro.md`

```markdown
# Retrospectives

Part of [[index]]. Running synthesis appended by `forge-retro`. Newest on top. One
entry per retro: what shipped, recurring patterns, what went well, what to improve.

<!-- Entry shape:
## YYYY-MM-DD — Retro (phases A–B)
- **Shipped:** <the build story, not a changelog>
- **Patterns:** <recurring issue classes, citing phases/learnings>
- **Kept:** <what went well, worth reinforcing>
- **Improve:** <concrete process changes>
- **Open:** <unresolved threads> -->
```

---

## `wiki/improvements.md`

```markdown
# What I'd do with more time

Part of [[index]]. Running, honest list. Deliberate scope cuts go here too —
"deferred X for Y" is a positive signal, not an apology.
```

---

## `wiki/decisions/.gitkeep` and `wiki/notes/.gitkeep`

Empty files, just to keep the directories in git.

---

## `wiki/.forge/config.yaml`

```yaml
# forge per-project configuration. See: forge/references/reviewer-agents.md
reviewer: auto    # auto | codex | gemini | claude | none
```

---

## `wiki/.forge/taste.md`

```markdown
# Taste profile

Append-only design-taste record — approved and rejected directions, read by
`forge-design-system` and `forge-design-explore` before generating anything.
Entry format per the forge suite's `references/wiki.md`.
```

---

## `wiki/knowledge/INDEX.md`

```markdown
# Knowledge Base — {PROJECT}

Part of [[index]]. Ingested context the build rests on — business rationale,
research, email, conversations. Living articles with Timelines (Compiled →
Reinforced → Refined → Contradicted). Ingest with `forge-wiki`; keep this index
current with `forge-wiki-maintain`.

## Topic Directory

| Topic | Articles | Index |
|-------|----------|-------|
| _none yet_ | 0 | — |

## Quick lookup

_Empty — topics and articles appear here as context is ingested._
```

---

## `wiki/knowledge/_compilation-log.md`

```markdown
# Compilation log

Append-only audit of what `forge-wiki` ingested. One row per source.

| Date | Source | Action | Article | Verb | Quality | Reason |
|------|--------|--------|---------|------|---------|--------|
```

Actions: `ingested-new` · `ingested-timeline` · `skipped`.
Verbs (for ingested rows): `Compiled` · `Reinforced` · `Refined` · `Contradicted`.

---

## ADR template (for reference; `forge-plan`/`forge-harden` use it)

`wiki/decisions/NNNN-slug.md`:

```markdown
# ADR NNNN — <Title>

**Status:** accepted (Phase N) · part of [[index]]

## Context

<the forces in play; what made this a real decision>

## Decision

<what was chosen, stated plainly>

## Why

<the reasoning — the most important section>

## Alternatives considered

<the roads not taken, and why not — required, never empty>

## Consequences

<what this commits us to; downstream constraints>
```

---

## Agent rules block (inject into CLAUDE.md AND AGENTS.md, between the markers)

```markdown
<!-- BEGIN:forge-wiki-rules -->

## Wiki — keep it current (the *why*, not just the *what*)

This repo has an Obsidian-style wiki at `wiki/`. It is the source of truth for the
*why*. Code says what; the wiki says why. Keeping it current is not optional.

- **Linking is Obsidian-style.** Cross-reference wiki files with `[[wikilinks]]`
  (e.g. `[[architecture]]`, `[[decisions/0007-slug]]`), not plain Markdown links.
  **Every wiki file must be reachable from `wiki/index.md`** — when you create one,
  add it to the relevant section of `index.md` in the same change.
- **Non-trivial decisions & trade-offs** → record an ADR in `wiki/decisions/`
  (Context · Decision · Why · Alternatives · Consequences). The *why* and the roads
  not taken matter more than the choice. Number ADRs sequentially, zero-padded
  (`0007-...`). Link every new ADR from `wiki/index.md` in the same change.
- **Incidents, failures, surprising root causes** → write `wiki/notes/YYYY-MM-DD-slug.md`
  (timeline · root cause · the decision it forced · what it demonstrates). How the
  system fails is stronger signal than the happy path.
- **Deliberate scope cuts** → record in `wiki/improvements.md` ("deferred X for Y").
- **Architecture changes** → `wiki/architecture.md` is reconciled by `forge-ship`
  every phase; if you change the system's shape outside a phase, update it in the
  same change.
- **Design system** → if `DESIGN.md` exists, all UI code uses its tokens (type,
  color, spacing scale, radius, motion). An off-system value — raw hex, px off
  the scale, a font outside the system — is a review finding, the same class as
  a type error.
- **External context that informs the build** (business rationale, research,
  email, a decision-driving conversation, competitive or user notes) → ingest it
  into the knowledge base at `wiki/knowledge/` as a living article with a Timeline.
  Use `forge-wiki` to do this (it's plan-first); `forge-wiki-maintain` keeps the
  indexes and links healthy. **More context is better than less** — capture it.
- When you make such a change, **say so in your reply** — note which wiki file you
  updated. Under-capturing the *why* is the failure mode to avoid; when in doubt,
  write it down.

### Ambient capture — file context as it surfaces in conversation

You don't wait to be asked. When the user drops **durable, build-relevant context**
mid-conversation, capture it into `wiki/knowledge/` in the **same turn**, then note
it in one line. This is what keeps the wiki a living record instead of a stale one.

- **Capture** (durable, affects the build): stakeholder directives ("my PM said do X
  over Y"), constraints, deadlines, decision drivers, business rationale, user/research
  findings, hard preferences ("we must support offline"). Anything a future session
  would need to understand *why* the build is shaped as it is.
- **Skip** (transient): questions, thinking-aloud, chit-chat, instructions about the
  current task, anything not durable. When unsure, lean toward capturing — but a
  one-off aside is not an article.
- **Additive writes happen immediately, no approval** — a new `knowledge/` article, or
  a Timeline append (`Compiled` / `Reinforced`) to an existing one. Then say, briefly:
  `📓 noted: <one line> → [[knowledge/<topic>/<slug>]]`.
- **Only pause to confirm** when a capture would **rewrite or contradict** an existing
  article's Core Concept (a `Refined`/`Contradicted` change) — show the diff first.
- Use `forge-wiki`'s article format + Timeline and keep every new file reachable from
  the index. Run `forge-wiki-maintain` now and then to regenerate indexes and check
  links. Explicit `forge-wiki` ingests (a pasted doc, a file) stay **plan-first**.
- **Control:** if the user says "pause/mute wiki capture", stop ambient capture for the
  rest of the session (explicit `forge-wiki` still works); "resume capture" re-enables it.

## Phase & branch discipline

- Work happens in ordered phases defined in `wiki/plan.md`.
- Each phase runs on its own branch `phase/<n>-<slug>` off the base branch.
- Commit as many times as needed *on the phase branch*. Never commit directly on
  the base branch.
- A finished phase merges back as **exactly one squashed commit**, and only after
  its declared **verifiable gate** is green.
- Every merged phase gets one `wiki/build-log.md` entry: what was done, the *why*
  of notable decisions, and the exact gate that was met.

<!-- END:forge-wiki-rules -->
```
