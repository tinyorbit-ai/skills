#!/usr/bin/env bash
# lint.sh — Layer-1 deterministic format checks for lizard review payloads.
#
#   lint.sh review <payload.json>   # check one dry-run/review payload
#   lint.sh field  [DIR]            # scan real ~/.lizard history (default ~/.lizard)
#
# Emits one line per check: "ok|FAIL|warn <check> — <detail>".
# Exits non-zero if any FAIL was emitted. No LLM, no network — pure jq + text.
#
# Contracts enforced here are the payload-checkable subset of the plan's Layer-1
# table, sourced from skills/lizard/SKILL.md and references/{context,dedup,
# github-review-api,loop-mode}.md. Judgment-only checks (groundedness, severity,
# scope ownership) belong to grade.mjs, not here.
set -euo pipefail

FAIL_COUNT=0
WARN_COUNT=0
OK_COUNT=0

TMPDIR_LINT="$(mktemp -d "${TMPDIR:-/tmp}/lizard-lint.XXXXXX")"
trap 'rm -rf "$TMPDIR_LINT"' EXIT

# Globals set by check_metadata for callers that need the parsed fields.
META_VERDICT=""
META_TIER=""
META_DIFF=""
META_CTX=""

META_RE='^[[:space:]]*<!-- lizard:v1 verdict=(go|wait|block) tier=(quick|standard|deep) adversary=(codex|claude|none) head=[^ ]+ diff=[^ ]+ context=[^ ]+ -->[[:space:]]*$'

emit() {
  # emit <ok|FAIL|warn> <check> <detail...>
  local status="$1" check="$2"; shift 2
  local detail="$*"
  printf '%s %s — %s\n' "$status" "$check" "$detail"
  case "$status" in
    FAIL) FAIL_COUNT=$((FAIL_COUNT+1)) ;;
    warn) WARN_COUNT=$((WARN_COUNT+1)) ;;
    ok)   OK_COUNT=$((OK_COUNT+1)) ;;
  esac
}

first_nonblank() { awk 'NF{print; exit}' "$1"; }
last_nonblank()  { awk 'NF{l=$0} END{print l}' "$1"; }

