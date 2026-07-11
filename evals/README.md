# Evals — three tiers, each costs more and tells you more

Skills are prompts, so "does it work" means different things at different layers.
There is deliberately **no CI**: the evals are part of the skill-editing loop in
this repo, run by whoever (human or agent) is making the change.

**Scope: the forge suite only, for now** — `forge` + `forge-*`. Lizard and any
future non-forge skills are excluded until deliberately added; `validate.mjs` and
`trigger/run.mjs` both accept `--all` (or `EVALS_SCOPE=all`) to widen, and the
lizard trigger cases return with that widening.

| Tier | What it proves | Cost | When |
|---|---|---|---|
| **0 static** | frontmatter parses, discovery works, references resolve, index in sync | free, seconds | every change, before pushing |
| **1 trigger** | user utterances route to the right skill from `description` alone | ~45 haiku calls, pennies | when any `description` changes |
| **2 behavioral** | the skill, run end-to-end headless, produces its contracted artifacts | real tokens, minutes/case | when a skill's body changes |

## The edit loop (how these are actually used)

When changing a skill:

1. **Baseline** — run the relevant tiers on the *current* state and record the
   scores (tier 0 always; tier 1 for description changes; the touched skill's
   tier-2 case, `--runs 3` for anything you'll compare — single runs are
   stochastic).
2. **Implement** the change.
3. **Re-run** the same tiers and compare. Equal-or-better than baseline is the
   bar; any drop is a regression to fix before pushing.
4. **Update the evals in the same change** — trigger cases for description edits,
   behavioral checks/cases for contract edits, and every real-world miss becomes
   a permanent case. The suite only stays honest if it evolves in lockstep with
   the skills.

## Tier 0 — static validation

```bash
node evals/static/validate.mjs                     # discovery check skipped if npx fails
EVALS_REQUIRE_CLI=1 node evals/static/validate.mjs # strict — discovery check mandatory
```

Catches the class of failure that has actually shipped: the unquoted `": "` in a
`description:` that made forge-debug silently vanish from `npx skills` discovery.
Also: name/folder mismatches, the 200-line body ceiling, missing `references/`
files (including cross-skill `forge/references/...`), CLAUDE.md index drift, and
the `npx skills add . --list` discovery oracle.

## Tier 1 — trigger routing

```bash
node evals/trigger/run.mjs              # all cases
node evals/trigger/run.mjs --dry-run    # print the assembled prompt, no calls
node evals/trigger/run.mjs --only lizard
```

Reads every live in-scope `description` from `skills/*/SKILL.md`, shows a model
ONLY that catalog plus one utterance, and asserts it names the expected skill (or
`none`). Defaults to Haiku deliberately — a weak router is a stricter test of
description quality. Cases live in `trigger/cases.json`; `expect` is a list, so
genuinely ambiguous routings (e.g. "build the next phase" → forge-build or forge)
accept either. Near-miss sibling pairs (harden-design vs polish, harden-scope vs
ambition, plan-time vs runtime personas) are the highest-value cases. Threshold:
90% (`EVAL_TRIGGER_THRESHOLD`).

**Add a case** whenever a description edit ships or a routing miss happens in real
use — the miss becomes a case, like a regression test.

## Tier 2 — behavioral

```bash
node evals/behavioral/run.mjs _smoke                          # plumbing self-test, cheap
node evals/behavioral/run.mjs forge-plan-structural --runs 3
node evals/behavioral/run.mjs forge-review-planted-bugs --runs 3
node evals/behavioral/run.mjs --all --keep                    # keep workdirs for inspection
```

Each case copies a fixture repo into a temp dir, git-inits it (optionally with a
phase branch via the `fixture/base/` + `fixture/phase/` overlay convention),
symlinks the skills under test into `.claude/skills/`, runs headless
`claude -p "$(task.md)" --dangerously-skip-permissions` inside it, then grades:

- **`check.mjs`** — deterministic assertions on the artifacts (files, formats,
  actual command output). Checks with `required: false` are informational.
- **`rubric.md`** (optional) — an LLM judge grades `config.judgeFiles` against the
  rubric and returns `{score, pass, reasons}`.

Transcripts and verdicts land in `evals/results/<stamp>-<case>/` (gitignored).
Runs are stochastic — a single pass is a smoke signal, `--runs 3` is evidence.

### Cases

- **`forge-plan-structural`** — filled brief in, plan out. Deterministic: phase
  blocks carry Branch/Goal/Verifiable gate/Design markers, gates aren't bare
  hygiene, ADRs have non-empty Alternatives, architecture.md replaced. Judge:
  gates prove goals, phase 1 is a vertical slice, brief constraints shape phases.
- **`forge-review-planted-bugs`** — a phase branch with three seeded defects
  (command injection, committed `sk-live` secret, header-inclusive mean that
  breaks the phase gate). Grades recall (≥2/3 detected), the mandated auto-fixes
  (secret gone, gate output correct, tests green), and the review record +
  learnings bookkeeping.
- **`forge-wiki-ingest-living-article`** — two client emails about the same
  evolving fact (offsite Sept 12 → moved to Sept 26) ingested in sequence. The
  second MUST merge as an append-only Timeline entry (Refined/Contradicted) on
  the article the first created — no duplicate article, no overwrite. Also
  grades the full article format, both indexes, the compilation log, flat
  taxonomy, and that the pre-existing article is untouched.
- **`forge-wiki-maintain-planted-rot`** — a wiki with six seeded defects: orphan
  article, stale index entry, missing Summary, missing Timeline, broken
  wikilink, nested-subfolder flat violation. Grades recall (≥5/6 in the health
  report), the `--fix` boundary both ways — safe fixes actually applied
  (indexes regenerated, Summary + retroactive Timeline added) AND structural
  items reported-but-untouched (nested file not moved, broken link not silently
  deleted) — plus no collateral damage to healthy articles.

### Add a case

```
evals/behavioral/cases/<name>/
├── task.md        headless prompt — say "NON-INTERACTIVE: don't AskUserQuestion,
│                  take your recommendation" for interactive skills
├── config.json    { "skills": [...include "forge" for cross-skill refs...],
│                    "branch": "...", "judgeFiles": [...], "timeoutMinutes": N }
├── fixture/       flat, or base/ + phase/ overlays for phase-branch cases
├── check.mjs      export default async ({ workdir, transcript, exec }) => checks[]
└── rubric.md      optional LLM-judge criteria
```

Hermeticity rules: zero-dependency fixtures (no `npm install`), `reviewer: none`
in `wiki/.forge/config.yaml` so forge-review doesn't shell out to codex/gemini,
no network.

## Recorded baselines

- **2026-07-11** · tier 1 (forge-only scope, 41 cases): 40/41 (98%) on Haiku —
  the miss was a deliberately soft utterance since reworded ("what are we
  building again?" → "help me pin down exactly what we're building", verified
  routing to forge-discovery).
- **2026-07-11** · tier 2 `forge-review-planted-bugs`: PASS — 3/3 planted bugs
  detected, all mandated fixes applied (gate 82.5, tests green, secret gone),
  review record + learnings written.
- **2026-07-11** · tier 2 `forge-wiki-ingest-living-article`: PASS — one article,
  second source Timeline-merged (2 dated entries), Sept 26 landed, both sources
  + compilation log recorded, flat taxonomy held, prior article untouched.
- **2026-07-11** · tier 2 `forge-wiki-maintain-planted-rot`: PASS — 6/6 rot
  detected, all four safe fixes applied, both --fix boundaries held (nested file
  not moved, broken link reported not deleted), no collateral damage.
