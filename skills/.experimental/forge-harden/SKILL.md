---
name: forge-harden
description: Plan-time hardening orchestrator — detects scope and runs the applicable persona reviews (forge-harden-eng + forge-harden-security always; -design if UI; -dx if dev-facing; -scope on request), then the independent reviewer pass via a configurable third-party agent (Codex / Gemini / Claude). Two modes — interactive (default; surfaces taste decisions to the user) and --auto (auto-decides everything except irreversible-feeling shape calls, per six named principles). Strengthens the plan, never vetoes the project. Use after forge-plan, when asked to "harden the plan", "review the plan from every angle", "stress test this", "auto-harden", or as stage 3 of forge.
metadata:
  internal: true
---

# forge-harden

The orchestrator. Itself writes no findings — it routes through the five
persona skills (each of which is also runnable standalone), then runs the
independent reviewer pass, then consolidates everything into the plan's
`## Review` section and the lock gate.

## Charter

The project is worth building. **Critique the plan, never the premise.** No
persona may conclude "this shouldn't be built" — out of scope by charter.
Every finding is a plan change or a surfaced taste decision.

## Modes

- **Interactive** (default) — runs persona passes, surfaces taste decisions
  one batch at a time at the end for the user to answer.
- **`--auto`** — runs every persona pass and auto-decides objective findings
  AND any taste decision that fits the auto-decision principles below.
  Only **irreversible-feeling shape decisions** (the build's overall
  framework, language, persistence model, etc.) reach the user. State which
  principle resolved each auto-decision in the report.

State the mode upfront. Default to interactive.

### Auto-decision principles (only used in `--auto`)

When auto-deciding a taste call surfaced by a persona, apply these six in
order. Skip a principle that doesn't bear on the question; never bend one.

1. **Charter holds.** Never produce an outcome that questions whether the
   project should exist. The user's choice to build is settled.
2. **Bias to the bolder version of what the user already chose.** If the
   decision is about ambition within the chosen intent, prefer the more
   excellent realization. (Same as `forge-ambition`'s posture.)
3. **Bias to a falsifiable gate.** Where two options differ on whether a
   phase's gate would catch a regression, pick the stronger gate every
   time.
4. **Bias to security on tied craft cost.** When two options have
   equivalent effort and clarity, pick the more secure shape. Severity
   tags from `forge-harden-security` carry.
5. **Bias to fewer phases.** If work could land in phase N or N+1 and
   nothing forces the later one, pick the earlier — keep phase count tight.
6. **Surface, don't decide, the irreversible-feeling ones.** Framework
   choice, language choice, persistence model, public API shape — these
   reach the user even in `--auto`. The bar for "reach the user" is "the
   user would want to own this in retrospect".

## Process

Prereq: `wiki/plan.md` exists with phases + gates. If not, run `forge-plan`
first.

### 1. Detect scope

From `wiki/brief.md` + `wiki/plan.md`:

- Does the plan ship a UI? → run `forge-harden-design`.
- Is the plan developer-facing (library / API / CLI / SDK)? → run
  `forge-harden-dx`.
- Did the user request a scope check (arg or AskUserQuestion answer)? →
  run `forge-harden-scope`.

State plainly which personas are running and why before invoking any.

### 2. Run persona passes

Invoke each applicable persona skill in this order. Each persona handles
its own auto-fixes to `wiki/plan.md`; the orchestrator collects their
report blocks and any taste decisions they surface.

| Order | Persona | Always? |
|---|---|---|
| 1 | `forge-harden-eng` | yes |
| 2 | `forge-harden-security` | yes |
| 3 | `forge-harden-design` | only if UI |
| 4 | `forge-harden-dx` | only if dev-facing |
| 5 | `forge-harden-scope` | only if requested |

Persona skills run sequentially (later passes see the earlier ones' plan
fixes). Each returns a structured summary block — keep them verbatim for
the consolidated report.

### 3. Independent reviewer pass

Resolve the adversarial reviewer per `references/reviewer-agents.md` —
explicit `wiki/.forge/config.yaml`, then `$FORGE_REVIEWER`, then auto-probe
`codex` → `gemini` → `claude`. State which one was picked. If none is
available or config says `reviewer: none`, state the pass is skipped.

Send the standard prompt envelope from `reviewer-agents.md` with the
artifact = current `wiki/plan.md` + `wiki/architecture.md` (post persona
fixes — the reviewer should see the strengthened plan, not the original).

### 4. Reconcile

- The reviewer's findings that agree with personas → already addressed.
- The reviewer's findings that contradict personas → carry to the taste
  batch verbatim. Do not smooth over disagreement. State whose argument
  you find more compelling and why, but let the user decide.

### 5. Write the consolidated `## Review` section

Append (or replace) the `## Review` section in `wiki/plan.md`:

```markdown
## Review

**Mode:** interactive | --auto
**Personas run:** forge-harden-eng, forge-harden-security[, -design][, -dx][, -scope]
**Adversarial reviewer:** <codex | gemini | claude | none — reason>

### Findings fixed
- <persona>: <one-line summary of what was fixed in the plan>
- ...

### Auto-decisions (--auto mode only)
- <decision> → <chosen option> (principle <N>)
- ...

### Open taste decisions
- <decision 1 — framed as Decision Brief>
- ...

### Reviewer-vs-persona disagreements
- <if any — verbatim from reconciliation step>
```

### 6. Hand off — final lock gate

If invoked by `forge`: return so `forge` can run its lock gate.

If invoked standalone: present the open taste decisions and reviewer
disagreements directly as one `AskUserQuestion` batch in the **Decision
Brief** shape (forge suite's `references/question-style.md`). When the
user has answered, declare the plan locked.

## Rules

- Never produce a "kill the project" recommendation. Out of scope by charter.
- The orchestrator itself never writes findings — that's each persona's
  job. Keep the orchestrator thin.
- A persona's auto-fix is non-negotiable; the orchestrator doesn't
  re-litigate persona fixes, only consolidates them.
- Run personas sequentially so later passes see the cumulative plan.
- Anti-sycophantic throughout: take positions, state what evidence would
  flip them, don't hedge.

## References

- forge suite's `references/reviewer-agents.md` — reviewer selection, invocation, prompt envelope
- forge suite's `references/question-style.md` — Decision Brief format for the taste batch
- `forge-harden-eng`, `forge-harden-security`, `forge-harden-design`,
  `forge-harden-dx`, `forge-harden-scope` — the five persona skills
