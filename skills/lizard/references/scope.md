# Causal Scope & Economy

Maximum scrutiny. Fixed scope. Lizard should find every meaningful problem on the
reviewed head, but only problems causally owned by this PR may block it. A fact can
be severe and still be out of scope.

## The blocking test

Before severity, classify every candidate finding. It may block only when at least
one is true:

- **introduced** — the failure did not exist on the base branch;
- **worsened** — the diff increases its likelihood, impact, or blast radius;
- **newly reachable** — the diff exposes an existing unsafe path to a new caller or
  cohort; or
- **required for outcome** — the stated ticket outcome cannot be delivered safely
  without addressing it.

Run the base branch check: with the PR removed, does the same failure happen
with materially the same likelihood and impact? If yes, and the PR neither worsens
nor exposes it, classify it `pre-existing`. It can be a non-blocking follow-up, but
it cannot affect the verdict. Severity never overrides causality.

Use one provenance label in working notes and T3 output:

- `introduced-by-pr`, `worsened-by-pr`, `newly-reachable`, `required-for-outcome`
- `introduced-by-author-fix`, `introduced-by-lizard-fix`
- `pre-existing`, `scope-expansion`

On re-review, say candidly whether a newly noticed issue was missed on the earlier
head, introduced by the author's fix, or introduced by a lizard-requested fix. Do
not present a pre-existing miss as damage caused by the author.

## Economy is a hard gate

Maximize both the outcome and the economy of the means. New parts are default-denied.
Before proposing any fix, try in this order:

1. remove or narrow the unsafe behavior;
2. make a local change in the existing path;
3. reuse an existing repository mechanism;
4. defer a pre-existing concern to a follow-up.

A fix must change code, configuration, tests, or a concrete rollout plan. “Attach
evidence,” “provide an explain,” and similar review chores are not fixes. The
reviewer gathers evidence. If the reviewer cannot establish that a query scans or
is unsupported, ask a non-blocking question. If the repository proves the index is
missing, ask for the index or a bounded query path — not an evidence attachment.

**A fix that branches on an unchecked fact is not a fix.** Before prescribing anything
that rejects, restricts, or fails closed on a state, prove no legitimate producer
creates that state — the reachability grid in `criteria.md` §3 is that proof. Writing
“fail closed; *if* X must be supported, do Y instead” hands the author a fork the
reviewer was supposed to resolve, and the author will take the shorter branch. Resolve
it before posting, or prescribe the branch that keeps every existing producer working.
The burden scales with the prescription: telling an author to reject traffic demands
the same proof as telling them their code is broken.

Treat a proposed new service, RPC, schema, migration, reconciler, worker, feature
gate, or deploy sequence as a scope-brake trigger. First try subtraction or a local
fix. If the only safe option genuinely expands the project, report the trade-off and
require an explicit human scope choice; an automated review must not silently turn
it into a blocker with a prescribed architecture.

## Evidence that cannot exist before deploy

The latest linked issue criteria are authoritative. A criterion removed from the
ticket cannot remain an issue-fit blocker.

When production evidence genuinely cannot exist pre-deploy, accept a bounded
verification plan if exposure is contained and the plan names both verification and
rollback/disable steps. Withhold the stamp only when merging creates uncontrolled
high-risk exposure or the rollback is not credible. “Internal-only” does not erase
database, data-loss, payment, or security risk, but a controlled rollout with no
exposed cohort can bound it.

## Closure before every non-approval

Before **every** non-approval — not only the first — run a whole-PR closure sweep at
the tier's depth: all criteria, all triggered focus packs, every changed file, relevant
surrounding call sites, and existing human/bot review threads. Ask: “What blocker
already present on this head would otherwise appear only after these fixes?” Verify
each candidate independently and drop it if it does not survive. This promises
completeness for the current head, not immunity from bugs introduced by future fixes.

The sweep is an **enumeration, not a re-read**. For every unit the PR changes, walk the
reachability grid (`criteria.md` §3) and the whole behaviour family around the change:
if the PR makes a panel open, the family is every way it opens and closes — first
paint, dismissal, reload, navigation, focus. If the PR adds a guard, the family is
every producer of the guarded state and every non-target caller sharing its proxy
value. If the PR stores a new invariant, the family is every writer, reset, hydration,
copy, and mode switch. If parallel routes claim parity, the family is the same null,
empty, error, permission, query, and fragment cells on both sides. Report the family's
failures together, in one round. One bug found per family per round is the pattern
that turns a single review into four, and each extra round costs the author more than
the finding was worth.
