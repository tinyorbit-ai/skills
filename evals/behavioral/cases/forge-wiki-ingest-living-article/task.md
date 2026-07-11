This repo has a forge wiki with a knowledge base. Two emails from the client have
arrived and both must be captured.

Use the forge-wiki skill (read .claude/skills/forge-wiki/SKILL.md and follow it) to
run TWO explicit ingests, strictly one after the other:

1. First ingest `inbox/2026-07-02-dana-email.md`.
2. Only after the first is fully written, ingest `inbox/2026-07-09-dana-followup.md`.

This is a NON-INTERACTIVE run. The skill's INGEST mode is plan-first: still produce
the plan for each ingest (disposition, NEW vs MERGE, target, and for any Core
Concept change the exact diff) — print it, then proceed exactly as if the user
approved your recommendation. Do not wait or call AskUserQuestion.

Follow the article format and Timeline rules from the forge suite's
references/wiki.md precisely.
