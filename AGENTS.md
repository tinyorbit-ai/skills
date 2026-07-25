# Skills Marketplace — Codex guidance

Read and follow [`CLAUDE.md`](CLAUDE.md) in full before working in this repo. It
is the shared source of truth for the architecture, project structure, skill
format, eval-gated edit loop, commands, and gotchas. Do not maintain a divergent
Codex copy of those rules. The per-skill index lives in
[`skills/INDEX.md`](skills/INDEX.md), linked from there.

Codex-specific mapping: where shared guidance says `AskUserQuestion`, use Codex's
structured user-input tool when available, otherwise ask one concise plain-text
question. Skills under test are mirrored from the same source into
`.claude/skills/` and `.codex/skills/`; never fork their instructions by agent.
