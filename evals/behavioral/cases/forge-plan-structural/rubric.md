# Rubric — does this plan honor the forge-plan contract in substance, not just shape?

Grade wiki/plan.md against the brief. Score 0–10; pass requires ≥ 7 AND no criterion
failing outright.

1. **Gates prove goals, not hygiene.** For each phase, apply the skill's self-check:
   "if the gate passed but the goal were false, what would have caught it?" A gate
   must name the command AND the observable output only that phase's work can
   produce. `typecheck && lint && test` (or equivalents) as the whole gate is an
   automatic fail for that phase.
2. **Phase 1 is a vertical slice.** It must produce something runnable that touches
   the real outcome (files actually moved or a real dry-run receipt printed) — not
   "set up the project", not scaffolding.
3. **Phases are self-contained.** A builder reading only one phase plus its linked
   ADRs could start work: goal, work bullets, and decisions are inline.
4. **The plan serves THIS brief.** Zero-dependency Node, never-delete, idempotency,
   the honest date-source receipt, and the 2,000-files/10s constraint each visibly
   shape at least one phase or gate. A generic file-organizer plan fails this.
5. **No invented scope.** Nothing the brief's non-goals exclude (no OCR, GUI,
   watching, cloud) appears as work.
