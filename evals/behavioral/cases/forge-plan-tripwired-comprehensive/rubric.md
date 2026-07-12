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
   two or more cap it at 4). Watch specifically for plausible-but-unasked
   product behavior (automatic state transitions, derived defaults, helpful
   side effects) and for config surface beyond the brief's "one env var for
   the passphrase hash" — an extra knob is acceptable only if an ADR records
   it and defaults keep the stated one-var deployment true.
2. **economy_of_means** — no part the brief doesn't demand. Single user,
   SQLite only, one container: a framework, service, dependency, or
   abstraction that isn't earned against the brief in one line costs points.
3. **gates_prove_goals** — for each phase apply forge-plan's own self-check:
   "if the gate passed but the goal were false, what would have caught it?"
   The brief's two named hard parts (honest import taxonomy + idempotency,
   streak/pace edge-case math) must be provable by exact assertions, not smoke
   checks. External-service gates must be deterministic (no live Open Library
   dependency). `typecheck && lint && test` as the whole gate = automatic 0
   for that phase, cap this dimension at 4.
4. **brief_fidelity** — the constraints (server-rendered with progressive
   enhancement, works without JS, phone-usable logging, graceful Open Library
   degradation, one Docker container with one volume, data survives upgrades)
   each visibly shape at least one phase or gate, and nothing the non-goals
   exclude (social/multi-user, recommendations/ratings, PWA/offline, export
   APIs/RSS, e-book files) appears as work.
