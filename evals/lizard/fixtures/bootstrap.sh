#!/usr/bin/env bash
#
# bootstrap.sh — build the lizard planted-fixture repo and open its case PRs.
#
# Idempotent: creates the public repo tinyorbit-ai/lizard-fixtures if missing,
# seeds main from base/, and for each case under cases/ opens a branch + PR the
# first time. Re-running skips branches/PRs that already exist and always
# regenerates prs.json from `gh pr list`.
#
# Never run by the eval runner — the human (or the orchestrator) runs this once to
# stand the fixtures up. lizard only ever reads these PRs; nothing here is executed
# by the code under review.
#
# Env:
#   LIZARD_FIXTURES_REPO   override target repo (default tinyorbit-ai/lizard-fixtures)
#   FORCE_REFRESH=1        delete + recreate every case branch/PR (use after editing
#                          a fixture; destroys and reopens the PRs)
#
set -euo pipefail

REPO="${LIZARD_FIXTURES_REPO:-tinyorbit-ai/lizard-fixtures}"

FIX_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$FIX_DIR/base"
CASES_DIR="$FIX_DIR/cases"

command -v gh >/dev/null 2>&1 || { echo "error: gh (GitHub CLI) is required" >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "error: jq is required" >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "error: gh is not authenticated (run: gh auth login)" >&2; exit 1; }
[ -d "$BASE_DIR" ]  || { echo "error: base tree not found at $BASE_DIR" >&2; exit 1; }
[ -d "$CASES_DIR" ] || { echo "error: cases dir not found at $CASES_DIR" >&2; exit 1; }

WORK="$(mktemp -d "${TMPDIR:-/tmp}/lizard-fixtures.XXXXXX")"
# Scratch for generated metadata (PR bodies). Deliberately OUTSIDE $WORK: the
# two-round path opens the PR between its two commits, so anything written into the
# clone would be swept into round 2 by `git add -A` and show up in the fixture diff.
META="$(mktemp -d "${TMPDIR:-/tmp}/lizard-meta.XXXXXX")"
cleanup() { rm -rf "$WORK" "$META"; }
trap cleanup EXIT

log() { printf '\033[36m•\033[0m %s\n' "$*"; }

# --- helpers ---------------------------------------------------------------

# Copy every file in $1 into tree $2, preserving relative paths.
copy_tree() {
  local from="${1%/}" into="$2" src rel
  find "$from" -type f -print0 | while IFS= read -r -d '' src; do
    rel="${src#"$from"/}"
    mkdir -p "$into/$(dirname "$rel")"
    cp "$src" "$into/$rel"
  done
}

# Apply a case overlay ($1) onto tree $2: copy every file except the case's own
# metadata (pr.md / _delete / thread.json) and the round1/ overlay, then honour a
# _delete list of repo-relative paths to remove (blank/# lines skipped).
apply_overlay() {
  local case_dir="${1%/}" dest="$2" src rel path
  find "$case_dir" -type f ! -name 'pr.md' ! -name '_delete' ! -name 'thread.json' \
      ! -path "$case_dir/round1/*" -print0 \
    | while IFS= read -r -d '' src; do
        rel="${src#"$case_dir"/}"
        mkdir -p "$dest/$(dirname "$rel")"
        cp "$src" "$dest/$rel"
      done
  if [ -f "$case_dir/_delete" ]; then
    while IFS= read -r path; do
      [ -z "$path" ] && continue
      case "$path" in \#*) continue ;; esac
      git -C "$dest" rm -q --ignore-unmatch "$path" >/dev/null 2>&1 || rm -f "$dest/$path"
    done < "$case_dir/_delete"
  fi
}

remote_branch_exists() { git -C "$WORK" ls-remote --exit-code --heads origin "$1" >/dev/null 2>&1; }

open_pr_number() {
  gh pr list --repo "$REPO" --head "$1" --state open --json number --jq '.[0].number // empty' 2>/dev/null || true
}

