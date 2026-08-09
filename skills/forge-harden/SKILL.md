---
name: forge-harden
description: Plan-time hardening orchestrator — detects scope and runs the applicable persona reviews (forge-harden-eng + forge-harden-security always; -design if UI; -dx if dev-facing; -scope on request), then the independent reviewer pass via a configurable third-party agent (Codex / Gemini / Claude). Two modes — interactive (default; surfaces taste decisions to the user) and --auto (auto-decides everything except irreversible-feeling shape calls, per five named principles). Use after forge-plan, when asked to "harden the plan", "review the plan from every angle", "stress test this", "auto-harden", or as stage 3 of forge.
---

# forge-harden

The orchestrator. Writes no findings itself — it routes the persona passes,
the economy sweep, and the independent reviewer, then consolidates everything
into the plan's `## Review` section and the lock gate.

## Charter

**Critique the plan** — every finding is a plan change or a surfaced taste
decision, never a reason to stop.

## Modes

- **Interactive** (default) — persona passes run; taste decisions reach the
  user as one batch at the end.
- **`--auto`** — auto-decides objective findings and any taste decision the
  principles below cover; only the always-surface allowlist (principle 5)
  reaches the user. State which principle resolved each auto-decision.

State the mode upfront. Default to interactive.

### Decision classes (both modes)

Every decision surfaced by a persona or the reviewer falls into one of three:

- **Mechanical** — one clearly right answer (strengthen a weak gate, name a
  missing state). Auto-decided silently in both modes — the personas' auto-fix lane.
- **Taste** — reasonable people could disagree. Interactive → the taste batch;
  `--auto` → decided by the principles below, stated in the report.
- **User Challenge** — *any* persona or the reviewer concludes a direction the
  **user explicitly chose** (brief, ADR, locked answer) should change. **One
  objector is enough** — a finding contradicting an explicit user choice is
  never downgraded to Taste, and it is **never auto-decided, in any mode.**
  The user's direction is the default; the objector carries the burden of
  proof. Present the objection verbatim with your read — "keep my direction"
  is a complete answer, recorded as a HOLD ADR so it isn't re-litigated.

### Auto-decision principles (only used in `--auto`)

When auto-deciding a taste call surfaced by a persona, apply these five in
order. Skip a principle that doesn't bear on the question; never bend one.

1. **Bolder outcome, most economical means.** The more excellent realization
   of what the user chose, with the fewest parts (`forge-principles/references/simplicity.md`).
2. **Bias to a falsifiable gate.** Pick whichever option would actually catch
   a regression.
3. **Bias to security on tied craft cost.** Equal effort and clarity → the
   more secure shape; severity tags from `forge-harden-security` carry.
4. **Bias to economy of means.** Fewer phases, dependencies, abstractions;
   established tech over novel; no new service the brief doesn't demand.
5. **Always-surface allowlist — never auto-decided:** framework, language,
   persistence model, public API shape, a new external service, a new runtime
   dependency, the auth model, the data model, or any edit to a user-locked
   ADR. These reach the user even in `--auto`; the bar is "the user would
   want to own this in retrospect".

## Process

Prereq: `wiki/plan.md` with phases + gates — else run `forge-plan` first.

### 1. Detect scope

From `wiki/brief.md` + `wiki/plan.md`:

- Does the plan ship a UI? → run `forge-harden-design`.
- Is the plan developer-facing (library / API / CLI / SDK)? → run
  `forge-harden-dx`.
