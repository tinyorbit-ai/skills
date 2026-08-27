# Runtime ownership and model lanes

The frontier owner stays in charge. Tool differences affect only how its leaf delegates
are pinned.

## Claude Code

- The skill frontmatter selects Opus at medium effort for the owning turn. A user-picked
  Fable, Opus, or higher effort wins.
- Scout: Haiku at low effort, read-only, using the scout packet.
- Mechanic: Sonnet at medium effort, using the mechanical packet.
- Independent review: fresh Opus or Fable at high effort, read-only and findings-only.
- A delegate launch is not its answer. Collect the completion result in the same task
  turn before accepting or taking over.

Claude headroom is `seven_day.used_percentage` in
`~/.claude/rate-limits.json`. A missing value is unknown, not zero.

## Codex

- By default, a Sol session owns the task. Codex ignores `model:` and `effort:` in
  skill frontmatter.
- If invoked from Terra or Luna by automatic routing, create exactly one Sol owner
  before source work. Give it the request, brief, repo guidance paths, and authority to
  own the whole task. If the user explicitly selected Terra, Luna, or an effort level,
  preserve that choice and keep the current session as owner.
- Scout: `gpt-5.6-luna` at low effort with `fork_turns: "none"`.
- Mechanic: `gpt-5.6-terra` at medium effort with `fork_turns: "none"`.
- Independent review: fresh `gpt-5.6-sol` at high or xhigh effort, read-only and
  findings-only.
- Every spawn prompt carries the leaf boundary from `references/delegation.md`.
  Collect the result before accepting it or recording a takeover.

Keep at most four scouts in flight. Mechanics may overlap only with disjoint files and
checks. A Sol owner created from a weaker session may create these leaf delegates; the
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
