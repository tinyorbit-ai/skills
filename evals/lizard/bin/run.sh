#!/usr/bin/env bash
# run.sh — execute lizard --dry-run against each fixture PR and capture the payload.
#
#   run.sh [--run-id ID] [case-id ...]
#
# With no case-ids, runs every case in cases.json. For each case it:
#   1. resolves the PR url from fixtures/prs.json (bootstrap.sh writes it);
#   2. builds an isolated scratch project whose .claude/skills/lizard symlinks the
#      REPO WORKING TREE's skill (evals test the current edit, not an installed copy);
#   3. runs headless `claude -p "... lizard <url> --dry-run"` with an isolated
#      LIZARD_HOME so runs never dedup against each other or your real ledger;
#   4. captures combined output to results/<run-id>/<case>.txt and extracts the
#      JSON between LIZARD_PAYLOAD_BEGIN/END to <case>.payload.json (jq-validated).
#
# A missing/invalid payload is a per-case error — it is recorded and the run
# continues with the remaining cases. Nothing is posted to GitHub (--dry-run).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$EVAL_DIR/../.." && pwd)"
SKILL_SRC="$REPO_ROOT/skills/lizard"
CASES_JSON="$EVAL_DIR/cases.json"
PRS_JSON="$EVAL_DIR/fixtures/prs.json"

TIMEOUT_SECS="${LIZARD_EVAL_TIMEOUT:-900}"   # 15 min hard cap per case
JOBS="${LIZARD_EVAL_JOBS:-5}"                # cases reviewed concurrently

die() { printf 'run.sh: %s\n' "$*" >&2; exit 1; }

[ -f "$CASES_JSON" ] || die "no cases.json at $CASES_JSON"
[ -d "$SKILL_SRC" ]  || die "no skill at $SKILL_SRC"
command -v claude >/dev/null 2>&1 || die "the 'claude' CLI is not on PATH"
command -v jq >/dev/null 2>&1 || die "jq is required"

# Portable hard timeout: prefer coreutils timeout, else perl's alarm+exec.
run_with_timeout() {
  local secs="$1"; shift
  if command -v timeout >/dev/null 2>&1; then
    timeout "$secs" "$@"
  elif command -v gtimeout >/dev/null 2>&1; then
    gtimeout "$secs" "$@"
  else
    perl -e 'alarm shift; exec @ARGV' "$secs" "$@"
  fi
}

# --- args --------------------------------------------------------------------
RUN_ID=""
CASE_IDS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --run-id) RUN_ID="${2:-}"; shift 2 ;;
    --run-id=*) RUN_ID="${1#*=}"; shift ;;
    -h|--help) grep -E '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) die "unknown flag: $1" ;;
    *) CASE_IDS+=("$1"); shift ;;
  esac
done
[ -n "$RUN_ID" ] || RUN_ID="$(date +%Y%m%d-%H%M%S)"

# Default to every case in cases.json (bash 3.2 empty-array-safe expansion).
if [ "${#CASE_IDS[@]}" -eq 0 ]; then
  while IFS= read -r id; do CASE_IDS+=("$id"); done < <(jq -r '.[].id' "$CASES_JSON")
fi
[ "${#CASE_IDS[@]}" -gt 0 ] || die "no cases to run"

RESULTS_DIR="$EVAL_DIR/results/$RUN_ID"
mkdir -p "$RESULTS_DIR"

MODEL="${LIZARD_EVAL_MODEL:-default}"
jq -n --arg run "$RUN_ID" --arg model "$MODEL" --arg at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --argjson cases "$(printf '%s\n' "${CASE_IDS[@]}" | jq -R . | jq -s .)" \
  '{run_id:$run, model:$model, started_at:$at, cases:$cases}' \
  > "$RESULTS_DIR/run-meta.json"

printf 'run-id=%s  model=%s  cases=%d  results=%s\n' \
  "$RUN_ID" "$MODEL" "${#CASE_IDS[@]}" "$RESULTS_DIR"

# --- per-case ----------------------------------------------------------------
errors=0

