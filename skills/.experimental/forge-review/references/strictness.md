# Strict-mode & banned-escape-hatch matrix

`forge-review` enforces the strictest practical setting for the project's language,
with escape hatches **banned** (not "discouraged"). `forge-build` is expected to
write to this standard from the start. Detect the language(s) from the phase diff
and apply the matching row. If a stricter project config already exists, the project
config wins — never loosen it.

## TypeScript / JavaScript

- `tsconfig`: `"strict": true` (implies `noImplicitAny`, `strictNullChecks`, etc.)
  plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noImplicitOverride`, `noFallthroughCasesInSwitch`.
- **Banned:** `any` (explicit or implicit); `as` casts except provably safe narrowing
  (prefer type guards / `satisfies`); `as any`, `as unknown as`; `@ts-ignore` and
  `@ts-expect-error` without a one-line justification comment that names the reason;
  non-null `!` on values from I/O, parsing, or user input; `// eslint-disable` without
  justification; `Function`, `object`, untyped `JSON.parse` results.
- Plain JS: ban implicit globals, `==` (use `===`), unguarded truthiness on
  nullable; require runtime validation at boundaries (e.g. zod) since types are absent.
- Gate: `tsc --noEmit` clean **and** lint clean. Both must be green, shown.

## Python

- `mypy --strict` (or `pyright` strict) clean. Full type annotations on all public
  functions and class attributes.
- **Banned:** bare `Any` (use precise types / protocols / generics); `# type: ignore`
  without a specific error code and reason; `cast()` without justification; bare
  `except:`; mutable default args; untyped `dict`/`list` as public boundaries.
- Gate: type checker clean + linter (ruff/flake8) clean.

## Go

- `go vet` clean; `golangci-lint` (or staticcheck) clean with errcheck enabled.
- **Banned:** ignored `error` returns (`_ = f()` on an error); empty `catch`-style
  recovers that swallow; `interface{}`/`any` at API boundaries without reason;
  unchecked type assertions (use the comma-ok form).
- Gate: build + vet + lint + race-enabled tests green.

## Rust

- `#![deny(warnings)]` for the crate's own code; `clippy` clean at `-D warnings`.
- **Banned:** `unwrap()`/`expect()` on fallible paths outside tests/`main`-level
  setup; `unsafe` without a `// SAFETY:` comment justifying the invariant;
  `#[allow(...)]` without a reason; panics on user input.
- Gate: `cargo clippy -D warnings` + `cargo test` green.

## Other / unknown language

Apply the spirit: enable the compiler/linter's strictest mode, treat warnings as
errors, and ban any "ignore this check" mechanism unless accompanied by a written,
specific justification. If the language has no type system, require explicit runtime
validation at every trust boundary and document the absence as a constraint in
`wiki/architecture.md`.

## The escape-hatch rule

Any suppression (`ignore`, `disable`, `allow`, broad cast, force-unwrap) is a
**finding to fix**, not to wave through. The only acceptable suppression carries a
comment that (a) names the exact reason, (b) explains why the strict path is
genuinely impossible here, and (c) is narrow (one line/symbol, never file-wide).
Anything else: fix the underlying type/error instead. When a suppression is
genuinely justified, record the pattern in `wiki/learnings.md` so it's a known,
reviewed exception rather than drift.
