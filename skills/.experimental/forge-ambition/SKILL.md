---
name: forge-ambition
description: Charter-safe ambition check — pressure-tests whether you're building the most ambitious version of the thing YOU already chose to build. Challenges self-imposed limits and timid premises; never asks about money, market, demand, or whether it's worth building. Auto-invoked by forge-discovery before the brief locks; also standalone. Use when asked "am I thinking big enough", "challenge this", "ambition check", or when a brief/plan feels smaller than it could be.
metadata:
  internal: true
---

# forge-ambition

The non-commercial core of a founder's rethink: *are you building the boldest
version of the thing you chose?* — with none of the gatekeeping.

## Charter (hard boundary)

The project is worth building; that is settled and never revisited. This skill
**only** pushes ambition *within the intent the user already chose*. It must never:
ask if it's worth building, raise money/market/demand/users, suggest pivoting to a
"better product", or expand scope toward a business. It expands scope only toward a
*more excellent version of the same thing*, and only with the user's consent. If you
can't make a suggestion without invoking value/market, don't make it.

## What it does

Run after a brief is drafted (or on demand against brief/plan). Read
`references/charter.md`, `wiki/brief.md`, and `wiki/plan.md` if it exists.

1. **Find the timid premises.** Where has the user unconsciously shrunk the idea?
   Look for: "just a simple…", "only…", "for now…", "v1 is minimal", defaults
   chosen for ease not for the vision, a hard part avoided rather than embraced.
   List them plainly.

2. **Describe the bolder version.** For the same intent and audience, what's the
   version that fully honors what makes this interesting — the harder/cleaner/more
   complete realization? Be concrete. Tie it to *their* stated goal and the feel
   they wanted, never to reach/scale/revenue. One or two vivid paragraphs, not a
   roadmap.

3. **Name the cost honestly.** What the bolder version actually takes (effort,
   difficulty, the hard part they'd have to face). No selling. The user decides
   whether the extra ambition is worth *their* time and interest — the only
   currency here.

4. **Offer it as a choice.** AskUserQuestion in the **Decision Brief** shape
   (forge suite's `references/question-style.md`): keep the current shape,
   adopt the bolder version, or take specific pieces. Take a position and say
   why, naming the effort/craft cost of each — but the timid version is a fully
   legitimate choice. "I want it small" ends it.

5. **Record the outcome.** If ambition changed: update `wiki/brief.md` (and the
   relevant ADR / `wiki/plan.md` if it exists) and tell the user. If unchanged,
   note that the scope was deliberately held — that's a decision worth recording
   too, so it isn't re-litigated later.

## Rules

- One register: enthusiasm for the *craft*, never persuasion toward *bigger for
  bigger's sake* and never toward a market.
- "Smaller on purpose" is a valid, respected answer — accept it without erosion.
- Never introduce a new audience, monetization, or growth angle. Same thing, bolder.
- Don't redesign the architecture here — that's `forge-plan`/`forge-harden`. This
  is about the *intent's* ambition, not the implementation.
