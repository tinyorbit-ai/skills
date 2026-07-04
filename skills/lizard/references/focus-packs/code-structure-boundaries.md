# Code Structure and Boundaries Focus Pack

Load when the PR is a broad refactor, adds a new subsystem, changes many files across modules, introduces shared helpers/abstractions, touches public package/module interfaces, or makes a focused change that spreads through surprising areas.

Look for:

- Long functions/files where the changed behavior mixes separate responsibilities, hides testable logic inside integration glue, or makes the stated issue harder to verify.
- New abstractions that are thin wrappers, over-generalized, named too broadly, or reinvent an existing local helper.
- Duplicated setup or repeated literals that obscure intent and would make future fixes inconsistent.
- Module boundaries that turn a narrow module into an accidental hub, create cycles, or make dependencies point in the wrong direction.
- Public interface changes that are broader than the stated issue needs.
- Dead/orphaned code risk introduced by moving responsibilities, deleting branches, or replacing a layer.

Good findings stay review-sized: name the structural risk and suggest a direction, not a full refactor plan. If the better structure is larger than the PR, mention it as follow-up unless the current shape creates a `P1`/`P2` issue for the stated change.

