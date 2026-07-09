# GitHub Review Mechanics

Exact `gh` commands for fetching PR data and submitting the review. All commands
accept `--repo <owner>/<repo>`. For GitHub Enterprise hosts export `GH_HOST=<host>`
before running anything here.

## Fetch startup metadata

At startup fetch only what dedup and triage need — before any checkout, full diff
read, or context discovery:

```bash
gh pr view <number> --repo <owner>/<repo> --json \
  number,title,body,author,isDraft,state,url,\
baseRefName,headRefName,headRefOid,additions,deletions,changedFiles,\
files,reviews,comments,latestReviews,closingIssuesReferences
```

Useful fields: `headRefOid` (the SHA to dedup against and pin the review to),
`author.login` (compare with `gh api user --jq .login` to detect a self-authored PR),
`files`/`additions`/`deletions` (triage), `closingIssuesReferences` (context).

CI, in a friendly shape (`gh pr checks` exits non-zero on failing/pending checks, so
guard it):

```bash
gh pr checks <number> --repo <owner>/<repo> --json name,state,bucket,link || true
```

## Fetch the diff

```bash
gh pr diff <number> --repo <owner>/<repo>              # unified diff
gh pr diff <number> --repo <owner>/<repo> --name-only  # changed paths (triage)
gh pr diff <number> --repo <owner>/<repo> --patch      # patch (fingerprinting)
```

`gh pr diff` returns the PR's own merge-base delta — correct per-PR even in a
stacked (e.g. Graphite) flow. For surrounding source, prefer the local checkout
(session mode) or the shared object store (loop mode). Single-file fallback with no
checkout:

```bash
gh api "repos/<owner>/<repo>/contents/<path>?ref=<headRefOid>" \
  -H "Accept: application/vnd.github.raw+json"
```

## Find previous lizard reviews

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

## In-progress reaction — the in-flight claim

The 👀 reaction doubles as the parallel-run claim (`references/dedup.md`) — but only
your own: anyone can react 👀 on a PR, so filter to the authenticated login (the
same `gh api user --jq .login` already fetched for self-authored detection). Your
`eyes` fresher than 30 minutes means another run is in flight — stop; older is a
crashed run's leftover — remove it and proceed (the API only permits deleting your
own reactions anyway):

```bash
login="$(gh api user --jq .login)"
gh api "repos/<owner>/<repo>/issues/<number>/reactions" \
  -H "Accept: application/vnd.github+json" \
| jq --arg login "$login" \
    '[.[] | select(.content == "eyes" and .user.login == $login) | {id, created_at}]'
```

Add yours after the exact-head check decides a review might happen; best effort, not
a lock (GitHub dedups identical reactions from the same user — accept it):

```bash
reaction_id="$(gh api --method POST \
  "repos/<owner>/<repo>/issues/<number>/reactions" \
  -H "Accept: application/vnd.github+json" \
  -f content=eyes --jq '.id' 2>/dev/null || true)"
```

Remove it after posting (or before exiting on a skip/failure); a 404 is fine:

```bash
[ -n "${reaction_id:-}" ] && gh api --method DELETE \
  "repos/<owner>/<repo>/issues/<number>/reactions/$reaction_id" --silent || true
```

## Submit one review with inline comments

Do not use `gh pr review` (no inline comments) or scattered `gh pr comment`s. Target
payload shape:

````json
{
  "commit_id": "<headRefOid>",
  "event": "COMMENT",
  "body": "not yet.\n\n1. **major** — `src/api/orders.ts:142` — N+1 ...\n\n<details>...receipts...</details>\n\n<!-- lizard:v1 verdict=wait tier=standard adversary=none head=... diff=... context=... -->",
  "comments": [
    {
      "path": "src/api/orders.ts",
      "line": 142,
      "side": "RIGHT",
      "body": "**major** — N+1: one query per order.\n\n**Fix:** batch with `$in`.\n\n```suggestion\nconst customers = await getCustomersByIds(orders.map(o => o.customerId))\n```"
    }
  ]
}
````

Never hand-write this JSON — bodies contain newlines, quotes, and backtick fences.
Write each body to its own scratch file (under this run's scratch dir, never a shared
path) and assemble with `jq`:

```bash
printf '%s' "$review_body" > "$run/body.md"
printf '%s' "$c1_body"     > "$run/c1.md"

jq -n --arg commit "$head_sha" \
  --rawfile body "$run/body.md" --rawfile c1 "$run/c1.md" \
  '{commit_id: $commit, event: "COMMENT", body: $body,
    comments: [{path: "src/api/orders.ts", line: 142, side: "RIGHT", body: $c1}]}' \
  > "$run/review-payload.json"

gh api --method POST "repos/<owner>/<repo>/pulls/<number>/reviews" \
  --input "$run/review-payload.json"
```

