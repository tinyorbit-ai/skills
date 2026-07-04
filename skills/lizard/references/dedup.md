# Dedup, Fingerprints & Delta Re-review

Avoid repeating a review after a rebase, merge-refresh, or force-push that changes
the head SHA without changing the effective diff — and make re-reviews cheap by
reviewing only what changed.

## Hidden review metadata

Every review body from lizard ends with one hidden comment as its final line:

```html
<!-- lizard:v1 verdict=<go|wait|block> tier=<quick|standard|deep> adversary=<codex|claude|none> head=<headRefOid> diff=<diff-fingerprint> context=<context-fingerprint> -->
```

Rules:

- `verdict` — `go` (APPROVE / stamp-as-comment), `wait` (COMMENT), `block`
  (REQUEST_CHANGES).
- `head` — the exact `headRefOid` the review was pinned to.
- `diff=unknown` / `context=unknown` only when every fingerprint method fails; an
  `unknown` never matches, so it never causes a skip.
- No findings, severity, or private context inside the comment.

**Legacy compatibility**: reviews whose body starts with `🦎` or contains a
`pr-issue-review:v1` metadata comment are earlier lizard-lineage reviews. Treat them
as lizard's own for previous-review detection and context-fingerprint exclusion, so
repos with history are not double-reviewed.

## Skip checks, in order

1. **Exact head-SHA** — if a lizard review exists whose `commit_id` equals the
   current `headRefOid`, skip (no reaction added). Cheapest check, run first.
2. Add the 👀 in-progress reaction, then compute the two fingerprints below.
3. **Diff + context fingerprints** — if a previous lizard review's metadata has the
   same non-`unknown` `diff` AND the same non-`unknown` `context`, remove the
   reaction and stop without posting.

Skip only when all inputs are present and equal and the caller did not explicitly
request a rerun. If anything is missing, ambiguous, or `unknown`, review — a
duplicate review is less bad than skipping a genuinely changed PR.

Dedup is best-effort, not a barrier. Under parallel runs two instances can both pass
the checks and both post; accept it. **Fail open** — never add locking that could
strand a PR unreviewed.

## Diff fingerprint

Fingerprint the PR's own merge-base delta, not a tree-to-tree diff (which absorbs
unrelated base movement). `gh pr diff` returns GitHub's "Files changed" delta; feed
it through `git patch-id --stable` for rebase-insensitive identity — no checkout
needed:

```bash
gh pr diff <number> --repo <owner>/<repo> --patch | git patch-id --stable
```

Use the first field as `patch-id:<hash>`. If `patch-id` is unavailable, fall back to
a normalized patch hash:

```bash
gh pr diff <number> --repo <owner>/<repo> --patch \
  | sed -E '/^(From |index |diff --git |similarity index |rename from |rename to )/d' \
  | shasum -a 256
```

Use the first field as `sha256:<hash>`.

## Context fingerprint

The diff alone is not enough — a PR can keep the same patch while the stated issue or
conversation changes. The fingerprint must be byte-identical across runs, so compute
it with exactly this command (never hand-assemble the payload):

```bash
gh pr view <number> --repo <owner>/<repo> \
  --json title,body,baseRefName,headRefName,closingIssuesReferences,comments,reviews \
| jq -Sc '{
    title, body,
    base: .baseRefName, head: .headRefName,
    issues: [.closingIssuesReferences[]? | .number],
    comments: [.comments[]?
      | select((.body | test("^🦎") or test("(lizard|pr-issue-review):v1")) | not)
      | {a: .author.login, b: .body}],
    reviews: [.reviews[]?
      | select((.body | test("^🦎") or test("(lizard|pr-issue-review):v1")) | not)
      | {a: .author.login, s: .state, b: .body}]
  }' \
| shasum -a 256
```

Use the first field as `sha256:<hash>`. Guard the fetch: hashing empty input
"succeeds" with a constant hash that could wrongly match a prior failed run — confirm
`gh pr view` exited zero and produced JSON before hashing; on failure use
`context=unknown`.

Design constraints to preserve: no timestamps, IDs, or SHAs (rebases and time must
not move it; edits must); lizard's own reviews are excluded by marker/metadata, not
author login, so the fingerprint is stable regardless of which account runs the
skill; arrays stay in API order — `-S` sorts object keys only.

## Delta re-review

When a prior lizard review exists and the diff has genuinely changed:

1. **Audit prior findings first** — for each blocking finding in the last lizard
   review, check the current head: resolved or still open? Record both lists in the
   receipts. Never repost a still-open inline thread; reference the existing thread.
2. **Review the delta** — fetch what changed since the last reviewed head:

   ```bash
   gh api "repos/<owner>/<repo>/compare/<lastReviewedHead>...<headRefOid>"
   ```

   Review the delta's hunks at full depth; re-read full files only where the delta
   touches them. The full-diff pass is only needed again when the delta itself would
   classify as T3 on its own.
3. Stamp when every prior blocker is resolved and the delta introduces nothing new.
