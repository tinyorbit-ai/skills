# <task — one line>

Size: L · Started: <YYYY-MM-DD> · Tool: <claude|codex> · Owner: <frontier model>

## Brief

Goal:        <one sentence>
Done when:   <observable>
Constraints: <what must not change>
Risk:        <none | the risky steps, named>
Unknowns:    <answered below through owner inspection or cited scout evidence>

## Decisions

- <decision — owner evidence — why this is the smallest correct shape>
- <risk — prevention and rollback>

## Steps

- [ ] 1. <what> — lane: <owner|mechanic> — files: <paths> — check: <command → expected> — rollback: <how> — risky: no
- [ ] 2. <what> — lane: owner — files: <paths> — check: <command → expected> — rollback: <how> — risky: yes
- [ ] 3. <what> (independent of 2) — lane: mechanic — files: <paths> — check: <command → expected> — rollback: <how> — risky: no

## Questions

<only decisions that materially change the result or authorize an irreversible action>

## Log

<one line per completed slice — step · model · check output · done | blocked | takeover>
