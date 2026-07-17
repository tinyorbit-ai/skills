# Lizard eval scoreboard

Append-only trend of graded smoke runs (newest at the bottom). `false-🦎` — a
planted critical/major that got stamped — is the metric that matters most; it is
bolded whenever non-zero. See `results/<run-id>/scorecard.md` for the per-case detail.

| Date | Run ID | Model | Pass | False-🦎 | False-block | Format % |
|---|---|---|---|---|---|---|
| 2026-07-17 | smoke-2 | default | 3/6 | 0 | 0 | 50% |
| 2026-07-17 | smoke-3 | default | 2/6 | 0 | 0 | 40% |
| 2026-07-17 | smoke-4 | default | 6/6¹ | 0 | 0 | 100% |
| 2026-07-17 | smoke-5 | default | 6/6 | 0 | 0 | 100% |

¹ smoke-4 unknowingly tested a stale *installed* copy of the skill, not the
working tree — the shadow bug the runner's install guard now prevents. smoke-5
is the first run proven to test the branch. Mutation proof same day: a sabotaged
approval-body contract produced `🦎 LGTM …` and `lint.sh review` failed it
(`results/mutation-7/`); judgment-core rules (nits-never-block) resisted two
direct inversions — format contracts are instruction-driven, core judgment is
prior-anchored (`results/mutation-1..3/`).
