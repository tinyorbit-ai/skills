# Craft patterns — how the personas think

Named thinking moves the forge personas apply *while* reviewing — not a checklist to
recite, a set of reflexes to fire when the material triggers them.

Each persona's SKILL.md says which of these it leans on. Cite a pattern by name
when it drives a finding ("inversion: what makes phase 3 fail?") — the name keeps
the reasoning legible.

## Deciding

1. **One-way vs. two-way doors.** Classify every decision by reversibility ×
   magnitude. Two-way doors (most things): decide fast, note it, move on. One-way
   doors (framework, language, persistence, public API shape): slow down, ADR,
   reach the user. This is also `forge-harden --auto`'s principle 5.
2. **Inversion reflex.** For every "how does this phase succeed?" also ask "what
   would make it fail?" — then check the plan handles that path. The fastest route
   to the missing edge case.
3. **70% information is enough** for two-way doors. Don't gold-plate the analysis
   of a reversible choice; spend the saved attention on the irreversible ones.
4. **Proxy skepticism.** Is the gate still measuring the goal, or has it become
   self-referential? A test suite that passes while the feature is broken is a
   proxy that drifted. (This is forge's "the gate proves the goal" check, named.)

## Shaping

5. **Focus as subtraction.** The strongest move on a sprawling plan is what to
   *not* do — not for value reasons, for focus reasons. Fewer phases, each
   sharper. (`forge-harden-scope` TRIM's reflex.)
6. **Subtraction default (design).** If a UI element doesn't earn its pixels, cut
   it. Feature bloat kills the feel faster than missing features. The general
   discipline behind #5, #6, and #10 — economy of means — lives in
   `references/simplicity.md`.
7. **Constraint worship.** If you can only show 3 things on this screen, which 3?
   If the user gets one action, which one? Constraints force hierarchy; unlimited
   space produces undesigned things.
8. **Narrative coherence.** A hard decision needs a legible *why*, not consensus.
   The ADR's Why section is the test: if you can't write it cleanly, the decision
   isn't made yet.

## Hardening

9. **Edge-case paranoia.** What if the name is 47 characters? Zero results?
   Network fails mid-action? First run vs. thousandth? Empty states are features,
   not afterthoughts.
10. **Boring by default.** Choose the well-trodden path unless the interesting
    path *is* the point of the project (the brief's "hard/interesting part" is
    the one licensed exception). Novelty everywhere is risk nowhere accounted for.
11. **Idempotency reflex.** Anything that can run twice, will. Re-run safety is a
    design property, not an ops afterthought.

## Designing for people

12. **Hierarchy as service.** "What should the user see first, second, third?" is
    about respecting their attention, not prettifying pixels.
13. **Design for trust.** Every interface decision either builds or erodes trust —
    truthful loading states, honest error messages, no dead ends. Pixel-level
    intentionality about whether the thing feels dependable.
14. **Respect the developer's time** (DX variant of 12): every required step before
    first success is a tax; every unclear error message is a debt the user pays.
