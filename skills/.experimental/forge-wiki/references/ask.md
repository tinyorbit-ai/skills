# forge-wiki — ask reference

Answer a question using the project's wiki as the primary source. Read-only unless
`--file-back` is given (and that goes plan-first through INGEST).

## Step 1 — Parse

Extract the question. Flags:
- `--sources-only` — return relevant file paths with one-line descriptions, no synthesis.
- `--file-back` — after answering, offer to file the synthesis as a new knowledge
  article *if* it creates connections not in any single existing article. Filing is an
  INGEST — run the plan-first gate before writing.

## Step 2 — Read the top indexes

Read `wiki/index.md` (the map of content, both layers) and
`wiki/knowledge/INDEX.md` (the topic directory). From the question, identify:
- the 1–3 most relevant knowledge **topics**, and
- any relevant **project-record** files — `brief.md`, `plan.md`, specific ADRs in
  `decisions/`, `learnings.md`, `notes/`. The why often lives there, not just in
  `knowledge/`.

## Step 3 — Read topic indexes, then articles

Read the `_index.md` of each relevant topic; from the one-line summaries pick the
3–8 most relevant articles. Read those in full — they are your primary sources. Also
read any ADR or brief section the question clearly touches.

## Step 4 — Search for what the indexes missed

Grep across `wiki/` for keywords from the question to surface articles the indexes
didn't list. If you find strong matches in the repo *outside* the wiki (a doc that
was never ingested), note them as "uncompiled source — consider `forge-wiki` ingest
on `<path>`" rather than citing them as wiki knowledge.

## Step 5 — Synthesize

Compose a direct, comprehensive answer that:
- Answers the question first, plainly.
- **Cites every claim by wikilink** — `per [[knowledge/users/dropoff-at-step-3]]`,
  `[[decisions/0004-local-first]]`. The reader should be able to jump to the source.
- Keeps the specifics — numbers, names, constraints — from the articles.
- Names the **gaps**: where the wiki has no coverage, say so. A confident answer over
  thin evidence is worse than naming the hole.
- Ends with a "Sources consulted" list (articles + project-record files).

For `--sources-only`: skip synthesis; just list the relevant wiki paths grouped by
layer (knowledge articles, then project-record files), plus any uncompiled sources.

## Step 6 — Offer file-back (only if --file-back)

If the synthesis genuinely connects things no single article captures, propose filing
it as a new `knowledge/` article (typically a `synthesized`-quality article) — and
run the INGEST plan-first gate before writing. Otherwise, don't: not every answer
deserves to become an article.
