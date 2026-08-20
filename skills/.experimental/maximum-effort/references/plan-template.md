# <task — one line>

Size: <M|L> · Started: <YYYY-MM-DD> · Tool: <claude|codex>

## Brief

Goal:        <one sentence>
Done when:   <observable>
Constraints: <what must not change>
Risk:        <none | the risky steps, named>
Unknowns:    <answered below, one per scout>

## Findings

- <scout 1 — files / symbols / callers / tests / risk, condensed to what the plan uses>
- <scout 2 — …>

## Steps

- [ ] 1. <what> — files: <paths> — check: <command → expected> — rollback: <how> — risky: no
- [ ] 2. <what> — files: <paths> — check: <command → expected> — rollback: <how> — risky: yes
- [ ] 3. <what> (independent of 2) — files: <paths> — check: <command → expected> — rollback: <how> — risky: no

## Questions

<open questions for the user. L stops here until they are answered; M lists them and
proceeds on the recommended answer, marked as such>

## Log

<one line per lane run — step · lane · model · DONE | BLOCKED(why) — and one per re-plan>
