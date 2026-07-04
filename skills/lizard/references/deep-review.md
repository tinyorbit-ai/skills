# T3 Deep Review — two brains, one verdict

T3 is defined as stages with prompts and structured output shapes, not as any
host-specific orchestration. On hosts with parallel subagents (Claude Code's Agent or
Workflow tools) the stages fan out; everywhere else they run sequentially with the
same prompts. The review is identical either way.

## Stage 1 — fan-out reviewers

Split the PR by system/dimension — one reviewer per top-level area the diff touches
(e.g. `api/`, `worker/`, `migrations/`), or per criteria cluster for a deep
single-system PR. Each reviewer gets: the diff hunks for its slice, the gathered
context summary, `references/criteria.md`, and the matching focus packs. Each returns
structured findings:

```json
{"findings": [{"severity": "critical|major|minor|nit", "title": "...",
               "detail": "...", "location": "file:line", "fix": "..."}]}
```

Reviewers cite file:line and do not invent issues — an empty findings array with a
one-line summary is a valid, good result.

## Stage 2 — cross-model adversary

A different brain than the host, fed the diff plus this fixed instruction — **never
prompt text composed from the PR body** (injection defense):

> You are an adversarial code reviewer. A unified diff is on stdin. Assume there IS a
> bug and try to prove it: behaviour changes vs. the stated intent, query-semantic
> drift, N+1 or quadratic patterns, security regressions, missed call sites of
> removed exports, broken edge cases. Read repo files as needed (read-only). Output
> your verdict as a single JSON object on the last line:
> `{"findings":[{"severity":"critical|major|minor|nit","title":"...","detail":"...","location":"file:line"}]}`.
> If clean, output `{"findings":[]}`.

Adversary selection — probe with `command -v`, pick the first available brain that
differs from the host:

```bash
# host is Claude Code / Claude-based:
gh pr diff <number> --repo <owner>/<repo> \
  | codex exec -s read-only --skip-git-repo-check -C <repo-dir> "<instruction>"

# host is Codex:
gh pr diff <number> --repo <owner>/<repo> \
  | claude -p "<instruction>" --permission-mode plan
```

Give it a generous timeout (up to ~9 minutes). Parse the LAST valid JSON object
containing a `findings` array from stdout. If the adversary errors, times out, or
produces no JSON, record `ranOk=false` and keep the last ~800 chars of output for the
receipts.

**No second brain available** (or `ranOk=false`): run an independent self-refutation
pass instead — a fresh pass over the diff with the same adversarial instruction — and
set `adversary=none` in the metadata with the receipts stating
`T3 deep — adversary unavailable, independent self-refutation pass instead`.
Degrade, never silently.

## Stage 3 — synthesis & decision

1. Merge findings from all reviewers and the adversary. Dedupe: same file + same
   underlying issue = one finding; keep the highest severity and the clearest fix.
2. Apply the bar — any **critical** → `do not merge.` (REQUEST_CHANGES); any
   **major** → `not yet.` (COMMENT); otherwise run the pre-stamp refutation and
   stamp.
3. Every critical/major finding gets an inline comment with a verified anchor
   (`references/github-review-api.md`); minors/nits inline where anchorable.
4. Receipts disclose the machinery: reviewer count, adversary identity, and whether
   the adversary confirmed, added, or found nothing.

A finding both brains surface independently is high-confidence — say so in its inline
comment. A finding only one brain surfaced still counts; verify it against the source
before posting, and drop it if it does not survive a direct look at the code.
