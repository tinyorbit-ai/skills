# Re-review, Fingerprints, Receipts & Calibration

Three problems this solves: re-running the full battery on an unchanged tree wastes
the loop; reviewing a fix should cost a delta, not a replay; and a review that never
learns whether its greens held is unfalsifiable.

## Fingerprint

The phase diff's identity, stable across rebases and commit reshuffles:

```bash
git diff <base>...HEAD | git patch-id --stable
```

Record the current HEAD short-SHA and the patch-id in every review record line
(`head=` / `diff=`). If `git patch-id` is unavailable, hash a normalized patch
(`git diff <base>...HEAD | sed -E '/^(index |diff --git )/d' | shasum -a 256`) and
prefix `sha256:`. If no fingerprint can be computed, review — a duplicate review is
less bad than skipping a changed tree.

## Skip rule

On invocation, read the most recent review record for this phase from
`wiki/learnings.md`:

- **No record** → full review at the triaged tier.
- **Same `diff` fingerprint and the record ended green** → report "phase N already
  reviewed at this state (head `<sha>`, all green)" and stop. Nothing to re-earn.
- **Same fingerprint but the record was not green** → the previous run ended with
  open findings or an escape to forge-debug; resume the fix loop, don't restart the
  review.
- **Different fingerprint** → re-review (below).

## Re-review (delta)

1. **Audit prior findings first.** Every numbered finding from the last record:
   resolved or still open at the current tree, with evidence. Both lists go in the
   receipts. A still-open objective finding re-enters the fix loop immediately —
   before any new-finding hunt.
2. **Review the delta.** `git diff <lastReviewedHead>...HEAD` at full depth,
   re-reading full files only where the delta touches them. Run the complete
   battery on the whole diff again only when the delta alone would triage as deep.
3. **The terminal command block always runs in full.** The hand-off condition never
   shrinks, whatever the delta size.

## Receipts template

The review record line plus its receipts block, prepended to `wiki/learnings.md`:

```markdown
> review · phase 3 · tier deep · findings high/med/low 1/2/0 · passes 0–7 run · head a1b2c3d · diff patch-id:4f1e9 · terminal block green
>   passes: scope CLEAN · completion 5/5 DONE · security ✓ · tests ✓ (42 passing) · types ✓ · edges ✓ · simplicity ✓ (2 layers collapsed) · runtime ✓ · adversary codex ✓ (1 finding, confirmed + fixed)
>   beyond the diff: 9 surrounding files read · call sites of removed exports grepped, none remain
>   context: phase 3 spec · 4 learnings applied · ADR-007
>   prior findings: 3 resolved · 0 still open
```

Include a line only when it has content. At deep tier with no adversary available,
say so in the passes line (`adversary unavailable — pass skipped, disclosed`) —
degraded is acceptable, silent is not.

## Calibration — miss detection

At review start, before pass 0, scan base-branch history since the previous review
record's ship:

```bash
git log <lastReviewedShipPoint>..<base> --oneline -i --grep='revert' --grep='hotfix' --grep='fix'
```

For hits that predominantly touch files a previously green-reviewed phase owns, read
the change and judge: does it correct something that phase's review passed? The grep
is a heuristic; the judgment is the check. A confirmed miss appends a learning in
the standard format, tagged and confidence-rated:

```markdown
- [review-miss][8/10] 2026-07-04 · phase 2's review passed the order filter;
  hotfixed 3 days later — archived orders were excluded. Missed because the review
  read the write path but never traced the caller's read. Rule: trace one full
  read path for every changed query.
```

`review-miss` learnings are mandatory checks like any other learning — the tag
exists so this review's trend line and `forge-retro` can report the miss rate
legibly. Zero detected misses is also worth a line in the receipts on the first
review after a ship: calibration that never reports can't be trusted either.
