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
               "why": "plain-English consequence and concrete failure path",
               "location": "file:line", "fix": "smallest safe change",
               "provenance": "introduced-by-pr|worsened-by-pr|newly-reachable|required-for-outcome|introduced-by-author-fix|introduced-by-lizard-fix|pre-existing|scope-expansion",
               "base_behavior": "what happens without this PR",
               "scope_cost": "local|expanding"}]}
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
> `{"findings":[{"severity":"critical|major|minor|nit","title":"...","why":"plain-English consequence and concrete failure path","location":"file:line","fix":"smallest safe change","provenance":"...","base_behavior":"...","scope_cost":"local|expanding"}]}`.
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
pass instead — and it is real work, not a receipts annotation. Walk the diff under
the same adversarial instruction and produce the same findings JSON, or an explicit
list of the refutations attempted and why each failed. Only then set
`adversary=none` with the receipts stating
`T3 deep — adversary unavailable, independent self-refutation pass instead`.
A receipt note without the pass is not degradation, it is omission — no refutation
pass, no verdict. Degrade, never silently.

## Stage 3 — synthesis & decision

1. Merge findings from all reviewers and the adversary. Dedupe: same file + same
   underlying issue = one finding; keep the clearest proof and smallest safe fix.
2. Apply the causal-scope and economy gates in `scope.md` before severity. Drop
   unproven claims; move `pre-existing` issues to non-blocking follow-ups. If the
   scope brake fires, reconsider the earlier remedy instead of designing more parts.
3. Run the first-pass closure sweep in `scope.md`: full changed-file inventory,
   criteria, focus packs, call sites, and existing review threads. Independently
   verify every remaining candidate.
4. Apply the bar — any **critical** → `do not merge.` (REQUEST_CHANGES); any
   **major** → `not yet.` (COMMENT); otherwise run the pre-stamp refutation and
   stamp.
5. Every critical/major finding gets an inline comment with a verified anchor and
   the required short title, `Why:`, and `Fix:` structure
   (`references/github-review-api.md`); minors/nits inline where anchorable.
6. Receipts disclose the machinery, provenance mix, baseline/current scope, and
   whether the scope brake fired.

A finding both brains surface independently is high-confidence — say so in its inline
comment. A finding only one brain surfaced still counts; verify it against the source
before posting, and drop it if it does not survive a direct look at the code.

## Dependency & runtime upgrades

An upgrade touching DB clients/ORMs, tracing/APM, queue clients, serverless
packaging, or native modules is always T3 — and changed-hunk review is not enough:
the risk lives in unchanged consumer code whose runtime assumptions the upgrade
shifts. Build a **consumer matrix** before judging, and put it in the receipts:

- Which services, Lambdas, workers, scripts, and tests consume the upgraded
  package? Grep imports repo-wide; list them.
- Which consumers initialize clients at **module scope**, and what happens to a
  warm container/worker when that init fails once? A cached connection/client
  promise that keeps a rejection poisons every later invocation — it must clear on
  rejection, or the PR needs evidence the failure cannot persist.
- Do failed connections retry, and with what behavior under the new version?
- Are native deps still bundled, layered, externalized, or runtime-available?
- Which library defaults changed between the versions, and is each one explicitly
  preserved or intentionally adopted? Read the changelog/migration guide — a PR
  body claiming "no breaking changes" is a claim to verify, not evidence.
