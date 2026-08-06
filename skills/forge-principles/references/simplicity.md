# Economy of means

The forge quality bar has two axes, and both are maximized:

- **Outcome** — how good the result is at its job. Ambitious, excellent, complete.
- **Means** — how few parts achieve that outcome. Spare, performant, reviewable.

The best version is the one with the highest **outcome per part**. Simplicity here
is not the minimal or timid version — it is the discipline of spending no part you
don't need on an outcome you fully deliver. Perfection is reached not when there is
nothing left to add, but when there is nothing left to take away.

This governs the **software's** moving parts — not the plan's words. A plan or a
phase spec should be as thorough as the build needs; the economy you protect is in
the thing you ship.

## Subtraction is the default move

Before asking "what can we add", ask "what can we collapse, delete, or reuse".
Addition has to beat the subtraction it displaces, and the reason goes on the page.
Structure gets removed as readily as it gets added — more rigor is not more
machinery.

## Deleting is a first-class edit

This applies to code that already exists, not only to code being added. An unused
path is **removed, not deprecated** — git is the archive, and a compat shim with no
remaining caller is a part you are still paying for. Before keeping something "for
backwards compatibility" or "for maintainability", **name the caller** that needs
it; if you can't name one, it is already dead. "Someone might depend on it" is a
claim to check, not a reason to keep.

Removal earns its place the way addition does: the reason goes on the page. The
asymmetry to watch for is that adding always looks safe and deleting always looks
risky, so an unexamined default accumulates forever. Deleting what you superseded
is finishing the work, not extra scope.

## Tests are means, not outcome

Tests are part of the parts count. The outcome is *behavior that can't silently
regress*; tests are the means, and the same economy applies — the fewest tests that
would actually catch the regression. One test crossing the real seam beats five
mirroring the implementation. Duplicate assertions of an already-covered behavior,
mocks standing in for an object that could have been real, fixtures larger than
their assertion, and a suite too slow to run are all costs paid on every future
change. "More tests" is not more rigor, and coverage is not the outcome. A test
whose behavior was deleted goes with it.

## Default-deny on new parts

A new dependency, service, module, abstraction, or config surface is denied until it
earns its place against the brief in one line. "Might be useful later" does not earn
it. Inline over abstract until a second caller exists; reuse an existing path over a
new parallel one.

## Performant by the same logic

Economy of means is also runtime economy: small reviewable functions over giant
ones, the straightforward algorithm over an accidental quadratic, bounded work over
unbounded fan-out. Small and performant beats clever almost every time.

## "Sufficient" — kept tight so it can't be stretched

A design is sufficient when it delivers the brief's named outcome and honors its
non-goals, and nothing past them. That line is what decides whether a part is
load-bearing — without it, anything can be justified as "needed for quality".

## The seam with ambition

This governs *means*. `forge-ambition` and `forge-harden-scope` EXPAND govern
*outcome* — they push the result to be more excellent, never heavier. The boldest
version is the one that does the most with the fewest parts; a "bolder" idea that
needs a heavier system is usually a weaker idea wearing ambition.

## Tie-breaks — when economy collides with another principle

Economy is the principle most likely to be invoked against another one, usually
wrongly. The resolutions, in order of how often they come up:

- **vs. robustness.** An edge case that can *actually occur* is load-bearing, so
  handling it is outcome, not machinery. Speculative generality — a guard for a
  condition nothing can produce — is not. The test is whether you can name the input
  that reaches it.
- **vs. tests.** Coverage of real regressions is outcome. Duplicate assertions,
  implementation-mirror tests, mocks standing in for objects that could be real, and
  oversized fixtures are means, and means get trimmed.
- **vs. security.** Never. A control at a trust boundary is outcome by definition;
  "fewer parts" never justifies dropping validation, authz, or a secret's handling.
  Economy applies to *how* the control is built, never to whether it exists.
- **vs. the charter.** The charter wins outright. No economy argument may become
  "this is too many parts to be worth building" — that reopens a settled question
  (`charter.md`).

## Anti-patterns to catch

Speculative generality · premature abstraction · framework-for-a-script · config for
a value that never changes · pass-through layers · "just in case" code · parallel
implementations of a path that already exists · giant functions · gratuitous
quadratic complexity.

## When you visualize

Default to a disposable HTML file (a feedback board, a diff view, a specimen) over
prose or static images — cheap to make, easy to throw away, judged with the eyes.
See `references/design-feedback-board.md`.
