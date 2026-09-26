# Headless contract

Every forge stage can run with no human: a factory worker, a subagent, `claude -p`,
`codex exec`, a crack-on run. Two rules make that safe.

## When no one can answer

Follow `forge-principles` rule 10. Take the option you would mark `(recommended)`,
record it as an assumption (in the artifact you are writing, an ADR, or the result
line's `notes`), and continue. Block only when the call is irreversible or costly: data
loss, a public contract, money, or a one-way door from `forge-harden`'s always-surface
list. Then stop with one clear question.

How to tell: no question tool is available, the prompt says non-interactive, or you
are a subagent. A question tool that exists but gets no answer is not headless; wait.

## Asking, per tool

- Claude Code: `AskUserQuestion`.
- Codex: the structured user-input tool (`request_user_input`) when the session has
  it; otherwise one short plain-text question, then stop the turn.
- Neither: headless (above).

## The result line

The last line of every stage's final message is one line of JSON, so a factory can
resume without reading the wiki:

```
FORGE_RESULT {"skill":"forge-build","status":"done","phase":3,"gate":"green","notes":"assumed SQLite (two-way door)"}
```

- `status`: `done` or `blocked`.
- `phase`: the phase number, or `null` outside the build loop.
- `gate`: `green`, `red`, `deferred` (crack-on, the agent can't run it) or `n/a`.
- `notes`: one line. For `blocked`, the question or failure; for `done`, the
  assumptions made, the commit, or the PR URL.

`node <forge>/scripts/status.mjs --json` (path: `../forge/scripts/status.mjs` from any
forge skill) reports the project's state the same way, without an LLM.
