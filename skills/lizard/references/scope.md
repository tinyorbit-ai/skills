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
every producer of the guarded state. Report the family's failures together, in one
round. One bug found per family per round is the pattern that turns a single review
into four, and each extra round costs the author more than the finding was worth.

## Late findings are the reviewer's, not the author's

On re-review, every new finding names the head on which its code first became
reachable. If lizard already reviewed that head, the finding is a **miss**, and the
comment says so plainly: “missed on the round-N review — your push did not cause
this.” It still blocks at its own severity; a real problem does not stop being one
because it surfaced late. What changes is the story the author is told — never let a
miss read as damage they introduced.

Round-after-round discovery is a review failure even when every finding is real.
Record it: append a `late-finding` ledger line naming the missed cell and the sweep
that should have enumerated it, so the pattern shows up in calibration instead of only
in the author's patience.

## Author disputes

An author's reply to a finding is evidence, not noise. When the author disputes a
finding, verify the claim before the next verdict. Each kind of dispute has its own
check — find the kind first, because an unrecognised dispute must never fall through
to "hold by default":

| Dispute | The check |
|---|---|
| **Pre-existing** | Run the base-branch check. |
| **Handled elsewhere** | Read the pointed-to code. |
| **Intended** | Read the stated intent against the linked issue/PR description. |
| **Magnitude** — "real, but not at this scale" | Check the cited measurement (row counts, table size, traffic, timings) and whether the bound they claim actually holds in the code. |
| **Mechanism** — "the fix you asked for cannot work" | Check the mechanism itself. If the prescribed fix is genuinely not implementable, the finding is **void until re-derived** with one that is. |

If the claim holds, concede plainly and reclassify — a blocking `introduced` finding
the author proves `pre-existing` becomes a non-blocking follow-up — then withdraw the
blocker in the next review. Never silently re-assert it.

If the claim fails, hold the finding and answer with the specific trace that
contradicts it. Respond to the author's argument, not past it.

**A partially-conceded finding must re-earn its severity.** Conceding two of three
sub-claims and carrying the third forward is not automatic. The surviving remainder
stands alone now, so charge it the full `SKILL.md` proof burden again, on the current
head, as if posting it fresh — the original severity does not transfer. If the
remainder only clears the bar as a hypothetical, it is a non-blocking follow-up.

**Present tense or it does not block.** A blocker must name behaviour provable on
*this* head. "Unbounded **as the table grows**", "will not scale **once** traffic
rises", "becomes a problem **when** the collection is large" — a future-tense residue
is unfalsifiable by construction, and reaching for one is the tell that the finding
was conceded in substance and kept in form. Note the growth risk as a follow-up, and
stamp. A measured present-scale bound answers an unmeasured growth claim; if you
believe the measurement is wrong, refute the number, don't restate the fear.

Never repeat a disputed finding verbatim across rounds: each round concedes, narrows,
or strengthens the proof. Narrowing is not automatically progress — a finding that
narrows every round while never gaining proof is being kept alive past its evidence;
drop it. Severity never overrides a verified dispute; causality still governs.

Receipts record the *disposal*, not the reading. "Author's dispute checked ✓" against
a still-standing blocker is not a receipt — say which claims were verified, which
held, and why what remains still blocks.