process_case() {
  # Runs one case; returns 0 on a captured payload, 1 on a case error.
  local id="$1"
  local out_txt="$RESULTS_DIR/$id.txt"
  local payload_json="$RESULTS_DIR/$id.payload.json"

  if [ ! -f "$PRS_JSON" ]; then
    printf '%-28s ERROR — no fixtures/prs.json; run fixtures/bootstrap.sh first\n' "$id"
    return 1
  fi
  local url
  url="$(jq -r --arg id "$id" '.[$id].url // empty' "$PRS_JSON")"
  if [ -z "$url" ]; then
    printf '%-28s ERROR — %s not in fixtures/prs.json; run fixtures/bootstrap.sh first\n' "$id" "$id"
    return 1
  fi

  # Isolated scratch: separate LIZARD_HOME + a project whose skill is the working tree.
  local scratch proj
  scratch="$(mktemp -d "${TMPDIR:-/tmp}/lizard-run.XXXXXX")"
  proj="$scratch/project"
  mkdir -p "$proj/.claude/skills" "$scratch/home"
  ln -s "$SKILL_SRC" "$proj/.claude/skills/lizard"

  local model_args=()
  [ -n "${LIZARD_EVAL_MODEL:-}" ] && model_args=(--model "$LIZARD_EVAL_MODEL")

  local prompt="Use the lizard skill to review this PR: lizard $url --dry-run
After the dry-run report, you MUST end your output with this exact structure, filled with your actual values:
LIZARD_PAYLOAD_BEGIN
{\"event\":\"APPROVE|COMMENT|REQUEST_CHANGES\",\"body\":\"<the full review body>\",\"comments\":[{\"path\":\"...\",\"line\":1,\"side\":\"RIGHT\",\"body\":\"...\"}]}
LIZARD_PAYLOAD_END
One raw JSON object, no code fence, exactly these keys. When the approval would post as a stamp-as-comment (self-authored PR), keep event APPROVE and add \"comment\": true — never emit the raw issue-comment POST shape or any other structure."

  # Capture combined stdout+stderr. A non-zero exit (incl. timeout) still lets us
  # try to extract a payload; missing payload is the real error condition.
  (
    cd "$proj"
    export LIZARD_HOME="$scratch/home"
    run_with_timeout "$TIMEOUT_SECS" \
      claude -p "$prompt" --permission-mode bypassPermissions \
      "${model_args[@]+"${model_args[@]}"}"
  ) > "$out_txt" 2>&1 || true

  # Extract the LAST complete BEGIN..END block, strip any stray code fences.
  local payload_raw="$scratch/payload.raw"
  awk '
    /LIZARD_PAYLOAD_BEGIN/ { buf=""; cap=1; next }
    /LIZARD_PAYLOAD_END/   { last=buf; cap=0; next }
    cap { buf = buf $0 "\n" }
    END { printf "%s", last }
  ' "$out_txt" > "$payload_raw"
  grep -v '^[[:space:]]*```' "$payload_raw" > "$payload_json" 2>/dev/null || cp "$payload_raw" "$payload_json"

  rm -rf "$scratch"

  if [ ! -s "$payload_json" ]; then
    printf '%-28s ERROR — no LIZARD_PAYLOAD block in output (see %s)\n' "$id" "$id.txt"
    rm -f "$payload_json"
    return 1
  fi
  if ! jq empty "$payload_json" >/dev/null 2>&1; then
    printf '%-28s ERROR — payload is not valid JSON (see %s)\n' "$id" "$id.txt"
    return 1
  fi
  local event
  event="$(jq -r '.event // "?"' "$payload_json")"
  printf '%-28s ok — event=%s\n' "$id" "$event"
  return 0
}

# Cases are independent by construction — each gets its own scratch project and its
# own LIZARD_HOME — so they run concurrently. Batched rather than a rolling window:
# bash 3.2 (macOS) has no `wait -n`. Failures are recorded as marker files because a
# backgrounded subshell cannot increment a counter in this shell.
fail_dir="$(mktemp -d "${TMPDIR:-/tmp}/lizard-fails.XXXXXX")"
batch=0
for id in "${CASE_IDS[@]}"; do
  ( process_case "$id" || : > "$fail_dir/$id" ) &
  batch=$((batch+1))
  if [ "$batch" -ge "$JOBS" ]; then wait; batch=0; fi
done
wait
errors="$(find "$fail_dir" -type f | wc -l | tr -d ' ')"
rm -rf "$fail_dir"

printf 'done. %d case(s), %d error(s). grade with: bin/grade.mjs --run-id %s\n' \
  "${#CASE_IDS[@]}" "$errors" "$RUN_ID"
# Exit non-zero only if every case errored (nothing to grade); partial errors are
# recorded and left for grade.mjs to weigh.
[ "$errors" -lt "${#CASE_IDS[@]}" ]
