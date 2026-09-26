#!/usr/bin/env bash
# Writes the maximum-effort ladder as Codex profiles, so a shell can pick a tier with
# `codex exec -p <profile>`. Codex layers $CODEX_HOME/<name>.config.toml on top of
# config.toml. Safe to re-run: it rewrites only these three files.
set -euo pipefail

home="${CODEX_HOME:-$HOME/.codex}"
mkdir -p "$home"

write() {
  local name="$1" model="$2" effort="$3" use="$4"
  cat > "$home/$name.config.toml" <<TOML
# maximum-effort ladder: $use. Written by maximum-effort/scripts/install-codex-profiles.sh.
model = "$model"
model_reasoning_effort = "$effort"
TOML
  echo "wrote $home/$name.config.toml ($model @ $effort)"
}

write me-mechanic gpt-6-luna max "mechanical tier: scouts and mechanics"
write me-owner gpt-6-sol medium "default tier: the owner for S and M"
write me-hard gpt-6-sol xhigh "hard tier: the owner for L or risky work, and review"
