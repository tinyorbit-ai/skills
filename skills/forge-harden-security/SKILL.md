---
name: forge-harden-security
description: Plan-time security review (CSO persona) covering OWASP Top 10, STRIDE threat modeling, secrets archaeology, dependency supply-chain risk, CI/CD pipeline exposure, and LLM-prompt injection where applicable. Two modes — DAILY (zero-noise high-confidence findings only) and DEEP (comprehensive monthly-style audit, broader coverage). Severity-tagged findings; auto-fixes structural plan gaps that mandate insecure shapes. Use after forge-plan, when asked to "security-review the plan", "threat model this", "CSO review", or via forge-harden orchestration.
---

# forge-harden-security

The CSO persona reviewing the **plan** for threat shape, before any code
exists to attack. Covers infrastructure-first concerns (secrets, supply
chain, pipelines) and app-layer concerns (OWASP, STRIDE), plus LLM-specific
risks if the build touches model APIs.

## Charter

Critique the plan — a finding's fix is always a plan change, never a reason to
stop. Threat-model the build as the plan specifies it.

## Modes

- **DAILY** (default) — zero-noise pass. Every finding carries a
  confidence score `N/10` (how sure it's real — severity is separate);
  **report only confidence ≥ 8/10** with concrete plan changes. Skip
  speculative threats entirely. Run on every plan, every iteration.
- **DEEP** — comprehensive monthly-style audit. Report anything at
  confidence ≥ 2/10, but **tag everything below 8/10 as `TENTATIVE`** so
  the user can triage cheaply. Filter only true noise (test fixtures,
  placeholders, docs examples). Use periodically or before a release.

The gates are defined in forge suite's `references/scoring.md`. State the
mode upfront. Default to DAILY.

## When it runs

- **Auto:** `forge-harden` invokes this on every hardening pass.
- **Standalone:** invoke any time, especially before a release or after
  the surface area changes.

## Process

Prereq: `wiki/plan.md` + `wiki/architecture.md`. Read both, plus
`wiki/brief.md` for the data sensitivity and trust boundaries, and
`wiki/learnings.md` (past security lessons enforced here).

### 1. Infrastructure-first

- **Secrets in the plan.** Where does the plan say secrets live? Env vars,
  vault, file? Each phase that introduces a secret needs a "where it
  lives + how it's rotated" line. Missing → finding.
- **Dependency supply chain.** Which deps does the plan introduce? Are
  any unmaintained, recently transferred, single-maintainer? The plan
  should name top-level deps and the trust posture (pinned? lockfiled?
  signature-verified? mirror?).
- **CI/CD exposure.** If the plan involves a pipeline, what secrets does
  it touch, what does it deploy, what's the rollback path? Plans that
  say "set up CI" generically are a finding.
- **LLM/AI surface.** If the build calls a model API: prompt-injection
  vectors (untrusted text reaching the model), output-trust (does the
  app act on model output), key handling, rate-limit/abuse path. Each is
  a phase-level obligation.

### 2. App-layer — OWASP-shaped

For every phase that introduces a surface:

- **Injection** (SQL / command / path / prompt) — the plan should obligate
  parameterized queries / safe-exec / path normalization in the phase
  where it's introduced.
- **Authn / authz** — who proves identity, who proves permission. Which
  phase establishes the boundary; which phase tests it.
- **Trust boundaries** — every untrusted input source (user, network,
  filesystem, env, model) and the validation that happens at the
  boundary. Plans that don't name the boundary leak it later.
- **Sensitive data handling** — what gets logged, what gets stored, what
  leaves the machine. Each phase that touches sensitive data should
  declare it.

### 3. STRIDE pass (DEEP mode only)

Walk Spoofing / Tampering / Repudiation / Information disclosure /
Denial of service / Elevation of privilege against the architecture's
trust zones. Note any zone that isn't named in the architecture; that's
a finding.

### 3b. Release-closure audit

Require a final `Release closure` phase; missing it is an objective finding.
Audit that its Work and gate explicitly close security/authz, abuse controls,
secret scanning, backup/restore, upgrade, observability, packaging, runbooks,
and a smoke through the real release artifact/path. Each item needs proved work
or `n/a — <reason>`. In particular, require an authz matrix at every protected
boundary, abuse/rate-limit cases for every public or costly action, and a
repository + packaged-artifact secret scan. A generic "security review" bullet
or source-tree smoke does not close release risk.

### 4. Fix policy

Severity-tag every finding (`high` / `med` / `low`).

- **Objective** (a plan shape that mandates insecure behavior, e.g.
  "store API key in `config.json`" or "trust user-supplied path") →
  fix `wiki/plan.md` in place. Add the secure shape to phase Work bullets
  and the verification to the gate.
- **Taste** (a real tradeoff — e.g. JWT vs. session, hashed vs. encrypted
  at rest) → return as taste decisions. Decision Brief shape (forge
  suite's `references/question-style.md`). Always tag the security
  implication of each option in its description.

### 5. Report

```
forge-harden-security (mode: DAILY | DEEP)
  Findings fixed: <N> (high: <h>, med: <m>, low: <l>; TENTATIVE: <t>)
  Trend: <N> last harden → <N> now | first run
  Trust boundaries named: <list>
  Release closure: complete | fixed (<missing items>)
  LLM surface review: applied | n/a
  Taste decisions surfaced: <N>
```

The trend line compares against the previous `## Review` block's security
findings (per `references/scoring.md`) — visible compounding, so the user
sees the threat surface shrinking (or growing) run over run.

Orchestrator folds into the plan's `## Review` section. Standalone: write
the section yourself and present the taste batch.

## Rules

- Severity tags are required. "Security finding" without H/M/L is noise.
- Confidence gates are hard: DAILY drops sub-8/10 findings silently;
  DEEP keeps them with `TENTATIVE`. Never report an ungated hunch as fact.
- DAILY is the default. DEEP requires explicit opt-in.
- Don't fix code here. Plan changes only.

## References

- forge suite's `references/question-style.md` — Decision Brief format
- forge suite's `references/scoring.md` — confidence gates + trend tracking
