# 0001 — Zero-dependency Node

- **Status:** accepted (Phase 1) · part of [[index]]
- **Context:** the tool must run anywhere Node ≥ 20 exists, with no install step,
  and the parsing need is RFC-4180-minimal.
- **Decision:** plain Node, `node:fs` + `node:test` only; no CSV library.
- **Why:** a dependency for splitting commas is machinery the brief doesn't demand;
  install-free is part of the "instant, boring" feel.
- **Alternatives considered:** `csv-parse` (handles quoted fields we don't need
  yet; adds an install), Bun (not on every target machine).
- **Consequences:** quoted-comma fields are out of scope until a real file demands
  them; if that happens this ADR is superseded, not bent.