Payload rules:

- `event` is `APPROVE`, `COMMENT`, or `REQUEST_CHANGES`. Always set it — omitting it
  creates a pending, unsubmitted review.
- An approval's `body` is exactly `🦎`, then the receipts block, then the metadata
  line. `comments` may still carry nits.
- `commit_id` = the `headRefOid` actually reviewed, so the review attaches to the
  right head even if the author pushes mid-review.
- Before any POST, validate the top-level body has a collapsed receipts table:
  `<details>`, `<summary>...lizard receipts...what was checked...</summary>`,
  `|---|---|`, and `</details>` must all appear before the hidden metadata line.
  Plain `Receipts:` bullet lists are invalid. This validation applies equally to
  stamp-as-comment approvals for self-authored PRs.
- Also before any POST, re-run the previous-review lookups above: a lizard verdict
  at the current `headRefOid` that appeared mid-review means this run lost the race
  — do not post (`references/dedup.md`).

## Inline comment anchoring

- `path` is the repo-relative path as it appears in the diff; `line` is the file's
  line number on the chosen side (not a diff offset); `side` is `RIGHT` for
  added/modified lines, `LEFT` only for removed code.
- Multi-line comments set `start_line`/`start_side` + `line`/`side` over a contiguous
  changed range in one hunk.
- **Every anchor must be a line in the PR diff** — an out-of-diff anchor fails the
  whole POST with HTTP 422.
- No stable anchor (e.g. the issue is in a pure deletion)? Anchor to the nearest
  surviving changed line in that file; if the file has no RIGHT-side lines at all,
  keep the finding in the top-level body with the same severity and fix.

## Suggestion block protocol

A `suggestion` is one-click-applied: GitHub replaces exactly lines
`start_line..line` of the head file with the block content. Derive anchors from the
head file, never eyeball them from `@@` hunk headers:

1. Find the line number in the head file (`git grep -n '<exact code>' <head-ref> --
   <path>`, or the checkout in session mode), then confirm it falls inside a
   changed new-side range from `git diff -U0 <base>...<head> -- <path>`.
2. Build the block copy-then-edit: print the exact anchored range
   (`git show <head-ref>:<path> | sed -n '<start>,<end>p'`), copy verbatim, apply the
   minimal edit. Never retype from memory — indentation and quoting must survive.
3. Verify the splice: every changed line lies inside the range; every line of the
   range is present (unchanged or deliberately edited); the spliced file stays well
   formed.
4. Can't verify (no local refs, non-contiguous fix)? Downgrade to a language-tagged
   fenced code block plus a `**Fix:**` line — copyable, just not one-click.
5. Guardrails: ranges must not overlap; merge adjacent ranges into one suggestion;
   fence with four backticks if the replacement contains triple backticks.

If the POST fails with 422, the cause is almost always one bad anchor: move that
finding into the top-level body with the same severity and resubmit. Never drop the
review or scatter loose comments.

## Stamp-as-comment (self-authored PRs)

GitHub rejects `APPROVE` from the PR author. When `author.login` equals the
authenticated user and the verdict is go, post the stamp as a plain issue comment —
body exactly `🦎` + receipts + metadata:

```bash
gh api --method POST "repos/<owner>/<repo>/issues/<number>/comments" \
  --input "$run/stamp-comment.json"   # {"body": "🦎\n\n<details>...</details>\n\n<!-- lizard:v1 ... -->"}
```

Non-approving verdicts on self-authored PRs post as normal COMMENT /
REQUEST_CHANGES reviews — only APPROVE is blocked by GitHub.

## After the POST — one standing verdict

Fetch lizard verdicts at the current head once more (formal reviews AND issue
comments). If a concurrent run double-posted, the later verdict yields
(`references/dedup.md`). Your own later stamp-as-comment is deleted:

```bash
gh api --method DELETE "repos/<owner>/<repo>/issues/comments/<comment-id>"
```

A submitted formal review cannot be deleted — dismiss your own later duplicate
(write access required); if dismissal fails, leave it and record the collision in
the ledger:

```bash
gh api --method PUT \
  "repos/<owner>/<repo>/pulls/<number>/reviews/<review-id>/dismissals" \
  -f message="duplicate lizard run — the earlier review stands" -f event="DISMISS"
```
