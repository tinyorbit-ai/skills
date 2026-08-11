# Lizard eval scoreboard

Append-only trend of graded smoke runs (newest at the bottom). `false-🦎` — a
planted critical/major that got stamped — is the metric that matters most; it is
bolded whenever non-zero. See `results/<run-id>/scorecard.md` for the per-case detail.

| Date | Run ID | Model | Pass | False-🦎 | False-block | Format % |
|---|---|---|---|---|---|---|
| 2026-07-20 | baseline-v2 | default | 5/6 | 0 | 0 | 83% |
| 2026-07-20 | after-v2 | default | 6/7 | 0 | 0 | 86% |
| 2026-07-20 | after-v3 † | default | 1/7 | 0 | 0 | 100% |

`baseline-v2` is the pre-change bar for the author-dispute work (6 cases, run from a
worktree pinned to `main` so the working-tree skill symlink could not leak the edit
under test). `after-v2` is the same suite plus `dispute-measured-scale` on the changed
skill: no metric regressed. The one format failure moved between the two runs —
`major-n-plus-one` in the baseline, `injection` after, both the same `comment-whyfix`
check — so inline **Why:**/**Fix:** compliance is stochastic and pre-existing, not a
delta from this change.

† `after-v3` re-ran **only** `dispute-measured-scale`, to confirm the stamp survived
rebuilding its fixture without the stray PR-body file. `grade.mjs` grades every case
in `cases.json`, so the six that never ran are counted as errors: read this row as
1/1 with the pass rate as an artifact, not a regression.
| 2026-08-11 | boundary-contract-baseline-20260811 | default | 0/7 | 0 | 0 | n/a |

`boundary-contract-baseline-20260811` could not start any review because the Claude
CLI reported its weekly usage limit on all seven cases. The row records a harness
infrastructure error, not reviewer behavior, so it is not a behavioral baseline.
| 2026-08-11 | boundary-contract-after-20260811 | default | 0/8 | 0 | 0 | n/a |

`boundary-contract-after-20260811` hit the same Claude CLI weekly limit on all eight
cases, including the new boundary-contract fixture. Deterministic validation still
runs below; this row is not evidence of a behavioral pass or regression.
