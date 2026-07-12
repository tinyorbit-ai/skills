# shelfie — wiki

One line: a self-hosted single-user reading tracker — ISBN add, session logging,
honest stats, Goodreads import.

## Project record

- [[brief]] — locked by forge-discovery
- [[plan]] — filled by forge-plan (7 phases, base branch `main`)
- [[architecture]] — v1 by forge-plan (stdlib-first Go monolith, SSR, pure-Go SQLite)

## Decisions

- [[decisions/0001-stack-stdlib-first-go-monolith]] — stdlib-first Go monolith, server-rendered
- [[decisions/0002-single-passphrase-auth]] — single passphrase, bcrypt hash, signed-cookie session
- [[decisions/0003-open-library-graceful-degradation]] — ISBN lookup degrades to manual entry
- [[decisions/0004-goodreads-import-model]] — import idempotency key, shelf mapping, skip taxonomy
- [[decisions/0005-stats-semantics]] — timezone, reading-day, streak & pace rules
- [[decisions/0006-sqlite-driver-and-migrations]] — pure-Go driver + migrations at boot

## Knowledge base

(none yet)
