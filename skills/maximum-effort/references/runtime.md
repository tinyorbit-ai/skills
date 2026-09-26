# Runtime ownership and model lanes

The frontier owner stays in charge. Tool differences affect only how its leaf delegates
are pinned.

## The ladder

Last verified 2026-09-26 on Claude Code 2.1.283 and codex-cli 0.156.1. Three tiers, the
same on both tools:

| Tier | Claude | Codex | Use |
|---|---|---|---|
| Mechanical | Sonnet 5 @ xhigh | `gpt-6-luna` @ max | scouts and mechanics |
| Default | Opus 5.5 @ medium | `gpt-6-sol` @ medium | the owner for S and M |
| Hard | Opus 5.5 @ xhigh | `gpt-6-sol` @ xhigh | the owner for L or risky work, and independent review |

## Claude Code

- The skill frontmatter selects Opus at medium effort for the owning turn. Raise it to
  xhigh (`/effort xhigh`) for L or risky work. A model or effort the user picked wins.
- Scout and mechanic: an agent at `model: sonnet` with `effort: xhigh` in its
  definition, using the matching packet. Scouts are read-only.
- Independent review: a fresh Opus agent at xhigh, read-only and findings-only.
- A delegate launch is not its answer. Collect the completion result in the same task
  turn before accepting or taking over.

Claude headroom is `seven_day.used_percentage` in
`~/.claude/rate-limits.json`. A missing value is unknown, not zero.

## Codex

- By default, a `gpt-6-sol` session owns the task. Codex ignores `model:` and `effort:`
  in skill frontmatter.
- If the session runs on `gpt-6-luna` through automatic routing, create exactly one
  `gpt-6-sol` owner before source work. Give it the request, brief, repo guidance paths,
  and authority to own the whole task. If the user explicitly picked a model or effort,
  keep it and keep the current session as owner.
- Scout and mechanic: `spawn_agent` with `model: "gpt-6-luna"`,
  `reasoning_effort: "max"` and `fork_turns: "none"`.
- Independent review: a fresh `gpt-6-sol` at `xhigh`, read-only and findings-only.
- Every spawn prompt carries the leaf boundary from `references/delegation.md`.
  Collect the result before accepting it or recording a takeover.

From a shell (Claude driving Codex, or a script), use the profiles that
`scripts/install-codex-profiles.sh` writes to `$CODEX_HOME`:
`codex exec -p me-mechanic -s read-only "<scout packet>"`, `-p me-owner`, `-p me-hard`.

Keep at most four scouts in flight. Mechanics may overlap only with disjoint files and
checks. A `gpt-6-sol` owner created from a weaker session may create these leaf delegates; the
weaker coordinator does no parallel source work.

Codex headroom is the last `rate_limits.primary.used_percent` in today's
`~/.codex/sessions/YYYY/MM/DD/*.jsonl`. A missing value is unknown, not zero.

## Subscription balance

`scripts/usage.sh` shows both pools. Pool choice happens between tasks:

1. Finish the current task in its current pool.
2. If the other pool has at least 15 percentage points more headroom and offers a
   suitable frontier owner, recommend it for the next task.
3. The user starts that next task there. Never replay an in-progress task across tools.

## Frontier review prompt

```text
Review this completed diff against the brief and forge-principles. Read-only.
Return only numbered findings that can cause wrong behavior, security exposure,
data loss, or a real regression. Include file:line and the smallest valid fix.
If there are no findings, answer APPROVE. Do not edit or spawn agents.
```
