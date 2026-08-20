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
| **1b routing** | `maximum-effort`'s triage rule sizes tasks (S/M/L) and floors risk (sonnet/opus) as intended, from its live `## Triage` section alone | 15 haiku calls, pennies | when the triage rule changes |
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

## Tier 1b — routing (maximum-effort)

```bash
node evals/routing/run.mjs              # 15 cases
node evals/routing/run.mjs --dry-run    # print the assembled prompt, no calls
node evals/routing/run.mjs --only stripe
```

Same shape as tier 1, different question: not *which skill*, but *which lane*. Reads
the live `## Triage` section of `maximum-effort`'s SKILL.md (experimental or promoted,
whichever exists), shows Haiku ONLY that section plus one task, and asserts the size
(S/M/L) and the worker floor (sonnet/opus). Passes at ≥ 14/15 **and** two hard
constraints — no `routine` case may floor at opus, every `hard` case must. The misses
that shaped the rule on day one: "add X and cover it with tests" reading as S (a new
test is now M), "double-sends emails" not reading as risky (outbound side effects are
now named), and an auth *refactor* reading as safe (the surface decides, not the
intent). Cases in `routing/cases.json`; a real mis-route becomes a case.

## Tier 2 — behavioral

```bash
node evals/behavioral/run.mjs _smoke                          # plumbing self-test, cheap
node evals/behavioral/run.mjs forge-plan-structural --runs 3
node evals/behavioral/run.mjs forge-review-planted-bugs --runs 3
node evals/behavioral/run.mjs --all --keep                    # keep workdirs for inspection
node evals/behavioral/run.mjs --all --runs 3 --jobs 8            # widen the suite-wide pool
node evals/behavioral/run.mjs forge-plan-structural --no-cache          # force a re-measure
```

### Why a round used to take 40 minutes

Three structural wastes, all fixed:

- **Runs were sequential, then cases were.** Both are independent, so both now
  overlap through one suite-wide pool of `--jobs N` concurrent agent runs (default
  6). Per-case pools left the pool idle whenever a case had fewer runs left than
  slots, and `--all` still walked the cases one at a time. The ceiling is provider
  overload, not CPU, so don't crank it far — a run lost to a 529 measures nothing.
- **An unchanged baseline was re-measured every time.** Each case fingerprints the
  skills under test + the case dir + the model; an identical fingerprint reuses the
  stored verdict instead of paying for it again (`evals/results/.cache/`). Comparing
  a branch against `origin/main` three times in a session re-ran a baseline whose
  skills never changed — half the wall clock for nothing. Editing any skill under
  test changes the fingerprint and forces a real run.
- **A 529 burned a whole run.** `runAgent` now backs off and retries up to 3×; only
  a run that still fails is reported as errored and excluded.

Cold `--runs 3` is now roughly one run's wall time instead of three, an `--all`
sweep is bounded by the pool rather than by the number of cases, and an unchanged
side is instant.

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

### How a case passes

The two halves of a grade are aggregated differently on purpose:

- **Deterministic `check.mjs` assertions — every run must pass.** They're objective
  contract checks; an intermittent failure is a real intermittent violation.
- **Judge dimensions — the MEDIAN across runs must clear the floor.** Not every run.

The median rule is not a softened bar, and the arithmetic matters. Measured
2026-07-25 via `forge-plan-rubric-absolute`: the hand-written **golden** reference
plan scores `gates_prove_goals` 7–8 against a floor of 7, while the seeded-degraded
plan scores 0–1. Separation is ~6 points — the rubric discriminates superbly — but
the golden plan has **zero headroom**. Requiring 4 dimensions × 3 runs to all clear
7 therefore lands ~30% of the time no matter how good the plan is, which is exactly
what both sides of a baseline comparison scored. The old rule measured luck; the
median measures the skill's typical output, which is what the rubric's
"every dimension ≥ 7" was always describing. The degraded plan fails either way.

Set `judgeFloor` in `config.json` to override the floor parsed from `rubric.md`.

### Cases

- **`forge-plan-structural`** — filled brief in, plan out. Deterministic: phase
  blocks carry Branch/Goal/Verifiable gate/Design markers, gates aren't bare
  hygiene, ADRs have non-empty Alternatives, architecture.md replaced — plus the
  free economy-of-means script checks (no package installs on a zero-dep brief,
  anti-pattern sweep from simplicity.md, because-clause on every parts-list
  entry, phase-count ceiling). Judge: four dimensions (economy_of_means graded
  against simplicity.md verbatim, gates_prove_goals, phase1_vertical_slice,
  brief_fidelity), floor ≥ 7 each.