# ensure_pr <id> <branch> <title> <case_dir> — open the PR if it is not already open.
ensure_pr() {
  local id="$1" branch="$2" title="$3" case_dir="$4" body_file
  if [ -n "$(open_pr_number "$branch")" ]; then
    log "[$id] PR already open, skipping create"
    return
  fi
  body_file="$META/pr-body-$id.md"
  tail -n +2 "$case_dir/pr.md" | sed '1{/^$/d;}' > "$body_file"
  log "[$id] opening PR"
  gh pr create --repo "$REPO" --base main --head "$branch" \
    --title "$title" --body-file "$body_file" >/dev/null
}

# 1-based line number of the first line in <file> containing <substring>.
line_of_match() {
  local file="$1" needle="$2" n
  n="$(grep -n -F -m1 -- "$needle" "$file" | cut -d: -f1)"
  [ -n "$n" ] || { echo "error: anchor_match not found in $file: $needle" >&2; exit 1; }
  echo "$n"
}

# seed_round1_review <id> <pr_number> <case_dir> <round1_head> — post the prior
# lizard review (body + one inline finding) against the round-1 commit, so the case
# exercises delta re-review rather than a first pass.
seed_round1_review() {
  local id="$1" pr="$2" case_dir="$3" head="$4" thread="$3/thread.json"
  local path anchor line body comment
  path="$(jq -r .path "$thread")"
  anchor="$(jq -r .anchor_match "$thread")"
  line="$(line_of_match "$case_dir/round1/$path" "$anchor")"
  body="$(jq -r .review_body "$thread" | sed "s/__ROUND1_HEAD__/$head/g")"
  comment="$(jq -r .comment_body "$thread")"

  log "[$id] seeding round-1 review on PR #$pr ($path:$line)"
  jq -n --arg body "$body" --arg commit "$head" --arg path "$path" \
        --argjson line "$line" --arg comment "$comment" \
    '{body: $body, commit_id: $commit, event: "COMMENT",
      comments: [{path: $path, line: $line, side: "RIGHT", body: $comment}]}' \
    | gh api --silent --method POST "repos/$REPO/pulls/$pr/reviews" --input - \
    || { echo "error: [$id] failed to seed round-1 review" >&2; exit 1; }
}

# seed_author_reply <id> <pr_number> <case_dir> — reply to the seeded finding as the
# author would, disputing it with evidence.
seed_author_reply() {
  local id="$1" pr="$2" case_dir="$3" thread="$3/thread.json"
  local reply comment_id
  reply="$(jq -r .reply_body "$thread")"
  comment_id="$(gh api "repos/$REPO/pulls/$pr/comments" --jq '.[0].id // empty')"
  [ -n "$comment_id" ] || { echo "error: [$id] no review comment to reply to" >&2; exit 1; }

  log "[$id] seeding author dispute reply on comment $comment_id"
  gh api --silent --method POST \
    "repos/$REPO/pulls/$pr/comments/$comment_id/replies" \
    -f body="$reply" \
    || { echo "error: [$id] failed to seed author reply" >&2; exit 1; }
}

# --- ensure repo + main ----------------------------------------------------

if gh repo view "$REPO" >/dev/null 2>&1; then
  log "repo $REPO already exists"
else
  log "creating public repo $REPO"
  gh repo create "$REPO" --public \
    --description "Synthetic planted-defect PRs for the lizard eval harness (see tinyorbit-ai/skills evals/lizard)." >/dev/null
fi

log "cloning $REPO"
git clone --quiet "https://github.com/$REPO.git" "$WORK"
git -C "$WORK" config user.name  "$(git config user.name  || echo lizard-fixtures)"
git -C "$WORK" config user.email "$(git config user.email || echo lizard-fixtures@users.noreply.github.com)"

log "seeding main from base/"
git -C "$WORK" checkout -q -B main
copy_tree "$BASE_DIR" "$WORK"
git -C "$WORK" add -A
if git -C "$WORK" diff --cached --quiet; then
  log "main already up to date"
else
  git -C "$WORK" commit -q -m "chore: seed orbitcart base"
fi
git -C "$WORK" push -q -u origin main
gh repo edit "$REPO" --default-branch main >/dev/null 2>&1 || true

# --- per-case branches + PRs ----------------------------------------------

