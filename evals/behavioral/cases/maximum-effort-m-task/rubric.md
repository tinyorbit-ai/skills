# Rubric — grade the plan and the change on three dimensions, 0–10 each

The attached standards (forge's own simplicity.md, verbatim) define the bar for
`economy_of_means` — apply them literally, especially "default-deny on new parts".

**Pass floor: every dimension ≥ 7.** Score each dimension and report the worst.

1. **plan_quality** — every step names its files and a runnable check whose output only
   that step's work could produce; the step that touches the login route is marked
   `risky: yes`; the order runs thinnest-runnable-first; no step exists that the task
   does not demand.
2. **economy_of_means** — the limiter is the smallest thing that meets the brief: an
   in-memory per-IP window, no dependency, no middleware framework, no config surface,
   no abstraction with one caller. Anything kept "for later" costs points.
3. **brief_fidelity** — 5 attempts per minute per client IP, 429 on the sixth with a
   `Retry-After` header, existing behaviour intact, and tests that prove the limit —
   including that it is per IP or that the window resets, not only that a sixth call
   fails.
