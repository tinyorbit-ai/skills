# The wiki — single source of truth for the *why*

forge keeps an Obsidian-style wiki at `wiki/` (created by `forge-init`). Code says
*what*; the wiki says *why*. Every forge skill reads from and writes to it.

## Layout

```
wiki/
├── index.md            Map of content. Problem in one line. Reading order. [[wikilinks]] to everything.
├── brief.md            What we're building, for whom, the feel, non-goals. (forge-discovery)
├── plan.md             Ordered phases, each with its verifiable gate + branch name. (forge-plan/forge-harden)
├── architecture.md     The 30-second architecture. Stubbed by forge-plan, filled as phases land.
├── build-log.md        One entry per landed phase: the gate that was met. (forge-ship)
├── decisions/          ADRs: NNNN-slug.md, zero-padded, sequential. (forge-plan, forge-harden)
├── notes/              Incidents & failures: YYYY-MM-DD-slug.md. (forge-debug)
├── learnings.md        Running log of review findings + the rule-to-remember. (forge-review)
├── retro.md            Running build retrospectives — synthesis across phases. (forge-retro)
└── improvements.md     Running, honest "what I'd do with more time" + deliberate scope cuts.
```

## Linking

Use Obsidian wikilinks: `[[decisions/0003-hybrid-retrieval]]`, `[[architecture]]`,
`[[notes/2026-05-18-...]]`. **Everything must be reachable from `index.md`.** When you
create any wiki file, add it to the relevant section of `index.md` in the same edit.

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
**rule-to-remember** (the generalizable lesson, phrased so a future build avoids it).
Entries are dated and reference the phase. This is the project's accumulated taste —
later reviews read it first and enforce its rules. Linked from `index.md`.

## The capture rule

Whenever a non-trivial decision, trade-off, scope cut, incident, or review learning
arises: **write it to the wiki and tell the user you did, in the same turn.**
Decisions → `decisions/`. Incidents/root-causes → `notes/`. Review lessons →
`learnings.md`. Scope cuts → `improvements.md`. Under-capturing the *why* is the
failure mode forge exists to prevent. When in doubt, write it down.
