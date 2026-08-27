# Frontier-led phase execution

How a Forge phase uses Maximum Effort without surrendering Forge's lifecycle. This
changes who owns implementation leaves; it never changes phase order, branch discipline,
review, shipping, gates, or stop conditions.

Fallback: no `maximum-effort` installed means the current Forge context runs the phase
inline as before.

## One frontier owner per phase

The phase owner is Opus/Fable on Claude or Sol on Codex unless the user explicitly
selected another model or effort. It runs `forge-build` → `forge-review` → `forge-ship`
for one phase end to end. If the current context is already a suitable frontier model
or carries the user's explicit model choice, it stays there. Otherwise create exactly
one frontier phase owner before reading implementation source.

The owner keeps the phase goal, ADRs, architecture, risky decisions, integration, and
final gate in one context. It may delegate leaf work under Maximum Effort's live triage:

- Haiku/Luna for one bounded factual lookup;
- Sonnet/Terra for an exact reversible edit with locked behavior, known files, and a
  deterministic check;
- never a smaller model for ambiguity, root cause, auth, money, data, secrets,
  migrations, public-API decisions, design choices, or final integration.

A smaller delegate gets one attempt. The frontier phase owner takes over on ambiguity,
scope drift, missing evidence, or a red check. There is no weak-model repair loop.

## Forge remains the source of truth

| Maximum Effort concept | Forge phase |
|---|---|
| task owner | frontier phase owner |
| brief and plan | phase spec, ADRs, and `wiki/plan.md` |
| final check | phase's verifiable gate |
| independent review | `forge-review` |
| task record | `wiki/build-log.md` plus Maximum Effort ledger row |

Do not create or read `.maximum-effort/plan.md` for a Forge phase. Forge owns state and
re-entry. Maximum Effort owns only model allocation inside the phase.

## What the phase owner receives

- the phase goal, boundary, work, and `Design:` marker from `wiki/plan.md`;
- its branch and base branch;
- the relevant ADRs, architecture, learnings, and locked design materials;
- the verifiable gate verbatim;
- authority to run `forge-build` → `forge-review` → `forge-ship` for that phase;
- Maximum Effort's `references/delegation.md` and `references/runtime.md`;
- the instruction to collect every delegate result and never let a delegate spawn.

The prompt is the confirmation `forge-ship` needs before the squash. The phase owner
does not stop to ask about reversible implementation details. It returns
`BLOCKED(<reason>)` for a decision that belongs to the user.

## Ordering

Phases remain strictly sequential. Start the next phase only after the current phase
passes its gate and has a `wiki/build-log.md` entry. Two phase owners in flight would
race the base branch and break one-squash-commit-per-phase.

Mechanical delegates may overlap only when their files and checks are disjoint. Scouts
may run in parallel for independent factual questions.

## Stop conditions

The phase owner returns these to the Forge main thread:

| Condition | Result |
|---|---|
| one-way decision requiring user authority | `BLOCKED(one-way door — <decision>)` |
| gate still red after Forge's fix budget | `BLOCKED(gate red — <check>, <failure>)` |
| unlocked `Design: explore` marker | `BLOCKED(design unlocked — phase <n>)` |
| human/browser/device/dashboard gate | `BLOCKED(gate un-runnable — <exact check>)` |

The main thread applies Forge's existing one-phase or crack-on stop rules. Model
allocation never changes whether a phase may land.

## Ledger

Append one task-level row using Maximum Effort's current ledger schema. Record the
frontier phase owner, scout and mechanic counts, takeovers, Forge review, outcome, and
next-pool recommendation. `wiki/build-log.md` remains project history; the ledger is
spend and rework evidence.
