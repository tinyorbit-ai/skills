# Evals — three tiers, each costs more and tells you more

Skills are prompts, so "does it work" means different things at different layers.
Run the cheap tiers constantly; run the expensive one when a skill's behavior
changed.

| Tier | What it proves | Cost | When |
|---|---|---|---|
| **0 static** | frontmatter parses, discovery works, references resolve, index in sync | free, seconds | every push (CI) |
| **1 trigger** | user utterances route to the right skill from `description` alone | ~45 haiku calls, pennies | after editing any `description` |
| **2 behavioral** | the skill, run end-to-end headless, produces its contracted artifacts | real tokens, minutes/case | after editing a skill's body |

## Tier 0 — static validation

```bash
node evals/static/validate.mjs                     # local (CLI discovery check optional)
EVALS_REQUIRE_CLI=1 node evals/static/validate.mjs # CI mode (discovery check mandatory)
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

Reads every live `description` from `skills/*/SKILL.md`, shows a model ONLY that
catalog plus one utterance, and asserts it names the expected skill (or `none`).
Defaults to Haiku deliberately — a weak router is a stricter test of description
quality. Cases live in `trigger/cases.json`; `expect` is a list, so genuinely
ambiguous routings (e.g. "build the next phase" → forge-build or forge) accept
either. Threshold: 90% (`EVAL_TRIGGER_THRESHOLD`).

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

### Pilot cases

- **`forge-plan-structural`** — filled brief in, plan out. Deterministic: phase
  blocks carry Branch/Goal/Verifiable gate/Design markers, gates aren't bare
  hygiene, ADRs have non-empty Alternatives, architecture.md replaced. Judge:
  gates prove goals, phase 1 is a vertical slice, brief constraints shape phases.
- **`forge-review-planted-bugs`** — a phase branch with three seeded defects
  (command injection, committed `sk-live` secret, header-inclusive mean that
  breaks the phase gate). Grades recall (≥2/3 detected), the mandated auto-fixes
  (secret gone, gate output correct, tests green), and the review record +
  learnings bookkeeping.

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

## CI

`.github/workflows/evals.yml` — static on every push/PR; trigger and behavioral
are `workflow_dispatch` (they spend tokens; needs `ANTHROPIC_API_KEY` secret).
