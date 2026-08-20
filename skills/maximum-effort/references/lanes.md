# Lanes — per-tool mechanics

Last verified 2026-08-20 against code.claude.com/docs and learn.chatgpt.com/docs
(Claude Code 2.1.237, codex-cli 0.147.0). Re-check this file when a model alias, a
default, or a plan limit moves — it is the only file in the skill that differs per tool.

## Claude Code

| Lane | Spawn | Pinned where |
|---|---|---|
| Scout | `Agent(subagent_type: "scout", prompt)` | `~/.claude/agents/scout.md` — `model: haiku`, read-only tools |
| Worker | `Agent(subagent_type: "worker", prompt)` | `worker.md` — `model: sonnet`, `effort: medium` |
| Worker, risky step | `Agent(subagent_type: "worker", model: "opus", prompt)` | the call's `model` beats the file's (resolution order — env var, call, file, session). Effort stays the file's `medium`; xhigh belongs to the brain's review. |
| Brain | `Agent(subagent_type: "planner", prompt)` | `planner.md` — `model: fable`, `effort: xhigh`, no Edit |
| Fan-out | `Workflow` | L only, ≥ 3 separable tracks |

- The `Agent` tool pins `model` per call and never `effort` — effort lives only in the
  agent file. Install the three files with `scripts/install-agents.sh` (idempotent).
- **Role agent missing?** Spawn with `model:` set explicitly and paste that role's body
  from `references/roles.md` at the top of the prompt. Effort then inherits the session.
- This skill's frontmatter pins `model: opus`, `effort: medium` for the turn it runs
  in; the session model returns on the next prompt. Session defaults live in
  `~/.claude/settings.json` (`"model": "opus"`, `"effortLevel": "medium"`).
- Headroom: `~/.claude/rate-limits.json`, written by the statusline on every refresh —
  `seven_day.used_percentage`.
- `Agent` returns "launched successfully" immediately and the lane keeps running in the
  background — that return is not the result. Start no dependent work and end no turn
  while a lane is still out.
- The lane's completion notification (a later user-role message) IS its answer: tick
  its plan box and write the Log and ledger line from that notification, not from the
  launch return.
- Turn ended with a lane in flight anyway? `SendMessage` that agent for its result
  before re-spawning or re-planning anything.
- Codex-pool lanes from Claude:
  `codex exec -p scout --sandbox read-only --json "<scout prompt>"` and
  `codex exec -p worker --sandbox workspace-write --json "<worker prompt>"`.
  Profiles are the files `~/.codex/{scout,worker,brain}.config.toml`. Run them in the
  foreground and wait — a backgrounded `codex exec` plus a later turn ends a headless
  session with nothing done. Pin the `Bash` call's `timeout` to 600000 — the 120s
  default backgrounds the lane mid-run. `workspace-write` denies `listen`, so a
  step whose check starts a server stays on the Claude pool (observed: a Codex worker
  `BLOCKED(EPERM)` on `npm test` for an HTTP server).

## Codex

| Lane | Spawn | Pinned where |
|---|---|---|
| Coordinator | the session | `~/.codex/config.toml` — `model = "gpt-5.6-terra"`, `model_reasoning_effort = "medium"`. Codex ignores SKILL.md `model:` / `effort:`; a `$maximum-effort` turn runs on the session model. |
| Scout | `spawn_agent` with `model: "gpt-5.6-luna"`, `reasoning_effort: "low"`, `fork_turns: "none"` | `fork_turns: "none"` is required — a full-history fork rejects `model` / `reasoning_effort` overrides |
| Worker | `spawn_agent` with `fork_turns: "none"` | `[agents] default_subagent_model = "gpt-5.6-terra"`, `default_subagent_reasoning_effort = "medium"` |
| Worker, risky step | `spawn_agent` with `model: "gpt-5.6-sol"`, `reasoning_effort: "high"`, `fork_turns: "none"` | per call |
| Brain | `spawn_agent` with `model: "gpt-5.6-sol"`, `reasoning_effort: "xhigh"`, `fork_turns: "none"` — or a separate `codex -p brain` session | `~/.codex/brain.config.toml` |
| Fan-out | Ultra is an effort tier — `model_reasoning_effort = "ultra"`, eligible accounts only | L only |

- Concurrency: `agents.max_concurrent_threads_per_session` (source default 6, excludes
  the primary). Keep scouts at ≤ 4 in flight.
- Profiles are **files**, not tables: `~/.codex/<name>.config.toml` with top-level
  `model` / `model_reasoning_effort`. `[profiles.<name>]` in `config.toml` stopped
  working in 0.134.0.
- `fork_turns` is documented in source only (`none` | `all` | `"<n>"`). If a spawn with
  `model` set is rejected, that is the first thing to check.
- Headroom: the last `rate_limits.primary.used_percent` in today's
  `~/.codex/sessions/YYYY/MM/DD/*.jsonl`. Undocumented field — `scripts/usage.sh`
  exits non-zero the day it vanishes.
- Claude-pool lanes from Codex:
  `claude -p --model haiku --effort low "<scout prompt>"` and
  `claude -p --model sonnet --effort medium --permission-mode acceptEdits "<worker prompt>"`.

## Picking the pool

1. Read both 7-day percentages. A missing number counts as 100 — never route blind.
2. Scouts and workers go to the pool with the lower number when the gap is ≥ 15
   points; otherwise stay home (a cross-pool lane pays a process start and a foreign
   transcript format).
3. The brain never crosses pools.
4. Name the pool in the receipt.
5. No output, an error, or past 10 minutes: re-run the lane once in the home pool
   rather than treating a silent foreign pool as a finished lane.
