# Scoring — the rate → fix-to-10 → re-rate loop

The convergence mechanism every harden persona and runtime QA skill uses. A review
that only lists findings can't show it improved anything; a review that scores,
fixes, and re-scores can. **Scores measure craft.** A 3/10 means "this plan
under-specifies the thing".

## The loop

For each dimension the skill owns (its SKILL.md names them):

1. **Rate 0–10, with the gap named.** One line of evidence per score: *"States:
   4/10 — plan commits to loading and error, says nothing about empty, success,
   partial."* A number without the named gap is noise — never emit one.
2. **Say what a 10 looks like — for THIS plan/build.** Not the generic ideal: the
   specific artifact this project is missing. *"A 10 here is a state table covering
   all four screens in phase 2–4, each cell one line."*
3. **Fix the objective part now.** Edit the plan / code in place per the skill's fix
   policy. Taste components of the gap go to the taste batch, scored as-is.
4. **Re-rate.** Honest second score after fixes. If the residual gap is taste, say
   so: *"8/10 — remaining 2 points are the hierarchy choice surfaced below."*

## Rules

- **10 is rare and earned.** Most healthy dimensions land 7–9 after fixes. Don't
  inflate to declare victory; the residual gap names the next run's work.
- **Score the artifact, not the effort.** "We tried hard" is not a point.
- **Deltas go in the report — with their edit hunks.** Every report block carries
  `before → after` per dimension, and **every non-zero delta cites the plan/code
  edit that earned it** — a delta with no diff behind it is decoration, not proof.
  An honest **"already sound — no change"** is a first-class outcome; never
  manufacture movement to look finished.
- **Deltas get graded.** The independent reviewer receives the before → after
  diff plus the claimed deltas and upholds or rejects each one
  (`references/reviewer-agents.md`). A rejected delta goes to the taste batch —
  self-scoring alone is never the last word.

## Confidence on findings

Where a skill runs in a noise-gated mode, every finding carries a confidence
score `N/10` — how sure you are it's real, not how severe it is (severity is
tagged separately):

- **High-confidence gate (e.g. security DAILY):** report only findings at
  confidence ≥ 8/10. Zero noise; skip speculation entirely.
- **Broad gate (e.g. security DEEP):** report anything ≥ 2/10, but tag everything
  below 8/10 as `TENTATIVE` so the user can triage cheaply.

## Trend — scores compound across runs

Report blocks live in the wiki: harden's `## Review` section in `wiki/plan.md`,
and `forge-review`'s one-line structured review record prepended to
`wiki/learnings.md` each phase (`> review · phase N · findings high/med/low …`) —
that record is what makes review-over-review trends readable; without it a trend
line has no source. Before scoring, read the previous run's block/record if one
exists and report the trend line: *"Security findings: 5 last harden → 2 now."*
`forge-retro` reads these trends across the whole arc. A skill that can show its
finding counts falling phase over phase is demonstrating the loop works; rising
counts are a process finding for retro.
