---
name: forge-dx
description: Live developer-experience audit for dev-facing builds — actually runs the getting-started flow, times hello-world, screenshots error messages, and evaluates CLI help and docs, producing a scorecard with evidence. Auto-invoked by forge-review when the build is developer-facing; also standalone. Use when asked to "test the DX", "DX audit", "try the onboarding", or after shipping a CLI/API/SDK/library phase.
metadata:
  internal: true
---

# forge-dx

Tests the *experienced* developer journey by living it, not by reading the plan
(that's `forge-harden`'s DevEx angle). For libraries, APIs, CLIs, SDKs, tools.

## Charter

The project is worth building and worth being a pleasure to integrate. DX quality is
about respect for the developer's time and attention — never about adoption metrics
or market positioning.

## When it runs

- **Auto:** `forge-review`'s runtime pass invokes this when the build is
  developer-facing (CLI/API/SDK/lib), scoped to what the phase changed.
- **Standalone:** full onboarding audit on demand.

If the build isn't developer-facing, say so and exit.

## Process

1. **Be a first-time developer.** From a clean state, follow only what a real
   developer would have: the README / docs / `--help`. No insider knowledge. Read
   `wiki/learnings.md` first — past DX rules are enforced.

2. **Run the real flow and instrument it:**
   - **Time-to-hello-world (TTHW):** from "I have nothing" to "it did the thing
     once". Record the actual minutes and every step taken.
   - **Install/setup:** does it work as documented, exactly? Note every gap between
     docs and reality.
   - **First call / first command:** run it for real. Capture stdout/stderr.
   - **Error experience:** deliberately do it wrong (missing arg, bad input, no
     auth). Screenshot/paste the actual error messages. Are they actionable or
     cryptic? An unhelpful error is a finding.
   - **CLI help / API surface:** is `--help` / the signature self-explanatory?
     Naming consistent? Surprises?
   - **Docs:** can the core task be completed from docs alone? Where did you get
     stuck or have to read source?

3. **Scorecard with evidence.** Rate each (TTHW, setup, first-success, errors,
   help/docs, naming) with the concrete observation behind the score — real
   numbers, real quotes, real screenshots. No score without evidence.

4. **Fix and capture.** Objective defects (wrong docs, broken setup step, cryptic
   error with an easy better message, missing `--help`) → fix on the phase branch
   and re-verify. Subjective calls → one AskUserQuestion batch in the **Decision
   Brief** shape (forge suite's `references/question-style.md`): concrete
   framing, named stakes, recommendation with the *why*. Append the
   rule-to-remember to `wiki/learnings.md`; deferred polish → `wiki/improvements.md`.
   Tell the user what you changed and captured.

## Rules

- Evidence-first: TTHW is a measured number, errors are pasted verbatim.
- Real clean-state run — no "it would probably work".
- Fix objective DX defects automatically; surface only taste.
- Phase branch only; never ship here.
- Judge respect-for-developer-time, never adoption/market.
