#!/usr/bin/env bash
# Writes the scout / worker / planner agent files from references/roles.md into
# ~/.claude/agents/ (or the directory given as $1). Idempotent — always overwrites.
set -euo pipefail

skill_dir="$(cd "$(dirname "$0")/.." && pwd)"
roles="$skill_dir/references/roles.md"
target="${1:-$HOME/.claude/agents}"
mkdir -p "$target"

for role in scout worker planner; do
  out="$target/$role.md"
  awk -v role="$role" '
    $0 == "<!-- agent:" role " -->" { grab = 1; next }
    grab && $0 == "<!-- /agent -->"  { exit }
    grab && $0 ~ /^```/               { next }
    grab                              { print }
  ' "$roles" > "$out"
  if ! grep -q "^name: $role$" "$out"; then
    echo "install-agents: no agent block for '$role' in $roles" >&2
    exit 1
  fi
  echo "wrote $out"
done
