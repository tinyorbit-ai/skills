# Loop Mode — sweep, isolation, ledger

How lizard runs unattended: on a `/loop`, a scheduled routine, or any host's cron.
Session mode (reviewing one PR in an interactive session) needs none of this except
the ledger append.

## Sweep

Find the queue, then run the per-PR procedure (SKILL.md) on each:

```bash
gh search prs --review-requested=@me --state=open \
  --json repository,number,title,url,updatedAt
```

Optionally add explicitly configured repos (e.g. your own open PRs in repos you
sweep):

```bash
gh pr list --repo <owner>/<repo> --state open --json number,title,url,updatedAt
```

Process most-recently-updated first. Dedup (`references/dedup.md`) makes visiting an
already-reviewed PR nearly free.

## Economics

- **Debounce 10 minutes** — skip a PR whose last push is less than 10 minutes old; a
  flurry of fixup pushes costs one review, not five. (`gh pr view --json
  headRefOid,updatedAt` plus the head commit's date.)
- **Max 3 full T3 fan-outs per PR per day** — count from today's ledger entries.
  After that, delta-only re-reviews (`references/dedup.md`); the full fan-out returns
  only if the delta itself would classify T3 on its own.
- Identical diffs are always skipped by fingerprint, regardless of anything above.
- Prefer reviewing after CI concludes when checks are pending and recent — a failing
  test is free review signal. Never wait more than one sweep cycle for it.

## Isolation

Loop runs never touch a user's working checkout. One shared object store per repo,
one detached worktree per run:

```bash
repo_dir=~/.lizard/repos/<host>/<owner>/<repo>     # lowercase-normalized key
mkdir -p "$repo_dir" ~/.lizard/runs
git init "$repo_dir" 2>/dev/null
git -C "$repo_dir" remote add origin <repo-url> 2>/dev/null \
  || git -C "$repo_dir" remote set-url origin <repo-url>

# reap runs abandoned >24h by crashed processes
find ~/.lizard/runs -mindepth 1 -maxdepth 1 -mtime +0 -exec rm -rf {} + 2>/dev/null
git -C "$repo_dir" worktree prune

# fetch only after dedup says this PR needs review
git -C "$repo_dir" fetch --no-tags --depth=1 origin \
  +pull/<number>/head:refs/remotes/origin/pr-<number>
git -C "$repo_dir" fetch --no-tags --depth=1 origin \
  +<base-ref>:refs/remotes/origin/base-<number>

run="$(mktemp -d ~/.lizard/runs/<number>-XXXXXX)"
git -C "$repo_dir" worktree add --detach "$run/wt" refs/remotes/origin/pr-<number>
```

The leading `+` only permits refreshing the local temp ref after a force-push — never
permission to push anywhere. Exploration is ref-based (`git -C "$repo_dir" show
refs/remotes/origin/pr-<number>:<path>`, `git grep`); the worktree isolates per-run
scratch (`$run`) for payload files. Remove the worktree and `$run` as the last step;
crashed runs are covered by the startup reap.

**Fetch shape matters.** `--depth=1` with **no partial-clone filter** downloads the
PR tree's blobs as one pack, so every later `git grep` / `git show` is local and
instant. Never use `--filter=blob:none` (nor `gh repo clone -- --filter=blob:none`):
a reviewer's access pattern is "read many files across one tree", and a blobless
store turns each read into a network round trip — one tree-wide grep can fault
thousands of blobs one by one. Successive PR fetches into the same store share
objects, so only the first is big.

**Fast reads.** For repo-wide convention questions on the default branch ("is this
pattern consumed anywhere?"), prefer server-side search over local grep — instant,
no blobs:

```bash
gh search code --repo <owner>/<repo> '<term>' --limit 30 --json path
```

It indexes the default branch only; search the PR head locally against the fetched
ref. Scope local greps with pathspecs to the subsystems the diff touches
(`git grep <pattern> refs/remotes/origin/pr-<n> -- 'services/**'`) before going
tree-wide.

Do not set EXIT traps for cleanup — the review spans many shell invocations and a
trap fires when its own invocation exits.

Concurrency stance: **fail open.** Two concurrent runs on the same PR may both post;
an occasional duplicate beats a lock that strands a PR unreviewed. Retry once on
`FETCH_HEAD.lock` collisions in the shared store.

## Ledger & calibration

Confidence is earned, not declared. Two mechanisms:

**Review records** — after every posted review, append one line to
`~/.lizard/ledger/<host>/<owner>/<repo>.md`:

```text
2026-07-04 PR#4242 verdict=go tier=standard adversary=none head=9fb2ddf
```

**Miss detection** — once per sweep per repo, check recently merged PRs that lizard
stamped (`verdict=go` in the ledger, PR now merged):

- A revert referencing the merge commit, or
- a subsequent PR titled/labeled fix/hotfix that predominantly touches the same
  files within ~14 days of the merge.

Both are heuristics — when one fires, read the candidate PR and judge whether it
actually corrects something the stamped PR broke. If yes, append a miss record:

```text
2026-07-04 MISS PR#4242 (stamped 2026-06-28) — reverted by PR#4290. Missed: findOneAndUpdate returned the old doc; review read the write path but not the caller's use of the return value.
```

…and distill the lesson into a blind-spot entry (below). **Every review loads
blind-spots.md** and checks its lessons against the current diff — the stamp gets
measurably better, or you find out it isn't.

## Blind-spot entries

Writing one is **mandatory** on any detected miss, any retro grading below
near-miss, and any user-provided incident correlation — never optional, never
deferred. Format for `~/.lizard/blind-spots.md`, one entry per lesson, deduped:

```markdown
- **missed pattern** — the production failure shape the review didn't catch
  **why the criteria failed** — which check existed but didn't fire, or didn't exist
  **trigger signals** — file paths / diff shapes that must raise it next time
  **required proof** — the evidence that clears it (index, explain plan, limit check…)
  **example** — repo + path pattern from the miss
```

## Retro mode

`lizard retro <n> <n> ...` reviews already-merged PRs for calibration, not
gatekeeping — it never posts to GitHub. The most valuable signal is post-merge
history, so gather it **before** judging anything:

```bash
gh search prs --repo <owner>/<repo> '<pr-number>' --merged --json number,title,url
git log --oneline --grep='<pr-number>' --grep='revert' --grep='hotfix' -i <base-ref>
```

Per PR:

1. Find reverts, hotfixes, incident/follow-up PRs, deploy fixes, and
   monitoring references (Datadog/Sentry links) that name the PR or
   predominantly touch its files.
2. Run the normal review of the PR as it was merged.
3. Grade the original outcome against reality: **caught / near miss / wrong
   mechanism / unrelated / complete miss**. "Wrong mechanism" counts as a miss —
   flagging the right file for the wrong reason wouldn't have prevented the
   incident.
4. Write the blind-spot entries and a calibration summary (grades per PR, the
   pattern across them).
