# Adversarial reviewer — the abstraction

`forge-harden` and `forge-review` both call out to a *third-party agent* for an
independent adversarial pass. This is the single source of truth for which
agent gets picked, how it's invoked, and what envelope is sent.

The forge driver (the agent reading these skills) and the adversarial reviewer
(the headless second voice) are deliberately decoupled — you can drive from
Claude and review with Codex, drive from Codex and review with Gemini, etc.

## Supported reviewers

| Agent | CLI | Headless invocation | Notes |
|---|---|---|---|
| Codex (OpenAI) | `codex` | `codex exec --skip-git-repo-check "<prompt>"` | forge's original reviewer |
| Gemini (Google) | `gemini` | `gemini -p "<prompt>"` | Google's CLI agent |
| Claude (Anthropic) | `claude` | `claude -p "<prompt>"` | Same family as the typical driver — useful fallback |

**Antigravity** (Google's agent IDE) is supported as a *driver* but not as a
headless reviewer — its CLI opens an interactive window, not a one-shot pass.
If you drive forge from within an Antigravity session, the reviewer pass still
calls out to one of the headless agents above.

## Selection — in order

1. **Explicit per-project config.** If `wiki/.forge/config.yaml` exists with
   `reviewer: <name>`, use that exactly. If `reviewer: none`, skip the
   independent pass entirely and state so in the report.
2. **Environment override.** If `FORGE_REVIEWER` is set, use its value.
3. **Auto-probe (default).** `command -v` in this order: `codex` → `gemini` →
   `claude`. Pick the first installed.
4. **None found.** State "no reviewer available — pass skipped" and continue.
   Do not block.

Always state which reviewer was selected and why before invoking it.

## Prompt envelope (verbatim)

Both `forge-harden` and `forge-review` send the same shape. Only the CLI shell
changes between agents.

```
You are an adversarial reviewer. Be concrete. Do not comment on whether the
project is worth building — only on the artifact's soundness.

Find:
1. The weakest assumption.
2. The most likely failure / missed case.
3. The check / test / gate that would PASS through a real regression.

Then list every finding with a severity (high/med/low) and a one-line proposed
fix. No hedging.

<<<
[artifact contents pasted here]
>>>
```

- For `forge-harden`: artifact = `wiki/plan.md` + `wiki/architecture.md`.
- For `forge-review`: artifact = the phase diff (`git diff <base>...HEAD`) plus
  the phase spec from `wiki/plan.md`.

## Per-project configuration

`wiki/.forge/config.yaml` (optional, all fields optional):

```yaml
# forge per-project configuration.
# See: forge/references/reviewer-agents.md
reviewer: auto    # auto | codex | gemini | claude | none
```

Create with `mkdir -p wiki/.forge` when you first need it. `forge-init` does
not create this by default — it's a customization, not a requirement.

## Driver swap (informational)

Any agent that can read `SKILL.md` files can drive forge — the skills are
plain markdown. To drive forge from a non-Claude agent:

- **Codex CLI:** install via `npx skills add tinyorbit-ai/skills --skill forge`;
  invoke `forge` as a skill from Codex.
- **Gemini CLI:** `gemini skills add tinyorbit-ai/skills --skill forge` (the
  `skills` CLI plugs into Gemini the same way).
- **Antigravity:** install the skills folder into the workspace; Antigravity
  surfaces `SKILL.md` files as agent skills natively.

When forge is driven by a non-Claude agent, the reviewer abstraction above
still applies — the independent reviewer is whatever `wiki/.forge/config.yaml`
(or auto-probe) picks. Useful pairings:

- Driver Claude · Reviewer Codex (forge's original default)
- Driver Gemini · Reviewer Codex
- Driver Codex · Reviewer Gemini or Claude
- Driver Antigravity · Reviewer Codex / Gemini / Claude

The driver writes the wiki, takes positions, runs `AskUserQuestion`. The
reviewer's job is unchanged regardless of who's driving: read the artifact,
list the weakest assumption and the most likely missed failure, no hedging.
