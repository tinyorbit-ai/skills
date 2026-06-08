# The wiki — single source of truth for the *why*

forge keeps an Obsidian-style wiki at `wiki/` (created by `forge-init`). Code says
*what*; the wiki says *why*. It is a real, living knowledge base — not just a
decision log — and every forge skill reads from and writes to it.

The wiki has **two layers**, reachable from one top-level `index.md`:

1. **Project record** — the build's spine: what we're building and every decision
   behind it. Written by the pipeline skills (discovery, plan, harden, ship, review,
   debug, retro).
2. **Knowledge base** — `wiki/knowledge/` — *ingested context* the build rests on:
   business rationale, stakeholder email, domain research, user findings,
   conversations, competitive notes. Anything you can paste or point at. Written by
   `forge-wiki`; maintained by `forge-wiki-maintain`. This is the Karpathy-style
   second brain that lives alongside the repo.

Per the charter, **context is welcome — more is better than less.** Ingest freely;
the only thing the wiki must never do is turn ingested context into a verdict on
whether the project should exist or whether the user should build it.

## Layout

```
wiki/
├── index.md            Map of content. Problem in one line. Reading order. [[wikilinks]] to BOTH layers.
│
│   ── Project record ──
├── brief.md            What we're building, for whom, the feel, non-goals. (forge-discovery)
├── plan.md             Ordered phases, each with its verifiable gate + branch name. (forge-plan/forge-harden)
├── architecture.md     The 30-second architecture. Stubbed by forge-plan, filled as phases land.
├── build-log.md        One entry per landed phase: the gate that was met. (forge-ship)
├── decisions/          ADRs: NNNN-slug.md, zero-padded, sequential. (forge-plan, forge-harden)
├── notes/              Incidents & failures: YYYY-MM-DD-slug.md. (forge-debug)
├── learnings.md        Running log of review findings + the rule-to-remember. (forge-review)
├── retro.md            Running build retrospectives — synthesis across phases. (forge-retro)
├── improvements.md     Running, honest "what I'd do with more time" + deliberate scope cuts.
│
│   ── Knowledge base ──
└── knowledge/
    ├── INDEX.md            Topic directory + top articles per topic. (forge-wiki-maintain)
    ├── _compilation-log.md What was ingested / merged / skipped, per source. (forge-wiki)
    └── <topic>/            Flat, content-named topics (e.g. business-context/, domain/, users/).
        ├── _index.md       Every article in the topic + a one-line summary. (forge-wiki-maintain)
        └── <article>.md    A living article (see "Knowledge articles" below).
```

## Linking — Obsidian-style, both layers

Use Obsidian wikilinks everywhere: `[[decisions/0003-hybrid-retrieval]]`,
`[[architecture]]`, `[[knowledge/business-context/q3-launch-driver]]`. Never plain
Markdown links between wiki files. **Everything must be reachable from `index.md`**:
the project-record files directly, and the knowledge base via a "Knowledge base"
section in `index.md` that links to `[[knowledge/INDEX]]`. When you create any wiki
file, add it to the relevant index in the same edit. Article basenames are unique
within a topic; `forge-wiki-maintain` keeps every index honest.

## ADRs (`wiki/decisions/NNNN-slug.md`)

One ADR per non-trivial decision or trade-off. Numbering is sequential and
zero-padded to 4 digits. Required sections:

- **Status** — `proposed` | `accepted (Phase N)` | `superseded by [[...]]` · `part of [[index]]`
- **Context** — the forces in play, what made this a real decision
- **Decision** — what was chosen, stated plainly
- **Why** — the reasoning. This is the most important section.
- **Alternatives considered** — the roads not taken, and why not. Required.
- **Consequences** — what this commits you to; follow-on constraints
- (optional) **Validated in practice (Phase N)** — added later if reality tested it

The *why* and the *alternatives* matter more than the choice. An ADR with an empty
"Alternatives considered" is incomplete.

## Notes (`wiki/notes/YYYY-MM-DD-slug.md`)

