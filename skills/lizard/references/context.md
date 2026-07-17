# Context Gathering & Receipts

A PR is a claim; the linked context is the truth. If the PR references it, read it
before judging — and disclose in the receipts what was read and what wasn't.

## Discover

Scan the PR title, body, branch name, comments, and review comments for:

- Linear issue IDs or URLs
- Notion page/database URLs
- Slack thread/message URLs
- GitHub issue links (including `closingIssuesReferences`)
- Related or stacked PR links (parents first)

## Fetch

Use whatever the host session provides — Linear/Notion/Slack MCP tools or skills if
available, `gh` for issues and PRs. If a referenced source cannot be fetched, note it
in the receipts with ✗ and continue. **If issue fit depends on an unfetchable
reference, confidence cannot be established — the verdict is "not yet." with that
stated as the reason.**

Private remote context informs the review; never paste sensitive detail into GitHub.
Cite the source name and summarize only what the finding needs.

## Cross-check claims

- The latest acceptance criteria in a linked issue become individually checkable
  items — each met, unmet, or explicitly out of scope. An unmet current criterion is
  **major**; removed historical criteria cannot remain blockers.
- "Per the spec" / "as discussed" → read the spec or thread and diff claim vs.
  reality.
- Stacked parent PRs → confirm this PR's assumptions about what the parent provides.

## Cache

Reusable remote context is cached across runs and PRs, atomically (write to a temp
file in the same directory, then `mv` into place):

```text
~/.lizard/cache/<host>/<owner>/<repo>/context/<reference-id>.md
```

Stamp each file with a freshness header:

```text
<!-- cache: source=<linear|notion|slack|github> ref=<id> cached_at=<ISO8601> source_updated_at=<ISO8601|unknown> -->
```

Reuse rules: if the source exposes a last-modified time (Linear, Notion), fetch that
lightweight metadata and reuse when unchanged; otherwise apply a 30-minute TTL. The
context fingerprint (`references/dedup.md`) does not cover external sources, so this
freshness check is what catches a Linear/Notion change while the PR itself is
unchanged.

## Receipts

Every review (and stamp-as-comment) ends with a collapsed receipts block placed
immediately before the hidden metadata line. It is the audit trail behind the
verdict — one click to audit the lizard. Never hide actionable findings inside it.
Plain `Receipts:` headings or bullet lists are invalid, including for
stamp-as-comment approvals on self-authored PRs.

Before posting, validate the final body contains this exact structure in this order:

1. Verdict body.
2. `<details>`
3. `<summary>...lizard receipts...what was checked...</summary>`
4. A two-column markdown table with the separator row `|---|---|`.
5. `</details>`
6. The hidden `<!-- lizard:v1 ... -->` metadata line.

If any part is missing, rewrite the body before submitting it to GitHub.

Template — include a row only when it has content:

```markdown
<details>
<summary>🔍 lizard receipts — what was checked</summary>

| | |
|---|---|
| depth | T2 standard — full criteria, single brain, refutation run |
| criteria | correctness ✓ · performance (n+1 ✓, complexity ✓, unbounded ✓) · security ✓ · issue fit ✓ · repo bar ✓ · tests ✓ · economy ✓ |
| focus packs | database-migrations, sql-semantics |
| issue fit | ENG-1234 acceptance criteria 4/4 met |
| context | ✓ Linear ENG-1234 · ✓ Notion "Checkout spec" · ✗ Slack thread (unavailable) |
| beyond the diff | 14 surrounding files read · call sites of removed `getOrderLegacy` grepped, none remain |
| findings | 1 nit (naming), inline — non-diluting |
| prior findings | 2 resolved · 0 still open |
| provenance | 1 introduced-by-pr · 1 pre-existing follow-up |
| scope | baseline 4 files/+120 · current 5 files/+145 · brake not triggered |
| rollout | pre-deploy proof unavailable · contained cohort · verify + disable named |
| state | CI green · mergeable · stack step 2/4 — good once parents land |

</details>
```

For T3, `depth` names the machinery honestly: `T3 deep — 3 reviewers + codex
adversary`, or `T3 deep — adversary unavailable, independent self-refutation pass
instead`. Degrade, but never silently.