count_words_before_suggestion() {
  awk '
    /```suggestion/ || /````suggestion/ { exit }
    { for (i = 1; i <= NF; i++) c++ }
    END { print c + 0 }
  ' "$1"
}

# --- body-level checks -------------------------------------------------------

check_metadata() {
  # check_metadata <bodyfile> <label>; sets META_* globals.
  local f="$1" label="$2"
  META_VERDICT=""; META_TIER=""; META_DIFF=""; META_CTX=""
  local last; last="$(last_nonblank "$f")"
  if ! printf '%s' "$last" | grep -qE "$META_RE"; then
    # maybe a metadata line exists but isn't last, or is malformed
    if grep -qE '<!-- lizard:v1 ' "$f"; then
      emit FAIL "metadata($label)" "metadata line present but malformed or not the final line"
    else
      emit FAIL "metadata($label)" "no lizard:v1 metadata line found"
    fi
    return
  fi
  META_VERDICT="$(printf '%s' "$last" | sed -E 's/.*verdict=([a-z]+).*/\1/')"
  META_TIER="$(printf '%s' "$last" | sed -E 's/.*tier=([a-z]+).*/\1/')"
  META_DIFF="$(printf '%s' "$last" | sed -E 's/.*diff=([^ ]+) context=.*/\1/')"
  META_CTX="$(printf '%s' "$last" | sed -E 's/.*context=([^ ]+) -->.*/\1/')"
  emit ok "metadata($label)" "verdict=$META_VERDICT tier=$META_TIER"
  if [ "$META_DIFF" = "unknown" ]; then
    emit warn "metadata($label)" "diff fingerprint is unknown (fetch fallback)"
  fi
  if [ "$META_CTX" = "unknown" ]; then
    emit warn "metadata($label)" "context fingerprint is unknown (fetch fallback)"
  fi
}

check_receipts() {
  # <details> → <summary> → two-column table (|---|---|) → </details>, all present.
  local f="$1" label="$2"
  local ok=1
  grep -q '<details>'  "$f" || ok=0
  grep -q '<summary'   "$f" || ok=0
  grep -q '</details>' "$f" || ok=0
  grep -qE '^\|[-]{3,}\|[-]{3,}\|$|^\|[[:space:]]*-+[[:space:]]*\|[[:space:]]*-+[[:space:]]*\|$' "$f" || ok=0
  if [ "$ok" -eq 1 ]; then
    emit ok "receipts($label)" "collapsed <details> block with two-column table present"
  else
    emit FAIL "receipts($label)" "missing <details>/<summary>/two-column-table/</details> receipts block"
  fi
}

check_no_plain_receipts() {
  # A plain "Receipts:" heading or bullet (capital R + colon) is invalid; the
  # only allowed receipts container is the <details> block. The <summary> text
  # is lowercase "lizard receipts — what was checked", so it never matches.
  local f="$1" label="$2"
  if grep -nE '^[[:space:]]*([-*#>]+[[:space:]]*)?\**Receipts:' "$f" >/dev/null 2>&1; then
    emit FAIL "no-plain-receipts($label)" "found a plain 'Receipts:' heading/bullet — use the <details> block"
  else
    emit ok "no-plain-receipts($label)" "no plain 'Receipts:' heading/bullet"
  fi
}

check_no_lizard_emoji() {
  # 🦎 must not appear in a non-approval body.
  local f="$1" label="$2"
  if grep -q '🦎' "$f"; then
    emit FAIL "no-emoji($label)" "🦎 appears in a non-approval body — the lizard rides only an approval"
  else
    emit ok "no-emoji($label)" "🦎 absent from non-approval body"
  fi
}

check_approve_body() {
  # Exactly 🦎 → receipts <details> → metadata line, nothing else.
  local f="$1" label="$2"
  local first; first="$(first_nonblank "$f")"
  if [ "$first" != "🦎" ]; then
    emit FAIL "approve-body($label)" "first content is not exactly 🦎 (got: ${first:0:40})"
  else
    emit ok "approve-body($label)" "body opens with a bare 🦎"
  fi
  # No prose between the 🦎 and the <details> block.
  local emoji_ln details_ln between
  emoji_ln="$(awk 'NF{print NR; exit}' "$f")"
  details_ln="$(awk '/<details>/{print NR; exit}' "$f")"
  if [ -n "$details_ln" ] && [ -n "$emoji_ln" ] && [ "$details_ln" -gt "$emoji_ln" ]; then
    between="$(awk -v a="$emoji_ln" -v b="$details_ln" 'NR>a && NR<b && NF{print}' "$f")"
    if [ -n "$between" ]; then
      emit FAIL "approve-body($label)" "prose between 🦎 and receipts — approval body must be stamp-only"
    fi
  fi
}

check_verdict_start() {
  # check_verdict_start <bodyfile> <label> <expected-prefix>
  local f="$1" label="$2" prefix="$3"
  local first; first="$(first_nonblank "$f")"
  case "$first" in
    "$prefix"*) emit ok "verdict-prefix($label)" "body starts '$prefix'" ;;
    *)          emit FAIL "verdict-prefix($label)" "body must start '$prefix' (got: ${first:0:40})" ;;
  esac
  if grep -qE '^[[:space:]]*(\*\*)?Why:' "$f"; then
    emit ok "why-section($label)" "Why: section present"
  else
    emit FAIL "why-section($label)" "non-approval body missing a Why: section"
  fi
}

# Runs every body-level check for a given (event, bodyfile). event is one of
# APPROVE / COMMENT / REQUEST_CHANGES / UNKNOWN.
run_body_checks() {
  local f="$1" event="$2" label="$3"
  check_metadata "$f" "$label"
  check_receipts "$f" "$label"
  check_no_plain_receipts "$f" "$label"
  case "$event" in
    APPROVE)
      check_approve_body "$f" "$label"
      ;;
    COMMENT)
      check_no_lizard_emoji "$f" "$label"
      check_verdict_start "$f" "$label" "not yet."
      ;;
    REQUEST_CHANGES)
      check_no_lizard_emoji "$f" "$label"
      check_verdict_start "$f" "$label" "do not merge."
      ;;
    *)
      emit warn "event($label)" "could not infer verdict from body; ran generic checks only"
      ;;
  esac
  # verdict <-> event mapping (only meaningful when both known)
  if [ -n "$META_VERDICT" ] && [ "$event" != "UNKNOWN" ]; then
    local want=""
    case "$event" in
      APPROVE) want="go" ;;
      COMMENT) want="wait" ;;
      REQUEST_CHANGES) want="block" ;;
    esac
    if [ "$META_VERDICT" = "$want" ]; then
      emit ok "verdict-map($label)" "event $event ↔ verdict=$META_VERDICT"
    else
      emit FAIL "verdict-map($label)" "event $event should map to verdict=$want, metadata says $META_VERDICT"
    fi
  fi
}

# --- comment-level checks ----------------------------------------------------

check_comments() {
  # check_comments <payload.json> <label>
  local payload="$1" label="$2"
  local n; n="$(jq '.comments | length' "$payload" 2>/dev/null || echo 0)"
  if [ "$n" -eq 0 ]; then
    emit ok "comments($label)" "no inline comments"
    return
  fi
  local i=0
  while [ "$i" -lt "$n" ]; do
    local path line side cbody cfile
    path="$(jq -r ".comments[$i].path // \"\"" "$payload")"
    line="$(jq -r ".comments[$i].line // .comments[$i].start_line // \"\"" "$payload")"
    side="$(jq -r ".comments[$i].side // \"\"" "$payload")"
    cbody="$(jq -r ".comments[$i].body // \"\"" "$payload")"
    cfile="$TMPDIR_LINT/comment.$i.md"
    printf '%s' "$cbody" > "$cfile"

    if [ -n "$path" ] && [ -n "$line" ] && [ -n "$side" ]; then
      emit ok "comment-anchor($label#$i)" "path/line/side present ($path:$line $side)"
    else
      emit FAIL "comment-anchor($label#$i)" "inline comment missing path/line/side (path='$path' line='$line' side='$side')"
    fi

    if grep -q '🦎' "$cfile"; then
      emit FAIL "comment-emoji($label#$i)" "🦎 appears in an inline comment — never outside the stamp"
    else
      emit ok "comment-emoji($label#$i)" "no 🦎 in inline comment"
    fi

    local has_why=0 has_fix=0
    grep -qF '**Why:**' "$cfile" && has_why=1
    grep -qF '**Fix:**' "$cfile" && has_fix=1
    if [ "$has_why" -eq 1 ] && [ "$has_fix" -eq 1 ]; then
      emit ok "comment-whyfix($label#$i)" "**Why:** and **Fix:** present"
    else
      emit FAIL "comment-whyfix($label#$i)" "inline comment missing **Why:** and/or **Fix:** (why=$has_why fix=$has_fix)"
    fi

    local words; words="$(count_words_before_suggestion "$cfile")"
    if [ "$words" -le 120 ]; then
      emit ok "comment-brevity($label#$i)" "$words words before suggestion (≤120)"
    else
      emit warn "comment-brevity($label#$i)" "$words words before suggestion (>120; skill says aim ≤120)"
    fi
    i=$((i+1))
  done
}

# --- review subcommand -------------------------------------------------------

review_payload() {
  local payload="$1" label="${2:-payload}"
  if ! jq empty "$payload" >/dev/null 2>&1; then
    emit FAIL "parse($label)" "payload is not valid JSON"
    return
  fi
  local event; event="$(jq -r '.event // ""' "$payload")"
  case "$event" in
    APPROVE|COMMENT|REQUEST_CHANGES)
      emit ok "event($label)" "event=$event" ;;
    *)
      emit FAIL "event($label)" "event must be APPROVE|COMMENT|REQUEST_CHANGES (got '$event')"
      event="UNKNOWN" ;;
  esac
  local bodyfile="$TMPDIR_LINT/body.md"
  jq -r '.body // ""' "$payload" > "$bodyfile"
  run_body_checks "$bodyfile" "$event" "$label"
  check_comments "$payload" "$label"
}

# --- field subcommand --------------------------------------------------------

infer_event_from_body() {
  local f="$1"
  local first; first="$(first_nonblank "$f")"
  case "$first" in
    "🦎"*)          echo APPROVE ;;
    "not yet."*)    echo COMMENT ;;
    "do not merge."*) echo REQUEST_CHANGES ;;
    *)              echo UNKNOWN ;;
  esac
}

lint_runs() {
  local root="$1"
  local runs="$root/runs"
  if [ ! -d "$runs" ]; then
    emit warn "runs" "no runs/ directory under $root"
    return
  fi
  local count=0 d
  for d in "$runs"/*/; do
    [ -d "$d" ] || continue
    local name; name="$(basename "$d")"
    if [ -f "$d/review-payload.json" ]; then
      count=$((count+1))
      review_payload "$d/review-payload.json" "runs/$name"
    elif [ -f "$d/body.md" ]; then
      count=$((count+1))
      local ev; ev="$(infer_event_from_body "$d/body.md")"
      run_body_checks "$d/body.md" "$ev" "runs/$name"
    fi
  done
  emit ok "runs" "linted $count run artifact(s)"
}

lint_ledgers() {
  local root="$1"
  local base="$root/ledger"
  if [ ! -d "$base" ]; then
    emit warn "ledger" "no ledger/ directory under $root"
    return
  fi
  # Grammars (leading date YYYY-MM-DD):
  local rec_review='^[0-9]{4}-[0-9]{2}-[0-9]{2} PR#[0-9]+ verdict=(go|wait|block) tier=(quick|standard|deep) adversary=(codex|claude|none) head=[0-9a-fA-F]+'
  local rec_unchanged='^[0-9]{4}-[0-9]{2}-[0-9]{2} PR#[0-9]+ verdict=unchanged-blocked head=[0-9a-fA-F]+ prior=[0-9]+'
  local rec_dupe='^[0-9]{4}-[0-9]{2}-[0-9]{2} PR#[0-9]+ .*duplicate-averted'
  local rec_miss='^[0-9]{4}-[0-9]{2}-[0-9]{2} MISS PR#[0-9]+ '
  local rec_late='^[0-9]{4}-[0-9]{2}-[0-9]{2} PR#[0-9]+ late-finding head=[0-9a-fA-F]+ first-reachable=[0-9a-fA-F]+'
  local total=0 bad=0 f line
  while IFS= read -r f; do
    while IFS= read -r line || [ -n "$line" ]; do
      # skip blanks, markdown headings, html comments, list intros
      case "$line" in
        ''|'#'*|'<!--'*|'>'*) continue ;;
      esac
      # only grade lines that look like a dated record. Matched with bash's own `=~`
      # rather than a piped grep: at six spawns per line over a real ledger this was
      # ~11k processes and most of the field lint's runtime.
      [[ $line =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}\  ]] || continue
      total=$((total+1))
      if [[ $line =~ $rec_review || $line =~ $rec_unchanged || $line =~ $rec_dupe \
         || $line =~ $rec_miss || $line =~ $rec_late ]]; then
        :
      else
        bad=$((bad+1))
        emit FAIL "ledger-line" "malformed record: ${line:0:80}"
      fi
    done < "$f"
  done < <(find "$base" -type f -name '*.md')
  if [ "$bad" -eq 0 ]; then
    emit ok "ledger-lines" "$total dated record(s) well-formed"
  else
    emit FAIL "ledger-lines" "$bad of $total dated record(s) malformed"
  fi
}

detect_split_ledgers() {
  local root="$1"
  local base="$root/ledger"
  [ -d "$base" ] || return
  # key = <owner>/<repo>; flag any key seen under >1 host directory.
  local pairs f rel host owner repo
  pairs="$TMPDIR_LINT/ledger-pairs.txt"
  : > "$pairs"
  while IFS= read -r f; do
    rel="${f#$base/}"                       # <host>/<owner>/<repo>.md
    host="$(printf '%s' "$rel" | awk -F/ '{print $1}')"
    owner="$(printf '%s' "$rel" | awk -F/ '{print $2}')"
    repo="$(printf '%s' "$rel" | awk -F/ '{print $3}')"
    repo="${repo%.md}"
    [ -n "$owner" ] && [ -n "$repo" ] || continue
    printf '%s\t%s\n' "$owner/$repo" "$host" >> "$pairs"
  done < <(find "$base" -type f -name '*.md')
  local split key hosts
  split=0
  while IFS= read -r key; do
    hosts="$(grep -F "$(printf '%s\t' "$key")" "$pairs" | cut -f2 | sort -u | tr '\n' ',' | sed 's/,$//')"
    split=$((split+1))
    emit FAIL "split-ledger" "$key recorded under multiple hosts: $hosts"
  done < <(cut -f1 "$pairs" | sort | uniq -c | awk '$1>1{$1=""; sub(/^ /,""); print}' | while IFS= read -r k; do
             # confirm >1 distinct host for this key
             nh="$(grep -F "$(printf '%s\t' "$k")" "$pairs" | cut -f2 | sort -u | wc -l | tr -d ' ')"
             [ "$nh" -gt 1 ] && printf '%s\n' "$k"
           done)
  if [ "$split" -eq 0 ]; then
    emit ok "split-ledger" "no repo split across multiple host keys"
  fi
}

lint_blindspots() {
  local root="$1"
  local f="$root/blind-spots.md"
  if [ ! -f "$f" ]; then
    emit warn "blind-spots" "no blind-spots.md under $root"
    return
  fi
  # Split into entries at top-level "- " bullets; each must carry all 5 fields.
  local entries; entries="$TMPDIR_LINT/blindspots"
  rm -rf "$entries"; mkdir -p "$entries"
  awk -v dir="$entries" '
    /^- / { n++; file = sprintf("%s/e%03d", dir, n) }
    n > 0 { print > file }
  ' "$f"
  local total=0 bad=0 e
  for e in "$entries"/e*; do
    [ -f "$e" ] || continue
    total=$((total+1))
    local miss=""
    grep -q 'missed pattern' "$e"          || miss="$miss missed-pattern"
    grep -q 'why the criteria failed' "$e" || miss="$miss why-failed"
    grep -q 'trigger signals' "$e"         || miss="$miss trigger-signals"
    grep -q 'required proof' "$e"          || miss="$miss required-proof"
    grep -q 'example' "$e"                 || miss="$miss example"
    if [ -n "$miss" ]; then
      bad=$((bad+1))
      emit FAIL "blind-spot" "entry $total missing field(s):$miss"
    fi
  done
  if [ "$total" -eq 0 ]; then
    emit warn "blind-spots" "blind-spots.md has no entries"
  elif [ "$bad" -eq 0 ]; then
    emit ok "blind-spots" "$total entrie(s), all carry the 5 required fields"
  else
    emit FAIL "blind-spots" "$bad of $total entrie(s) missing required fields"
  fi
}

field_scan() {
  local root="${1:-$HOME/.lizard}"
  if [ ! -d "$root" ]; then
    emit warn "field" "no lizard home at $root — nothing to scan"
    return
  fi
  emit ok "field" "scanning $root"
  lint_runs "$root"
  lint_ledgers "$root"
  detect_split_ledgers "$root"
  lint_blindspots "$root"
}

# --- dispatch ----------------------------------------------------------------

usage() {
  cat >&2 <<'EOF'
usage:
  lint.sh review <payload.json>   check one review/dry-run payload
  lint.sh field  [DIR]            scan real lizard history (default ~/.lizard)
EOF
  exit 2
}

main() {
  local sub="${1:-}"
  case "$sub" in
    review)
      [ $# -eq 2 ] || usage
      review_payload "$2" "payload"
      ;;
    field)
      field_scan "${2:-$HOME/.lizard}"
      ;;
    *)
      usage
      ;;
  esac
  printf -- '--- %d ok, %d warn, %d FAIL\n' "$OK_COUNT" "$WARN_COUNT" "$FAIL_COUNT" >&2
  [ "$FAIL_COUNT" -eq 0 ]
}

main "$@"
