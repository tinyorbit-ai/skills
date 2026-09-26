# Re-review

Load when a prior lizard review exists on this PR. A first review never needs this file.

## Delta re-review

When a prior lizard review exists and the diff has genuinely changed:

1. **Audit prior findings first** — resolve any prior finding the author disputed per
   the author-dispute rule below before anything else, including its re-earn and
   present-tense gates: a prior blocker only stays blocking if it clears the proof bar
   again on *this* head. A carried-forward finding is a decision, not a default.
   Then, for each blocking finding in the last lizard review, check the current head:
   resolved or still open? Record both lists in the receipts — for anything still
   open, record what re-proved it, not merely that it was reviewed. Label new findings as pre-existing misses,
   author-fix regressions, or lizard-fix regressions. Never imply that an old miss was
   caused by the new push.
   **A change lizard asked for is new code, not a resolved finding.** When a delta hunk
   exists because lizard prescribed it, review it at full depth as if it had arrived
   unprompted — never grade it `prior finding resolved ✓` and move on. Run the inverse
   test first: *what does this new guard, restriction, or fail-closed path now reject
   that used to work?* Enumerate the reachability grid of the state it rejects
   (`criteria.md` §3), including the caller that made the old permissive branch
   necessary. This is the highest-asymmetry stamp in the system — lizard wrote the
   requirement and is now grading it, so no second party is left to catch the gap, and
   an outage caused here is one lizard authored rather than missed.

2. **Review the delta** — fetch what changed since the last reviewed head:

   ```bash
   gh api "repos/<owner>/<repo>/compare/<lastReviewedHead>...<headRefOid>"
   ```

   Review the delta's hunks at full depth; re-read full files only where the delta
   touches them. The full-diff pass is only needed again when the delta itself would
   classify as T3 on its own.
3. Apply the scope-ratchet circuit breaker below. If the delta is mostly
   machinery requested by lizard, first test removing or narrowing that machinery.
4. If the only result is still-open prior blockers and the delta does not touch their
   causal path, post nothing on GitHub. Remove the reaction and append an
   `unchanged-blocked` ledger record. This includes merge-only heads whose feature
   diff and relevant context are unchanged.
5. Stamp when every prior blocker is resolved and the delta introduces nothing new.

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
