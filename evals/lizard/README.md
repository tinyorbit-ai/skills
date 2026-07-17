# Lizard evals

A pre-push smoke suite for the `lizard` skill. Lizard is prompt-defined and ships on
`push = published` with no review gate, so every past behavior fix (receipts format,
parallel-run guard, causal scope) was found *after* it regressed in production. This
harness lets you check, before pushing an edit to `skills/lizard/`, that lizard still
stamps clean PRs, still blocks planted criticals, still emits the exact format
contract, and still refuses prompt injection.

These evals live at the **repo root**, not inside `skills/lizard/`. Installs symlink
the skill folder; the evals must never ship to consumers.

## Layout

```
evals/lizard/
├── cases.json          # the case manifest (golden answers)      [owned by fixtures]
├── fixtures/           # fixture repo bootstrap + prs.json map    [owned by fixtures]
├── bin/
│   ├── run.sh          # run lizard --dry-run per case, capture the payload
│   ├── lint.sh         # Layer-1 deterministic format checks (no LLM)
│   ├── grade.mjs       # Layer-2 outcome grading + scorecard rollup
│   └── testdata/       # tiny hand-made payloads for self-testing lint.sh
├── snapshots/
│   └── SCOREBOARD.md   # committed, append-only trend table
├── results/            # per-run transcripts + scorecards (gitignored)
└── replay/             # points at the PRIVATE ledger replay manifest [later]
```

## Running the smoke suite

```bash
# 0. One-time (and idempotent): create the fixtures repo and open the case PRs.
bash evals/lizard/fixtures/bootstrap.sh          # writes evals/lizard/fixtures/prs.json

# 1. Run every case through lizard --dry-run (nothing is posted to GitHub).
evals/lizard/bin/run.sh --run-id smoke-1         # or pass specific case-ids

# 2. Grade the run against the golden answers.
evals/lizard/bin/grade.mjs --run-id smoke-1
```

`run.sh` builds an isolated scratch project per case whose `.claude/skills/lizard`
symlinks the **working-tree** skill, so you are always testing your current edit and
never an installed copy. Each case also gets its own `LIZARD_HOME`, so runs never
dedup against each other or against your real `~/.lizard` ledger.

`grade.mjs` writes `results/<run-id>/scorecard.{json,md}` and appends one row to
`snapshots/SCOREBOARD.md`. It exits non-zero if any case produced a **false-🦎**
(a planted critical/major that got stamped) or errored — the two outcomes a pre-push
run must never wave through.

### Field lint — zero-cost, no fixtures needed

The same linter runs standalone over your real lizard history — immediate value before
any fixture PR exists:

```bash
evals/lizard/bin/lint.sh field            # scans ~/.lizard
evals/lizard/bin/lint.sh field /some/dir  # or an explicit LIZARD_HOME
```

It re-checks the posted bodies/payloads under `runs/*`, validates every ledger record
grammar, checks that each `blind-spots.md` entry carries all five fields, and flags a
repo split across two host keys. Findings over real history are expected to need
triage (old artifacts predate the current contract) — that is signal, not a bug.

### Environment

| Var | Effect |
|---|---|
| `LIZARD_EVAL_MODEL` | passed to `claude --model`; recorded on the scorecard. Unset = harness default. |
| `LIZARD_EVAL_TIMEOUT` | per-case hard timeout in seconds (default `900`). |

Set `LIZARD_EVAL_MODEL` identically for `run.sh` and `grade.mjs` if you pin a model;
`run.sh` also records it in `results/<run-id>/run-meta.json`, which `grade.mjs` reads.

## Adding a case

1. Add the fixture branch + PR in `fixtures/` (see `fixtures/bootstrap.sh`).
2. Add one object to `cases.json`:

   ```json
   {
     "id": "planted-critical-removed-export",
     "branch": "planted/removed-export",
     "title": "remove getOrderLegacy",
     "expected_verdict": "block",
     "expected_tier": "standard",
     "findings": [
       { "path": "src/orders.ts", "class": "removed-export", "blocking": true }
     ],
     "forbidden": ["stamp"],
     "allow_hedge": false,
     "notes": "surviving call site must be caught inline"
   }
   ```

   - `expected_verdict` — `go` | `wait` | `block`.
   - `expected_tier` — `quick` | `standard` | `deep`.
   - `findings[].blocking` — a blocking finding is graded as *recalled* when a posted
     inline comment (or, for a pure deletion with no surviving anchor, the review
     body) references its `path`.
   - `forbidden` — behaviors that must not occur. `stamp`/`approve`, `block`, and
     `wait`/`comment` map to the review event; anything else is matched textually
     against the body + comments where possible.
   - `allow_hedge` — when `true` on a `wait` case, a hedged question (a `COMMENT`
     whose body contains `?`) satisfies the case even if no hard blocking finding is
     anchored. Use it for "plausible-but-unprovable" cases where a confident major
     would itself be the wrong answer.
3. Run just that case: `bin/run.sh --run-id try <case-id>` then `bin/grade.mjs
   --run-id try`.

## Cost

Each case is roughly **one full lizard review** — an agent turn plus its `gh`/context
fetches. The smoke set is deliberately small and excludes T3 (deep, multi-agent
fan-out) cases, which cost several reviews each; those are gated behind a future
`--full` flag. `lint.sh` and `grade.mjs` are free (no model calls); only `run.sh`
spends tokens. Field lint is always free.

## What this does *not* measure

Being honest about the harness's blind spots, the same way a receipts block is:

- **Prose quality of a finding.** Layer-1 lint checks *shape* (anchors, `**Why:**` /
  `**Fix:**`, ≤120 words, the stamp contract). Whether a finding is *grounded*,
  correctly *severity-rated*, or *causally scoped* is the Layer-2 LLM judge's job, not
  this deterministic harness — `grade.mjs` matches findings only by file path + verdict.
- **Hallucinated blockers.** grade.mjs measures recall of *expected* findings, not the
  absence of invented ones. A run that blocks for a made-up reason on the right file
  still scores a match. The judge arm covers groundedness.
- **The formal-approval path.** Fixture PRs are self-authored by the running account,
  so evals exercise the **stamp-as-comment** path. The GitHub `APPROVE` review state
  on a non-authored PR is never exercised here.
- **Real posting, dedup races, and reactions.** Everything runs under `--dry-run`;
  nothing is posted, so the 👀-claim/parallel-run guard and the after-POST
  reconciliation are only observable in the field-lint arm over real history.
- **Non-determinism.** A single run is one sample of a stochastic reviewer. Trends on
  `SCOREBOARD.md` across runs matter more than any one row; a green run is necessary,
  not sufficient.
- **Word count is a `warn`, not a `FAIL`.** The skill says *aim* for ≤120 words before
  a suggestion, so exceeding it warns rather than failing the format gate.
