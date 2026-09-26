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

## Parallel-run guard — one standing verdict per head

Two runs (a sweep and a session, overlapping crons) can both pass the skip checks and
both stamp. The invariant is **at most one standing lizard verdict per head SHA**,
held by three layers. Each fails open, so a layer that errors never blocks a review:

1. **Claim before reviewing.** Your own 👀 reaction is the claim. Filter reactions to
   the account lizard posts as; a bystander's 👀 is never a claim. Yours under 30
   minutes old means another run is in flight: stop without posting. Older is a
   crashed run's leftover: remove it and proceed. An explicit user request overrides
   the claim; layers 2–3 still apply, and they also catch races across two accounts.
2. **Re-check before the POST.** Re-run the previous-review lookups (formal reviews
   AND issue comments). A verdict at the current `headRefOid` that appeared
   mid-review wins: don't post, append a `duplicate-averted` ledger line.
3. **Verify after the POST.** If two verdicts stand at this head, the later one yields
   (commands in `references/github-review-api.md`).

No lock files, no hard barriers, a staleness bound on every claim. A PR stranded
unreviewed is worse than a rare duplicate.

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

## Lookup commands

All `gh` commands take `--repo <owner>/<repo>`; for GitHub Enterprise export `GH_HOST=<host>` first.

### Previous lizard reviews

```bash
gh api "repos/<owner>/<repo>/pulls/<number>/reviews" --paginate \
  --jq '[.[] | select(.body | test("^🦎") or test("(lizard|pr-issue-review):v1"))
         | {state, commit_id, submitted_at,
            metadata: (try (.body
              | capture("<!-- lizard:v1 verdict=(?<verdict>[^ ]+) tier=(?<tier>[^ ]+) adversary=(?<adversary>[^ ]+) head=(?<head>[^ ]+) diff=(?<diff>[^ ]+) context=(?<context>[^ ]+) -->"))
              catch null)}]'
```

`commit_id` is the head SHA the review was submitted against — the exact-head skip
key. Stamp-as-comments (self-authored PRs) live on the issue-comments endpoint;
check it too when detecting previous reviews:

```bash
gh api "repos/<owner>/<repo>/issues/<number>/comments" --paginate \
  --jq '[.[] | select(.body | test("lizard:v1")) | {body, created_at}]'
```

Inline threads (for the never-repost-open-threads rule):

```bash
gh api "repos/<owner>/<repo>/pulls/<number>/comments" --paginate
```

### In-progress reaction

```bash
login="$(gh api user --jq .login)"
gh api "repos/<owner>/<repo>/issues/<number>/reactions" \
  -H "Accept: application/vnd.github+json" \
| jq --arg login "$login" \
    '[.[] | select(.content == "eyes" and .user.login == $login) | {id, created_at}]'

# add yours once the exact-head check says a review may happen (best effort)
reaction_id="$(gh api --method POST \
  "repos/<owner>/<repo>/issues/<number>/reactions" \
  -H "Accept: application/vnd.github+json" \
  -f content=eyes --jq '.id' 2>/dev/null || true)"

# remove it after posting, or before exiting on a skip or failure; a 404 is fine
[ -n "${reaction_id:-}" ] && gh api --method DELETE \
  "repos/<owner>/<repo>/issues/<number>/reactions/$reaction_id" --silent || true
```

## Ledger lines

After every run in PR mode, append one line to
`~/.lizard/ledger/<host>/<owner>/<repo>.md` (`LIZARD_HOME` replaces `~/.lizard`):

```text
2026-07-04 PR#4242 verdict=go tier=standard adversary=none head=9fb2ddf
2026-07-04 PR#4242 verdict=unchanged-blocked head=9fb2ddf prior=2
2026-07-04 PR#4242 duplicate-averted head=9fb2ddf
2026-07-04 PR#4242 late-finding head=9fb2ddf first-reachable=3ac81f0 (round 1) — cell: drawer reopen on reload; the round-1 closure sweep enumerated dismissal but not the reload lifecycle.
```

`verdict` is `go`, `wait`, `block` or `unchanged-blocked`. Miss records and
calibration live in `references/loop-mode.md`.
