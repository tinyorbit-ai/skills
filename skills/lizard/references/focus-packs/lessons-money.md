# Money Lessons

Load when the PR changes charges, refunds, payouts, splits, fees, tax, currency or rounding, billing or credits, payment providers, checkout payment gates, or code that reads paid or refunded state.

Field lessons from completed reviews. Each is a proof prompt, not a presumed finding: trace the current PR before raising anything.

- **Rounded parts must conserve the total at the provider's rounding level.** Signal:
  totals, splits, fees or refunds rounded independently; a currency with a larger charge
  increment; per-line versus per-document tax. Proof: name the level and increment the
  provider rounds at, enumerate every amount writer (creation, recalculation, each refund
  or transfer), and cross multi-line, zero-decimal, exact-half and replay cases; do the
  rounded parts sum to what the provider moved, with the residual named?
- **An amount must keep its unit and precision through every hop.** Signal: float32 or
  `Float` wire types, a display-rounded string rebuilt into a stored row, display digits
  that differ from storage digits, nominal amounts in two currencies combined. Proof:
  carry a fractional value near a rounding boundary through the real serializer, parser,
  renderer and query binding; does each hop return the stored value, and is each side
  converted at its own rate before amounts are combined?
- **Paid and refunded state must read every place the ledger records it.** Signal: a
  balance, credit or dispute check over one table or payment id; refunds stored as
  separate reversals or on a legacy record; one charge shared by several rows; "latest
  payment" picked before filtering by category. Proof: enumerate every refund writer and
  storage branch, created-but-unsettled refunds, provider-side changes and shared
  charges; does each check count every returned amount exactly once?
- **The recorded amount must be the amount that moved.** Signal: a tax finalizer, quote
  or recompute runs after a charge or after a seeded paid amount, with a divergence alarm
  placed after the durable write. Proof: carry a changed recomputed total through the
  transaction, receipt, financial data and payout; does any record differ from what the
  provider charged?
- **A refund quote and its executor must agree.** Signal: funding modeled by several
  independent settings, a quote that sums sibling balances, an executor that always
  includes parent rows. Proof: cross each single-setting change and positive versus
  exhausted parent and companion balances through both the quote and the executor's row
  selection; do they ever disagree on who pays or what is refunded?
- **A payment gate must cover every route to paid.** Signal: a new checkout gate or
  eligibility check; fields named for one provider; client secrets already issued; free,
  offline, repair or webhook completion paths. Proof: build provider ×
  not-issued/pending/paid × completion-path cells from each provider's real paid
  representation; can a stale secret, another provider, a synthetic event or a free-only
  mutation reach paid while the gate refuses?
- **Money that moved needs an owner until its outcome lands.** Signal: local paid state
  before an accounting handoff, deferred fulfillment, checkout identity held only in
  browser storage, a late completion that rejects superseded intents. Proof: stop the
  flow at each durable boundary and deliver the webhook early, late or twice; does every
  succeeded payment end applied or refunded, with a visible retry path?
