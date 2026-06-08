# Decision Brief — the forge question-style

Every `AskUserQuestion` call in any forge skill should follow this shape. The
format is borrowed (lighter) from gstack's decision-brief pattern — enough
structure to surface a real choice, not so much that it turns every prompt
into ceremony.

## When to use it

Use the Decision Brief shape any time the question represents a **real
decision** the wiki should remember:

- Shape/architecture/library choices in `forge-plan`
- Unreconciled reviewer disagreements at the lock gate
- Taste batches at the end of `forge-harden`, `forge-review`, `forge-polish`, `forge-dx`
- Scope/ambition choices in `forge-ambition`
- Confirmation before irreversible-ish actions (`forge-ship` squash-merge)

Skip it (use a plain `AskUserQuestion`) for *micro* choices that won't ever be
referenced again — e.g. "should I create the next phase branch now?", "ok to
push?". A decision brief on every yes/no is noise.

## The shape

Each AskUserQuestion question has three required parts and one optional:

1. **The framing** — one sentence in the `question` text. Plain language, the
   *concrete tradeoff*, no jargon. Not "Which approach?" — "Do we accept slower
   first-paint to keep the SSR boundary clean, or move it client-side?"

2. **The stakes** — one short clause inside the question or the first option's
   description, naming what *actually changes about the build* depending on
   this choice. Not vague ("affects performance") — concrete ("phase 3's gate
   either runs in CI or has to be a manual check").

3. **Your read** — your recommendation, set as the **first option**, labelled
   with `(recommended)`, with the `description` carrying the *why* and what
   evidence would flip you. Anti-sycophantic — take a position; don't list all
   options as equals when one is clearly better in context.

4. **Optional: a Net line** — one-liner at the end of the `question` text
   summarizing the frame, when the framing itself runs long. Usually skippable
   if the framing is already tight.

## Each option's `description`

Concrete, not vague. Two rules:

- **State the tradeoff in build-terms.** Effort, surface area, gate
  verifiability, branch count, future flexibility — never "better UX" or
  "more scalable" with no further teeth.
- **Include the consequence the user has to live with.** "Picks A → phase 4
  becomes mandatory" reads true; "Picks A → cleaner architecture" reads sycophantic.

## Anti-patterns (don't)

- Dripping decisions one by one through a long analysis. Batch them at the end.
- Multi-question batches that mix micro confirmations with real decisions —
  split them.
- Listing options without a recommendation. Take a position.
- A "recommendation" that just repeats the framing without naming the *why*.
- Decision briefs on questions that won't be referenced again — that's the
  noise this format exists to prevent, not create.

## Example

A `forge-plan` library-choice question, in the right shape:

```
question:
  "Persist phase state to SQLite or to a flat JSON file? SQLite gives us
   transactional gates and survives concurrent writes; JSON keeps phase 1's
   gate to `node script.js && cat state.json` instead of a query. Recommend
   JSON for the prototype since phase 1's verifiable gate is the priority."

options:
  - label: "Flat JSON file (recommended)"
    description: "Keeps the phase-1 gate one shell line. Locks us into single-writer; we move to SQLite in phase 4 if concurrent reads land."
  - label: "SQLite from the start"
    description: "Transactional + survives concurrent writes. Costs phase-1 gate complexity (query-vs-grep) and a migration file before we know we need it."
```

If a question doesn't justify this much weight, just use a plain
`AskUserQuestion` — the format scales down to "what should I do next?" too.
