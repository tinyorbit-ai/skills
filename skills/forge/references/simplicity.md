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

## Anti-patterns to catch

Speculative generality · premature abstraction · framework-for-a-script · config for
a value that never changes · pass-through layers · "just in case" code · parallel
implementations of a path that already exists · giant functions · gratuitous
quadratic complexity.

## When you visualize

Default to a disposable HTML file (a feedback board, a diff view, a specimen) over
prose or static images — cheap to make, easy to throw away, judged with the eyes.
See `references/design-feedback-board.md`.