- **`forge-plan-rubric-absolute`** — judge-only. The case above proves the judge
  discriminates **comparatively** (A vs B); every graded case actually scores
  **absolutely** (one artifact vs a numeric floor), and that mode went untested
  until it bit. Scores the same golden/degraded pair one at a time through the real
  structural rubric. Guards both directions: a rubric lax enough to let the bloated
  plan clear the floor, and — the one that actually happened — a rubric or floor
  tight enough that the *golden* plan can't clear it, which makes every real case
  turn on noise. Its informational headroom check is currently **failing by design**
  (golden's worst dimension is 7 against a floor of 7); that's the standing evidence
  for the median-across-runs rule.
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
- **`forge-planning-disciplines-tiny`** — the proportionality floor for the three
  above. `shotsort`: one Python file, one user, one laptop, non-goals that ban
  PyPI, installers, releases, servers, and other users. Nothing ships, so release
  closure must collapse to a single `Release closure: n/a — …` line. Two failures
  are graded, in ascending badness: enumerating the nine closure items just to
  mark them `n/a` (ceremony), and **inventing** packaging, telemetry, alerting, or
  runbook work to fill the slots (accretion — the likelier one, since declaring
  nine things inapplicable reads like shirking while inventing nine small
  obligations reads like diligence). Every other discipline still applies in full:
  risk contracts, goal gates, and behavior traceability are not waived for being
  small. Without this case the other three all describe projects that genuinely
  ship, so the release-closure rule is never tested where it costs.
- **`forge-review-planted-bugs`** — a phase branch with three seeded defects
  (command injection, committed `sk-live` secret, header-inclusive mean that
  breaks the phase gate). Grades recall (≥2/3 detected), the mandated auto-fixes
  (secret gone, gate output correct, tests green), and the review record +
  learnings bookkeeping.
- **`forge-review-economy`** — the subtractive half of the review bar, and the
  mirror of the case above: the phase-2 diff is **correct and green**, so a review
  hunting only for bugs passes it. What it leaves behind is the defect. It replaces
  the buffered parser with a streaming one but keeps the old `src/parse.js` alive
  behind a caller-less `src/compat.js` shim ("kept for backwards compatibility"),
  keeps `test/parse.test.js` for behavior no longer in the product path, and
  over-tests the new parser — 11 tests where two cover it, including duplicate
  assertions of one regression, implementation-mirror tests on generator internals,
  a hand-rolled stub for a module the parser never touches, and a 60-row fixture
  proving a 2-row property. Every finding is fixed by **deleting**, so a review that
  can only add cannot pass. Grades the removals, the test thinning (14 planted
  `test()` blocks → ≤ 8), and — the bar it must not trade away — the gate and suite
  still green with the streaming parser and end-to-end stats still covered.
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

- **`maximum-effort-m-task`** — the lane contract, graded from the transcript's
  top-level tool calls (a subagent's own calls never surface there, which is the
  point). A tiny zero-dep login server; the task adds per-IP rate limiting to
  `POST /login` — M-sized, one unknown (where the handler and its tests live), one
  risky step (it sits on the auth surface). Checks: a scout before the first worker, a
  worker on Sonnet, the risky step's worker on Opus, no planner/Fable on an M task, the
  leaf boundary in every spawn prompt, the coordinator editing nothing but
  `.maximum-effort/`, a plan with a `check:` per step and every box ticked,
  `.git/info/exclude` rather than `.gitignore`, a receipt line, the suite green, a test
  naming 429, and a live probe (six logins from one IP → the sixth is 429 with
  `Retry-After`). Judge: plan quality, economy of the limiter, brief fidelity. Reads
  the role agents from `~/.claude/agents/` (headless loads them) but accepts the
  `model:` fallback, so it passes without them; that machine state is outside the
  fingerprint — pass `--no-cache` after touching the agent files.

### Add a case

```
evals/behavioral/cases/<name>/
├── task.md        headless prompt — say "NON-INTERACTIVE: don't AskUserQuestion,
│                  take your recommendation" for interactive skills
├── config.json    { "skills": [...include "forge" for cross-skill refs; an experimental
│                    skill is ".experimental/<name>" — the symlink takes the basename...],
│                    "branch": "...", "judgeFiles": [...], "timeoutMinutes": N }
├── fixture/       flat, or base/ + phase/ overlays for phase-branch cases
├── check.mjs      export default async ({ workdir, transcript, exec }) => checks[]
└── rubric.md      optional LLM-judge criteria
```

Hermeticity rules: zero-dependency fixtures (no `npm install`), `reviewer: none`
in `wiki/.forge/config.yaml` so forge-review doesn't shell out to codex/gemini,
no network.

## Recorded baselines

- **2026-08-20** · tier 1b routing (15 cases, Haiku): 12/15 → 15/15 after two
  rule sharpenings (a new test is M; un-recallable side effects and a refactor on a
  trust boundary are risky). Both hard constraints clean.
- **2026-08-20** · tier 2 `maximum-effort-m-task` ×3, first baseline: **FAIL**, and
  the autopsy reshaped both the skill and the check. Re-graded offline with the
  corrected check, runs 1–2 clear all 19 deterministic checks (run 1 ran every lane
  through the Codex pool — a legitimate pool pick at Claude 7-day 30% vs Codex 3%;
  run 2 was the contract to the letter on the Claude pool); run 3 backgrounded its
  Codex scouts and ended the headless turn with nothing done — now forbidden by the
  skill. Judge medians plan_quality 7 · **economy_of_means 5 ✗** · brief_fidelity 8:
  both real runs shipped a factory module with options for a 12-line per-IP window.
  The plan step now carries the default-deny (no file for one caller, no option for
  a fixed value, one seam test over five module tests). A second ×3 run against the
  fixed skill was started and stopped before any run completed (5-hour window at
  92%) — **not yet green**; re-run with
  `node evals/behavioral/run.mjs maximum-effort-m-task --runs 3 --no-cache`.
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