- Scope rethink (`forge-harden-scope`) is opt-in: run when a `scope` arg was
  passed; otherwise in interactive mode ask once (AskUserQuestion — *"rethink
  scope, or take it as-is?"*, default as-is). `--auto` skips it unless
  the arg was given. State plainly which personas run, and why, before invoking.

### 2. Run persona passes

Read the shared ground **once** (brief, plan, architecture, learnings, ADR
list) and hand each persona a digest. Run each applicable persona as an
**isolated subagent** that reads the digest + `wiki/plan.md`, applies its own
auto-fixes to the plan, and returns only its report block + surfaced taste
decisions. Never stack five persona SKILL.md files into one context — the
late, user-facing passes would reason in the most degraded window.

| Order | Persona | Always? |
|---|---|---|
| 1 | `forge-harden-eng` | yes |
| 2 | `forge-harden-security` | yes |
| 3 | `forge-harden-design` | only if UI |
| 4 | `forge-harden-dx` | only if dev-facing |
| 5 | `forge-harden-scope` | only if requested |
| 6 | **economy sweep** — re-run `forge-harden-eng`, economy dimension only | yes — always LAST |

Personas run sequentially (later passes see the earlier ones' plan fixes).
The **economy sweep runs last on purpose**: passes 2–5 are additive by
construction, so the one subtractive lens must see the fully-cumulative plan.
It has authority to **cut any obligation added in passes 1–5 that doesn't
earn its place against the brief** (`forge-principles/references/simplicity.md`);
every cut is logged in the report with the persona it came from.

### 3. Independent reviewer pass

Resolve the adversarial reviewer per `references/reviewer-agents.md` —
explicit `wiki/.forge/config.yaml`, then `$FORGE_REVIEWER`, then auto-probe
`codex` → `gemini` → `claude`. State which one was picked. If none is
available or config says `reviewer: none`, state the pass is skipped.

Send the standard prompt envelope from `reviewer-agents.md`, artifact passed
**via temp file** per its artifact-passing contract (never inlined into a
quoted shell string). The artifact = the **before → after diff** of
`wiki/plan.md` + `wiki/architecture.md` across the persona passes, plus each
persona's claimed score deltas — the reviewer grades whether each fix earns
its delta, it doesn't just re-read the final plan. Verify the reviewer exited
0 with non-empty output; a silent no-op is a *skipped* pass, reported as such.

### 4. Reconcile

- **Persona vs persona first.** Diff each persona's plan edits against the
  earlier ones'. Collisions — the same gate edited twice, contradictory
  obligations (dx demands a hosted sandbox; eng's economy denies the new
  service) — are never last-writer-wins: route them to the taste batch
  exactly like reviewer disagreements, both cases stated.
- The reviewer's findings that agree with personas → already addressed.
- The reviewer's findings that contradict personas, and any delta grade it
  rejected → carry to the taste batch verbatim. Do not smooth over
  disagreement. State whose argument you find more compelling and why, but
  let the user decide.

### 5. Write the consolidated `## Review` section

Append (or replace) the `## Review` section in `wiki/plan.md`:

```markdown
## Review

**Lock status:** pending
**Mode:** interactive | --auto
**Personas run:** forge-harden-eng, forge-harden-security[, -design][, -dx][, -scope]
**Adversarial reviewer:** <codex | gemini | claude | none — reason>

### Findings fixed
- <persona>: <one-line summary of what was fixed in the plan>

### Economy sweep — cuts
- <obligation cut> (added by <persona>; why it didn't earn its place)

### Auto-decisions (--auto mode only)
- <decision> → <chosen option> (principle <N>)

### Open taste decisions
- <decision — framed as Decision Brief; includes persona-vs-persona collisions>

### User Challenges (never auto-decided)
- <user's chosen direction> ← challenged by <who>; <one-line case>

### Reviewer delta grades & disagreements
- <delta claimed> → <upheld | rejected — why>
```

### 6. Hand off — final lock gate

Always write `**Lock status:** pending` into the `## Review` block (step 5).
**Never set it to `locked` yourself** — locking is the user's confirmation, owned
by the lock gate; `pending` is what makes hardening resumable.

Invoked by `forge`: return so `forge` runs its lock gate (it flips the marker on
the user's confirm). Standalone: present the open taste decisions, User
Challenges, and disagreements as one `AskUserQuestion` batch in the Decision
Brief shape (`references/question-style.md`); on confirm, set
`**Lock status:** locked` and tell them the build loop is unlocked.

## Rules

- The orchestrator itself never writes findings — that's each persona's
  job. Keep the orchestrator thin.
- A persona's auto-fix stands unless the economy sweep (pass 6) cuts it or
  reconciliation routes it to the user. The orchestrator itself never rewrites
  findings — it consolidates, sweeps, and reconciles.
- Subtraction is the default fix. For every finding the first candidate is
  collapse / delete / reuse; adding a part must justify why it beat subtraction —
  more rigor is not more machinery (`forge-principles/references/simplicity.md`).
- Anti-sycophantic throughout: take positions, state what evidence would
  flip them, don't hedge.

## References

- forge suite's `references/reviewer-agents.md` — reviewer selection, invocation, prompt envelope
- forge suite's `references/question-style.md` — Decision Brief format for the taste batch
- forge suite's `references/scoring.md` — the personas' rating loop + trend lines
- `forge-principles`'s `references/craft-patterns.md` — the thinking moves the personas cite
- `forge-principles`'s `references/simplicity.md` — economy of means (subtraction-first fix policy)
- `forge-harden-eng`, `forge-harden-security`, `forge-harden-design`,
  `forge-harden-dx`, `forge-harden-scope` — the five persona skills