for case_path in "$CASES_DIR"/*/; do
  [ -d "$case_path" ] || continue
  id="$(basename "$case_path")"
  branch="case/$id"
  [ -f "$case_path/pr.md" ] || { echo "warn: $id has no pr.md, skipping" >&2; continue; }
  title="$(head -n 1 "$case_path/pr.md")"

  if [ "${FORCE_REFRESH:-0}" = "1" ]; then
    existing="$(open_pr_number "$branch")"
    [ -n "$existing" ] && { log "[$id] FORCE_REFRESH: closing PR #$existing"; gh pr close "$existing" --repo "$REPO" --delete-branch >/dev/null 2>&1 || true; }
    remote_branch_exists "$branch" && { log "[$id] FORCE_REFRESH: deleting branch"; git -C "$WORK" push -q origin --delete "$branch" >/dev/null 2>&1 || true; }
  fi

  # A case with round1/ + thread.json is a TWO-ROUND fixture: it needs the PR to
  # exist, carry a prior lizard review, and only then receive the fixed head, so
  # the branch build and the PR create interleave. Single-round cases keep the
  # original order (build everything, then open the PR).
  two_round=0
  [ -d "$case_path/round1" ] && [ -f "$case_path/thread.json" ] && two_round=1

  if remote_branch_exists "$branch"; then
    log "[$id] branch exists, skipping build"
    [ "$two_round" = "1" ] && log "[$id] two-round fixture already seeded, skipping thread"
    ensure_pr "$id" "$branch" "$title" "$case_path"
  elif [ "$two_round" = "1" ]; then
    log "[$id] building two-round branch $branch"
    git -C "$WORK" checkout -q -f main
    git -C "$WORK" clean -qfd
    git -C "$WORK" checkout -q -B "$branch" main

    # Round 1 — the state the prior review objected to.
    apply_overlay "$case_path/round1" "$WORK"
    git -C "$WORK" add -A
    git -C "$WORK" diff --cached --quiet && echo "warn: $id round1 overlay produced no diff" >&2
    git -C "$WORK" commit -q -m "$title"
    git -C "$WORK" push -q -u origin "$branch"
    round1_head="$(git -C "$WORK" rev-parse HEAD)"

    ensure_pr "$id" "$branch" "$title" "$case_path"
    pr_number="$(open_pr_number "$branch")"
    seed_round1_review "$id" "$pr_number" "$case_path" "$round1_head"

    # Round 2 — the author's fix, which becomes the head lizard actually reviews.
    apply_overlay "$case_path" "$WORK"
    git -C "$WORK" add -A
    git -C "$WORK" diff --cached --quiet && echo "warn: $id round2 overlay produced no diff" >&2
    git -C "$WORK" commit -q -m "fix: address review feedback on $title"
    git -C "$WORK" push -q origin "$branch"

    seed_author_reply "$id" "$pr_number" "$case_path"
  else
    log "[$id] building branch $branch"
    git -C "$WORK" checkout -q -f main
    git -C "$WORK" clean -qfd
    git -C "$WORK" checkout -q -B "$branch" main
    apply_overlay "$case_path" "$WORK"
    git -C "$WORK" add -A
    if git -C "$WORK" diff --cached --quiet; then
      echo "warn: $id overlay produced no diff against main" >&2
    fi
    git -C "$WORK" commit -q -m "$title"
    git -C "$WORK" push -q -u origin "$branch"
    ensure_pr "$id" "$branch" "$title" "$case_path"
  fi
done

# --- regenerate prs.json ---------------------------------------------------

log "writing prs.json"
gh pr list --repo "$REPO" --state open --limit 200 --json number,url,headRefName \
  | jq 'map(select(.headRefName | startswith("case/")))
        | map({ (.headRefName | ltrimstr("case/")): { number: .number, url: .url } })
        | add // {}' > "$FIX_DIR/prs.json"

echo
log "done — $REPO"
repo_url="$(gh repo view "$REPO" --json url --jq .url 2>/dev/null || echo "https://github.com/$REPO")"
echo "  repo: $repo_url"
jq -r 'to_entries[] | "  \(.key): \(.value.url)"' "$FIX_DIR/prs.json" 2>/dev/null || true
echo
echo "  manifest: $FIX_DIR/prs.json"
