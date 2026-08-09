---
name: forge-wiki
description: Ask anything against the project's wiki, and capture any context into its knowledge base — email, business context, research, conversations, pasted notes, files, or durable facts the user mentions in passing. Answers from indexes then articles with citations; files context through a quality filter into flat Timeline-based living articles under wiki/knowledge/. Explicit ingest is plan-first (proposes writes/merges before mutating); ambient capture of conversational context auto-files additive notes and confirms only on rewrites. Use when asked to "ask the wiki", "what do we know about X", "ingest this", "add this context", "remember this", "compile this into the wiki", or any time context should live alongside the repo.
---

# forge-wiki

The wiki's read/write brain. Two jobs: **answer questions** from the wiki, and
**ingest context** into it. The wiki layout, article format, and Timeline rules live
in the forge orchestrator's `references/wiki.md` — read it before writing anything.

## Charter

Context is welcome — **more is better than less**. Ingest freely and let it sharpen
*what* and *how* the project gets built (`forge-principles`'s
`references/charter.md`).

## Routing

Read the request and pick the mode. If `wiki/` doesn't exist, run `forge-init` first.

- A **question** ("what do we know about…", "why did we…", "ask the wiki…") → **ASK**.
- **Material to capture** (a pasted block, a file path, "ingest this", "remember
  this", "add this context") → **INGEST** (plan-first).
- **Durable context that surfaced in conversation** (the user mentioned a constraint,
  a stakeholder directive, a deadline) → **AMBIENT CAPTURE** (lighter; see below).
- Ambiguous → ask the user which they meant before acting.

---

## ASK

Answer using the wiki as the primary source. Full procedure in
`references/ask.md`. In short:

1. Read `wiki/index.md`, then `wiki/knowledge/INDEX.md`. Identify the 1–3 relevant
   topics and any relevant project-record files (brief, ADRs, learnings).
2. Read those topic `_index.md` files; select the 3–8 most relevant articles. Read
   them in full. Grep `wiki/` for keywords the indexes might have missed.
3. Synthesize a direct answer. **Cite every source by wikilink** (e.g. "per
   `[[knowledge/business-context/q3-launch-driver]]`"). Name gaps the wiki doesn't
   cover. List sources consulted at the end.
4. Flags: `--sources-only` returns relevant paths without synthesizing;
   `--file-back` offers to file the synthesis as a new article (this is an INGEST —
   go plan-first per below) only when it genuinely creates new connections.

ASK is read-only by default. It never writes unless `--file-back` is given and you
have run the plan-first gate.

---

## INGEST (plan-first — always)

Capture a source into `wiki/knowledge/` as a living article. **Never mutate the wiki
before showing the plan and getting approval.** Full quality filter, matching, and
merge rules in `references/ingest.md`. The shape:

### 1. Read the source

Take it from the pasted text, the file path, or the named conversation. Read it in
full. If it's a file outside the wiki, keep the original path for the `sources:` line.

### 2. Quality filter (decide the disposition)

- **Article-worthy** — structured, ≥ a few concrete points → becomes/updates an
  article.
- **Timeline-only** — a single thread, note, or quote that reinforces existing
  knowledge but can't anchor its own article → must merge into an existing article;
  if none fits, downgrade to *skip* and say so.
- **Skip** — stub, pure link dump, no real content → log the reason, write nothing.

### 3. Match: NEW vs MERGE

Grep the candidate topic and read topic `_index.md` summaries. Either it's **NEW**
(no existing article covers this) or **MERGE** (one does — append to its Timeline,
don't overwrite). Pick the target topic by *content fit* (anti-sprawl: grep
`knowledge/INDEX.md` for a near-synonym first; create a new top-level topic only if
nothing fits; never a subfolder).

### 4. Propose the plan — and stop

Show the user, before touching disk:

- **Disposition** — article-worthy / timeline-only / skip.
- **NEW** → target `wiki/knowledge/<topic>/<slug>.md`, the proposed Summary line, and
  the Core Concept in brief. Note if it would create a new topic.
- **MERGE** → which article, the classification (Reinforced / Refined / Contradicted),
  and — if Refined/Contradicted — the exact Core Concept diff.
- Any **Contradicted** rewrite is high-stakes: call it out explicitly.

Then ask for approval (AskUserQuestion). Only on yes do you write.

### 5. Write

On approval, write per `references/ingest.md` and the article format in
`references/wiki.md`:

- **NEW** — full article with frontmatter (`title`, `compiled`, `last_evidence`,
  `sources`, `quality`, `tags`), Summary, Core Concept, Key Points, Related,
  Timeline (one `Compiled` entry).
- **MERGE** — append the Timeline entry with the right verb; update Core Concept only
  for Refined/Contradicted that clear the quality bar; append the source path to
  `sources:`; bump `last_evidence` (leave `compiled`).
- Append a row to `wiki/knowledge/_compilation-log.md`.
- Add the article to its topic `_index.md` and ensure it's reachable from
  `wiki/index.md` → `[[knowledge/INDEX]]` (or run `forge-wiki-maintain` to
  regenerate). Use `[[wikilinks]]`.

### 6. Report

Tell the user what landed: article path, NEW or MERGE (+verb), topic, whether a new
topic was created, and the one-line Summary. This is the capture rule — say it in the
same turn.

---

## AMBIENT CAPTURE (lighter — additive is auto)

This is the path the project's `forge-wiki-rules` use when durable context surfaces in
conversation (the agent files it *without* being explicitly invoked). It trades the
full plan-first gate for low friction, but **only for additive writes**:

- **Qualifies:** durable, build-relevant context — stakeholder directives ("my PM said
  do X over Y"), constraints, deadlines, decision drivers, business rationale,
  user/research findings, hard preferences. Skip transient chatter and task
  instructions.
- **Additive → write immediately, no approval.** A NEW article, or a `Compiled` /
  `Reinforced` Timeline append to an existing one. Then note it in one line:
  `📓 noted: <one line> → [[knowledge/<topic>/<slug>]]`.
- **Rewrites still confirm.** If the new context would `Refine`/`Contradict` an
  existing Core Concept, stop and show the diff first — same as INGEST.
- Same format, taxonomy, logging, and indexing as INGEST (Steps 5–6 / `references/
  ingest.md`). Suggest `forge-wiki-maintain` after a run of captures.
- Honor "pause/mute wiki capture" — go silent until "resume capture".

## Rules

- **Explicit INGEST is plan-first** — propose, then write on approval. **Ambient
  capture auto-files additive writes** and confirms only rewrites. Neither ever
  silently rewrites a Core Concept.
- Never overwrite an article — the Timeline is append-only; Core Concept changes are
  deliberate, quality-gated, and (for Contradicted) user-confirmed with a diff.
- Obsidian `[[wikilinks]]` only; every new file reachable from an index in the same
  change.
- After a batch of ingests/captures, suggest `forge-wiki-maintain` to regenerate
  indexes and health-check links.
