# Fixtures — the planted-PR corpus

`base/` is a small synthetic TypeScript order/catalog service ("orbitcart").
Each directory under `cases/` is a PR overlay against it: the changed files,
plus `pr.md` (title line, then body) and an optional `_delete` list. The golden
answers live in `../cases.json`.

`bootstrap.sh` stands the corpus up on GitHub (default
`tinyorbit-ai/lizard-fixtures`): creates the repo if missing, seeds `main` from
`base/`, opens one PR per case, and writes `prs.json` (case id → PR number/url).
Idempotent — re-run any time; `FORCE_REFRESH=1` rebuilds every case branch/PR
after you edit a fixture.

Rules for new cases: fully synthetic content only (no real companies, people,
or repos), and every planted **blocking** defect must be causally owned by the
PR — introduced by the diff, never pre-existing in `base/` — per
`skills/lizard/references/scope.md`.
