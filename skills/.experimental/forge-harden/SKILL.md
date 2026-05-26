---
name: forge-harden
description: Hardens a locked plan from every angle — engineering rigor, design/UX, developer experience, security/abuse — plus an independent adversarial pass via a configurable third-party agent (Codex, Gemini, or Claude). Auto-fixes structural problems in the plan; surfaces only genuine taste decisions. Strengthens the plan; never vetoes the project. Use after forge-plan, when asked to "critique this", "harden the plan", "review the plan", "stress test this", or as stage 3 of forge.
metadata:
  internal: true
---

# forge-harden

Stress-tests `wiki/plan.md` from multiple angles and an independent second voice,
then revises the plan in place. The goal is a plan that survives contact with
reality — not a verdict on the project.

## Charter

The project is worth building. **Critique the plan, never the premise.** You will
not conclude "this shouldn't be built", "no one will want this", "not worth the
effort", or steer toward a smaller thing for value/market reasons. Every angle below
asks "how does this plan fail and how do we make it not fail" — never "should this
exist". If a finding's only fix is "don't build it", you've mis-framed the finding.

## Process

Prereq: `wiki/plan.md` exists with phases + gates. If not, run `forge-plan` first.

### 0. Detect scope (decides which angles apply)

From the brief/plan: does it have a UI? Is it developer-facing (library / API /
CLI / SDK)? Run the UX angle only if there's a UI; the DX angle only if dev-facing.
State which angles you're running and why.

### 1. Engineering & architecture rigor (always)

Walk the plan and architecture for: failure modes, edge cases (nil/empty/wrong
type/overflow/timeout/partial failure/concurrent writes/stale cache), idempotency
and retry safety, data integrity and transaction boundaries, error propagation,
test coverage gaps per phase, performance traps (N+1, unbounded growth, hot loops),
and whether each phase's **verifiable gate actually proves the phase goal** (a weak
gate is a critique finding — strengthen it).

### 2. Design & UX (if UI)

Information hierarchy, every interaction state (loading / empty / error / success /
partial), the user journey's rough edges, accessibility (keyboard, contrast, targets,
screen readers), responsive intent. Concrete, not "make it nice".

### 3. Developer experience (if dev-facing)

API/CLI ergonomics, naming, error-message quality, setup friction, the first
five-minute experience, docs surface the plan implies. Who the developer is and
their patience budget — not as a market, as a usability constraint.

### 4. Security & abuse (always)

Trust boundaries, input validation, authz, secret handling, injection (SQL / command
/ LLM-prompt), dependency supply-chain risk, anything that runs untrusted input. Note
severity. (Threat-model the build; this is not "is it worth securing".)

### 5. Independent reviewer pass

Resolve the adversarial reviewer per **`references/reviewer-agents.md`** in the
forge suite — explicit `wiki/.forge/config.yaml`, then `$FORGE_REVIEWER`, then
auto-probe `codex` → `gemini` → `claude`. State which one was picked and why
before invoking. If none is available or config says `reviewer: none`, state
the pass is skipped and continue (don't block).

Send the standard prompt envelope (from `reviewer-agents.md`) with the artifact
set to `wiki/plan.md` + `wiki/architecture.md`. For example, when the resolved
reviewer is Codex:

```
codex exec --skip-git-repo-check "$(cat <<'EOF'
You are an adversarial reviewer. Be concrete. Do not comment on whether the
project is worth building — only on the artifact's soundness.

Find: (1) the weakest assumption, (2) the most likely failure / missed case,
(3) the phase whose verifiable gate would PASS through a real regression.

List every finding with a severity (high/med/low) and a one-line proposed fix.
No hedging.

<<<
$(cat wiki/plan.md)

--- ARCHITECTURE ---
$(cat wiki/architecture.md)
>>>
EOF
)"
```

Swap `codex exec --skip-git-repo-check` for `gemini -p` or `claude -p` when
the resolver picks those.

Reconcile the reviewer's findings with yours. **Do not smooth over
disagreement** — where you and the reviewer disagree, say so explicitly and
carry it to the final gate for the user to decide.

### 6. Apply findings

- **Structural / objective** (a real gap, a weak gate, a missing edge case, an
  injection vector): fix `wiki/plan.md` in place — strengthen the phase, add a
  phase, harden the gate. Don't ask permission to fix something objectively broken.
- **Subjective / taste** (a tradeoff with no right answer): collect and present via
  AskUserQuestion in one batch — don't drip questions through the analysis. Each
  surfaced decision follows the **Decision Brief** shape (forge suite's
  `references/question-style.md`): concrete framing, named stakes, recommendation
  with the *why* and what would flip it.
- Any decision changed or introduced → ADR (or update an existing ADR's Status /
  add a "Validated in practice" note). Link from `wiki/index.md`.

### 7. Write up and hand off

Add a `## Review` section to `wiki/plan.md` (or update it): what each angle found,
what changed, what's an open taste decision, which reviewer ran, and any
unreconciled reviewer disagreement. Anti-sycophantic throughout: take
positions, state what evidence would flip them, don't hedge.

Recommend returning to `forge` for the final lock gate, or — if run standalone —
present the open taste decisions and reviewer disagreements directly, then
declare the plan locked.

## Rules

- Never produce a "kill the project" recommendation. Out of scope by charter.
- A finding without a concrete plan change or a surfaced decision is noise — drop it.
- Don't write feature code. The output is a harder plan, not an implementation.

## References

- forge suite's `references/reviewer-agents.md` — reviewer selection, invocation, prompt envelope
- forge suite's `references/question-style.md` — Decision Brief format for the taste batch
