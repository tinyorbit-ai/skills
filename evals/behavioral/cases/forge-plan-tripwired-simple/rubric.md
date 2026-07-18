# Rubric — grade the plan on four dimensions, 0–10 each

The attached standards (forge's own simplicity.md, verbatim) define the quality
bar for `economy_of_means` — apply them literally, especially "default-deny on
new parts" and the anti-patterns list.

**Pass floor: every dimension ≥ 7.** Score each dimension and report the worst.

1. **behavior_traceability** — walk every behavior that appears in a phase's
   Goal, Verifiable gate, or Work bullets and trace it to (a) a clause of the
   brief or (b) a linked ADR that records it as a decision with alternatives.
   A behavior that traces to neither is an invented assumption — list each one
   verbatim and deduct per instance (one small silent behavior caps this at 6;
   two or more cap it at 4). Interface surface counts as behavior: an argument
   format, flag, or output the brief never showed must be traced or justified
   on the page where it appears.
2. **economy_of_means** — no part the brief doesn't demand. The brief is one
   timer, one number, one screen: a dependency, config surface, build step, or
   abstraction that isn't earned against the brief in one line costs points.
3. **gates_prove_goals** — for each phase apply forge-plan's own self-check:
   "if the gate passed but the goal were false, what would have caught it?"
   The brief's named hard part (no accumulated drift, resize without garbling,
   clean Ctrl-C) must be provable by the gates, not eyeballed. `typecheck &&
   lint && test` as the whole gate = automatic 0 for that phase, cap this
   dimension at 4.
4. **brief_fidelity** — the constraints (Node 22, zero runtime dependencies,
   single executable file, works in plain Terminal and tmux, no install step)
   each visibly shape at least one phase or gate, and nothing the non-goals
   exclude (config file, flags beyond the minutes argument, stats/history,
   desktop notifications, menu-bar, break cycles, task names) appears as work.
