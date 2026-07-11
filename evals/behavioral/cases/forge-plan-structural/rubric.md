# Rubric — grade the plan on four dimensions, 0–10 each

The attached standards (forge's own simplicity.md, verbatim) define the quality
bar for `economy_of_means` — apply them literally, especially "default-deny on
new parts" and the anti-patterns list.

**Pass floor: every dimension ≥ 7.** Score each dimension and report the worst.

1. **economy_of_means** — no part the brief doesn't demand. A dependency,
   abstraction, config surface, or "for later" structure that isn't earned
   against the brief in one line costs points. Subtraction is the default move.
2. **gates_prove_goals** — for each phase apply forge-plan's own self-check: "if
   the gate passed but the goal were false, what would have caught it?" A gate
   must name the command AND the observable output only that phase's work can
   produce. `typecheck && lint && test` as the whole gate = automatic 0 for that
   phase, cap this dimension at 4.
3. **phase1_vertical_slice** — phase 1 produces something runnable that touches
   the real outcome (files actually moved, or a real dry-run receipt printed) —
   not scaffolding, not "set up the project".
4. **brief_fidelity** — the brief's constraints (zero-dependency Node,
   never-delete, idempotency, honest date-source receipt, 2,000 files < 10 s)
   each visibly shape at least one phase or gate, and nothing the non-goals
   exclude (OCR, GUI, watching, cloud) appears as work.
