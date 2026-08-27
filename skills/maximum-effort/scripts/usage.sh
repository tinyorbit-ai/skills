#!/usr/bin/env bash
# One scorecard for both pools over the last N days (default 7): model split, cache-read
# share, subscription headroom, and maximum-effort task outcomes.
# Usage: usage.sh [days]
set -euo pipefail

days="${1:-7}"
since=$(date -v-"$days"d +%Y%m%d 2>/dev/null || date -d "$days days ago" +%Y%m%d)
cutoff=$(( $(date +%s) - days * 86400 ))
status=0

echo "maximum-effort scorecard — last $days days (since $since)"
echo
echo "── Claude Code ──────────────────────────────────────────"
if command -v ccusage >/dev/null 2>&1; then
  ccusage daily --json --breakdown --since "$since" 2>/dev/null | jq -r '
    [.daily[].modelBreakdowns[]]
    | group_by(.modelName)
    | map({m: .[0].modelName, out: (map(.outputTokens) | add), cost: (map(.cost) | add)})
    | (map(.out) | add | if . == 0 then 1 else . end) as $tot
    | sort_by(-.out)[]
    | "\(.m | .[0:22] | . + " " * (22 - length))  out \(.out | tostring | . + " " * (11 - length))  \(.out * 100 / $tot | floor)%   $\(.cost | floor)"'
  ccusage daily --json --since "$since" 2>/dev/null | jq -r '
    .totals
    | "cache-read share: \(.cacheReadTokens * 100 / (.totalTokens | if . == 0 then 1 else . end) | floor)% of \(.totalTokens) tokens"'
else
  echo "ccusage not installed — npm i -g ccusage"
fi
rl="$HOME/.claude/rate-limits.json"
if [ -s "$rl" ]; then
  jq -r '"7-day \(.seven_day.used_percentage // "?")% · 5-hour \(.five_hour.used_percentage // "?")% · as of \(.ts | todate) · \(.model // "?") \(.effort // "")"' "$rl"
else
  echo "no $rl yet — the statusline writes it on its next refresh"
fi

echo
echo "── Codex ────────────────────────────────────────────────"
files=$(find "$HOME/.codex/sessions" -name '*.jsonl' -mtime -"$days" 2>/dev/null | sort || true)
if [ -z "$files" ]; then
  echo "no Codex sessions in window"
else
  # shellcheck disable=SC2086 — session paths carry no spaces
  printf '%s\n' $files | while read -r f; do
    jq -c 'select(.type == "turn_context") | {m: .payload.model, e: .payload.effort}' "$f" 2>/dev/null | head -1
  done | jq -s -r '
    if length == 0 then "FAIL: no turn_context in any session — log schema changed? fix usage.sh\n" | halt_error(2)
    else group_by(.m, .e) | sort_by(-length)[] | "\(.[0].m)@\(.[0].e)  \(length) sessions" end' || status=2
  latest=$(printf '%s\n' $files | xargs ls -t | head -1)
  limits=$(jq -r 'select(.payload.rate_limits != null) | .payload.rate_limits.primary | "7-day \(.used_percent)% · resets \(.resets_at | todate)"' "$latest" 2>/dev/null | tail -1)
  if [ -n "$limits" ]; then echo "$limits"; else echo "FAIL: no rate_limits in $latest — log schema changed? fix usage.sh"; status=2; fi
fi

echo
echo "── Ledger (~/.maximum-effort/ledger.jsonl) ──────────────"
led="$HOME/.maximum-effort/ledger.jsonl"
if [ -s "$led" ]; then
  jq -s -r --argjson c "$cutoff" '
    def epoch: if type == "number" then . else (sub("\\.[0-9]+"; "") | if length == 10 then . + "T00:00:00Z" else . end | fromdateiso8601?) // 0 end;
    map(select(((.ts // 0) | epoch) >= $c and ((.cwd // "") | test("forge-eval-") | not)))
    | if length == 0 then "no task runs in window" else
      (map(select(.owner_model != null))) as $tasks
      | (map(select(.owner_model == null))) as $legacy
      | "task runs \($tasks | length) · tasks \($tasks | map(.task) | unique | length) · blocked \($tasks | map(select(.outcome == "blocked")) | length) · rework \($tasks | map(select(.outcome == "rework")) | length)",
        "scouts \($tasks | map((.scouts // {}) | [.[]] | add // 0) | add // 0) · mechanics \($tasks | map((.mechanics // {}) | [.[]] | add // 0) | add // 0) · takeovers \($tasks | map(.takeovers // 0) | add // 0) · frontier reviews \($tasks | map(select(.review == "frontier" or .review == "lizard")) | length)",
        ($tasks | group_by(.owner_model, .owner_effort) | sort_by(-length)[] | "  owner\t\(.[0].owner_model)@\(.[0].owner_effort // "?")\t\(length)"),
        (if ($legacy | length) > 0 then "legacy lane rows \($legacy | length) — excluded from task metrics" else empty end)
      end' "$led"
else
  echo "empty — no tasks run yet"
fi

exit "$status"