One per incident, failure sequence, or surprising root cause. Timeline · root cause ·
the decision it forced · what it demonstrates. How a system fails is stronger signal
than its happy path — capture it.

## Learnings (`wiki/learnings.md`)

A running, append-only list written by `forge-review`. One entry per review pass
that found something worth remembering: what was found, how it was fixed, and the
**rule-to-remember** (the generalizable lesson). Dated, references the phase. This is
the project's accumulated taste — later reviews read it first and enforce its rules.

## Knowledge articles (`wiki/knowledge/<topic>/<slug>.md`)

The knowledge base is built from **living articles** — they accrete evidence over
time rather than being overwritten. Each one captures a piece of context and *how it
evolved*. Format:

```markdown
---
title: "Q3 launch is the real deadline driver"
compiled: 2026-06-08          # when the Core Concept was first written
last_evidence: 2026-06-08     # bumped each time new evidence arrives
sources:
  - "email/2026-06-01-client-thread.md"   # or a path, URL, or "conversation"
quality: verified | synthesized
tags: [business-context, timeline]
---

# Q3 launch is the real deadline driver

> **Summary:** One sentence with the concrete insight — pulled into the topic index.

## Core Concept
2–3 paragraphs. The essential point, in clean prose (not raw notes).

## Key Points
Specifics — numbers, names, constraints the build must honor.

## Related
[[wikilinks]] to related articles or ADRs this context informs.

## Timeline
- 2026-06-08 — **Compiled** from `email/2026-06-01-client-thread.md`. Initial framing.
```

**The Timeline is the engine.** New evidence never overwrites; it appends a dated
entry with one of four verbs:

- **Compiled** — initial creation.
- **Reinforced** — same conclusion, new angle/example. Core Concept untouched.
- **Refined** — adds nuance, caveat, or scope condition. Core Concept updated.
- **Contradicted** — disagrees with the prior framing. Core Concept rewritten — and
  only after confirming with the user, showing the diff.

This is what makes the wiki capture *not just what we decided but why, as it changed*.

### Taxonomy (flat, content-driven, anti-sprawl)

- **Flat, one level.** Topics are folders directly under `wiki/knowledge/`; articles
  live directly in a topic. Never nest a subfolder. "Splitting" means creating a
  *sibling* topic.
- **Appropriate domain, not forced reuse.** Place each article where its *content*
  fits. If no topic fits, create a new top-level topic. Don't jam it into a poor fit.
- **Anti-sprawl.** Before creating a topic, grep `knowledge/INDEX.md` for a
  near-synonym and reuse the canonical name. A lone article doesn't earn a topic;
  route it to nearest-fit until a cluster of ~3+ forms.
- **Split only on a clean seam.** Size alone never forces a split. Split only when a
  topic exceeds ~150 articles *and* holds ≥2 self-contained sub-domains.
  `forge-wiki-maintain` flags candidates as advisory; keeping a big coherent topic is
  a valid answer.

## The capture rule

Whenever a non-trivial decision, trade-off, scope cut, incident, review learning, or
**a piece of context that informs the build** arises: **write it to the wiki and tell
the user you did, in the same turn.** Decisions → `decisions/`. Incidents → `notes/`.
Review lessons → `learnings.md`. Scope cuts → `improvements.md`. External context
(email, research, business rationale, conversation) → `forge-wiki` ingests it into
`knowledge/`. Under-capturing the *why* is the failure mode forge exists to prevent.
When in doubt, write it down.

## The wiki skills

- **`forge-wiki`** — ask anything against the wiki, and ingest any source into
  `knowledge/`. Plan-first: it proposes what it will write or merge (new vs Timeline
  append, target topic, Core Concept changes) and waits for approval before mutating.
- **`forge-wiki-maintain`** — regenerate `index.md` / `knowledge/INDEX.md` / topic
  `_index.md` files, and run health checks (orphans, broken wikilinks, missing
  summaries, stale evidence, duplicates, flat-invariant violations).
