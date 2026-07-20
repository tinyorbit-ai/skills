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
  rubric and returns per-dimension scores (`{scores, pass, worst, reasons}`).
  `config.rubricSources` lists repo files (e.g. forge's own
  `simplicity.md`) that are inlined verbatim as the standards the judge applies —
  the judge enforces forge's published quality bar, not a paraphrase.
- **judge-only cases** — `"agent": false` in config skips the agent run entirely;
  check.mjs gets a `judgeRaw(prompt)` helper to run its own judge calls (used by
  the calibration case).

Transcripts and verdicts land in `evals/results/<stamp>-<case>/` (gitignored).
Runs are stochastic — a single pass is a smoke signal, `--runs 3` is evidence.

### Cases

- **`forge-plan-structural`** — filled brief in, plan out. Deterministic: phase
  blocks carry Branch/Goal/Verifiable gate/Design markers, gates aren't bare
  hygiene, ADRs have non-empty Alternatives, architecture.md replaced — plus the
  free economy-of-means script checks (no package installs on a zero-dep brief,
  anti-pattern sweep from simplicity.md, because-clause on every parts-list
  entry, phase-count ceiling). Judge: four dimensions (economy_of_means graded
  against simplicity.md verbatim, gates_prove_goals, phase1_vertical_slice,
  brief_fidelity), floor ≥ 7 each.
- **`forge-plan-judge-calibration`** — judge-only, no agent run. A hand-written
  golden plan vs a degraded twin with seeded bloat (plugin registry, YAML
  config manager, event bus, abstract base class, deps on a zero-dep brief,
  hygiene-only gates, a "foundation" phase 1). The judge must pick golden in
  BOTH presentation orders and cite the seeded junk. If this fails, don't trust
  any other judge verdict that day.
- **`forge-plan-tripwired-simple`** / **`forge-plan-tripwired-comprehensive`** —
  scope-fidelity pair born from the 2026-07-12 plan stress test: two briefs whose
  non-goals ban, by name, the features a scope-inventing planner reaches for
  (terminal timer: config/flags/stats/notifications/break cycles; self-hosted
  reading tracker: social/multi-user, ratings, PWA/offline, export APIs,
  e-books). Deterministic: negation-aware tripwire greps scoped to phase blocks
  (where build obligations live), phase-count proportionality (≤ 3 / 5–9),
  design routing present on the UI brief, ADRs with alternatives, env-var drift
  surfaced (informational). Judge: **behavior_traceability** — every behavior in
  a phase Goal / gate / Work bullet must trace to a brief clause or an ADR; the
  dimension exists because the first live run of the comprehensive brief leaked
  an invented status auto-advance and a 3-env-var config stretch — plus
  economy_of_means, gates_prove_goals, brief_fidelity, floor ≥ 7 each.
- **`forge-planning-disciplines-small`** / **`-large`** / **`-product`** — the
  three plan-bench project shapes promoted into permanent fixtures. They grade
  complete risk contracts, risk-first phase order, release closure, registry and
  packaging reality for a CLI, numeric load/resource/crash/restore/upgrade proof
  for a stateful system, and human evidence plus ambition pressure valves before
  SaaS billing. Each fixture carries identical `CLAUDE.md` and `AGENTS.md`; the
  harness mirrors the same skills into both agent paths.
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
- **2026-07-11** · tier 2 `forge-plan-judge-calibration`: PASS — golden plan
  picked in both presentation orders, margin 9 both times, all 7 seeded bloat
  categories cited (led with the zero-dependency violation).
- **2026-07-11** · tier 2 `forge-plan-structural` (first full live run, with the
  economy script checks + rulebook judge): all required checks green, judge
  9 · 9 · 9 · 10 across the four dimensions. One check initially misfired on a
  legitimate table-format parts list — a parser bug, fixed and re-verified
  offline against the same run's captured output.
- **2026-07-12** · tier 2 `forge-plan-structural` ×3, the behavior-traceability
  edit loop: baseline 3/3 (judge 9·9·10·9 / 9·8·10·9 / 9·9·10·9); final text
  3/3 with every run ≥ baseline (9·9·10·10 / 9·9·10·9 / 9·9·10·9).
  Intermediate attempts hit 2/3 then 1/3 — never on quality (judge ≥ baseline
  throughout) but on prose drifting off machine-read formats (free-text
  `Design:` markers, "Options considered" ADR headings); each miss became a
  contract-pinning line in the skill. A 0/3 batch in between was a usage-cap
  artifact (all agents 429'd), not evidence.
- **2026-07-12** · tier 2 `forge-plan-tripwired-simple` (new): 3/3 rolls PASS —
  judge 8·9·8·9, 8·9·9·9, 9·9·8·9. The behavior_traceability dimension
  independently re-found the decimal-minutes borderline that manual grading of
  the original stress test had flagged.
- **2026-07-12** · tier 2 `forge-plan-tripwired-comprehensive` (new): 2/3 rolls
  PASS (8·9·9·9 twice). The third roll failed the judge floor as designed —
  behavior_traceability capped at 6 for an ADR-less `SHELFIE_ADDR` knob
  ("config for a value that never changes"); the same roll's judge also caught
  a real arithmetic error in a stats gate (50 asserted, fixture seeds 40).
  Expected pass rate for this case is high-but-not-certain by construction:
  the residual leak rate is the thing it measures.
- **2026-07-12** · harden-confirmation experiment (not a tier): full
  `forge-harden --auto` over both leaky stress-test plans fixed 29+ real
  findings but caught **neither** invented-scope leak — the economy sweep's
  cut authority covers persona additions, not planner-invented scope. That's
  why the fix lives in forge-plan and this eval, not in hardening.
