# agent-atc

Air-traffic control for subagents, inside Claude Code.

```
3 running · 2 done
main: ✓ Agent billing api · 4s ago
────────────────────────────────────────
 ● 1: billing api  running 2m  Edit billing/subscriptions.ts
  ›● 2: webhook tests  running 40s  Bash bun test webhooks
 ◐ 3: security audit  quiet 2m  Bash pnpm test auth
 ✓ 4: research  done in 38s

webhook tests
general-purpose · opus-5-5 · started 14:32:01 · 18 calls · 41k tok
14:32:04 ✓ Read billing/service.ts
14:32:09 ✓ Edit billing/subscriptions.ts
14:32:16 … Bash bun test webhooks
[ Message this agent…            Send ]
[ Stop ]  [ Back ]
```

- `/atc` opens the pane and gives it the keyboard. Esc hands the keyboard back. `/atc close` closes it.
- `1`–`9` picks an agent. Its trail, model, call count and tokens show below the list.
- **Message** sends text to the picked agent. A finished agent is resumed with it, so you can ask a follow-up.
- **Stop** stops a running background agent (`TaskStop`).
- **Quiet** means running with no tool call for 90s. It is usually stuck on a permission prompt or a long command.
- The status line shows `agents: N running` whenever any are running.

Setting `autoOpen` (default on) opens the pane by itself when the first subagent
starts. This only happens on terminals 144+ columns wide. Closing it yourself keeps it
closed until you run `/atc`.

Install: see [`../README.md`](../README.md).
