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

Treat a proposed new service, RPC, schema, migration, reconciler, worker, feature
gate, or deploy sequence as a scope-brake trigger. First try subtraction or a local
fix. If the only safe option genuinely expands the project, report the trade-off and
require an explicit human scope choice; an automated review must not silently turn
it into a blocker with a prescribed architecture.

## Scope-ratchet circuit breaker

The first review records the original outcome and baseline surface: changed files,
systems, additions, and deletions. On every re-review, compare the current surface.
Pull the brake when remediation roughly doubles it or adds a subsystem, RPC, worker,
reconciler, schema/migration, gate, or coordinated deploy.

When the brake fires, stop recursively hardening the expanded design. Reconsider the
earlier requested fix first: can it be removed, narrowed, or replaced locally? If
later findings only exist in machinery lizard asked for, prefer retracting that
machinery over perfecting it. Surface the scope decision to the human; do not keep
ratcheting automatically.

## Evidence that cannot exist before deploy

The latest linked issue criteria are authoritative. A criterion removed from the
ticket cannot remain an issue-fit blocker.

When production evidence genuinely cannot exist pre-deploy, accept a bounded
verification plan if exposure is contained and the plan names both verification and
rollback/disable steps. Withhold the stamp only when merging creates uncontrolled
high-risk exposure or the rollback is not credible. “Internal-only” does not erase
database, data-loss, payment, or security risk, but a controlled rollout with no
exposed cohort can bound it.

## First-pass closure

Before the first non-approval, run one final whole-PR closure sweep at the tier's
depth: all criteria, all triggered focus packs, every changed file, relevant
surrounding call sites, and existing human/bot review threads. Ask: “What blocker
already present on this head would otherwise appear only after these fixes?” Verify
each candidate independently and drop it if it does not survive. This promises
completeness for the current head, not immunity from bugs introduced by future fixes.

## Author disputes

An author's reply to a finding is evidence, not noise. When the author disputes a
finding — pre-existing, intended, handled elsewhere — verify the claim before the
next verdict: run the base branch check for "pre-existing", read the pointed-to code
for "handled elsewhere".

If the claim holds, concede plainly and reclassify — a blocking `introduced` finding
the author proves `pre-existing` becomes a non-blocking follow-up — then withdraw the
blocker in the next review. Never silently re-assert it.

If the claim fails, hold the finding and answer with the specific trace that
contradicts it. Respond to the author's argument, not past it.

Never repeat a disputed finding verbatim across rounds: each round concedes, narrows,
or strengthens the proof. Severity never overrides a verified dispute; causality
still governs.
