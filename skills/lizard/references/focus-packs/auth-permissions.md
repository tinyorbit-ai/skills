# Auth and Permissions Focus Pack

Load when changed files or PR context mention authentication, authorization, permissions, roles, scopes, tenants, sessions, tokens, sharing, policy checks, admin/staff access, privacy boundaries, or erasure, masking and consent.

Look for:

- Client-side or UI-only checks where server-side enforcement is needed.
- List/detail/export/action paths with inconsistent permission checks.
- Tenant/user/org boundary leaks, IDOR-style access, or missing ownership validation.
- Role/scope expansions that grant more than intended or skip least-privilege reasoning.
- Authentication state, token, session, refresh, or logout changes that can leave stale access.
- Sensitive data exposed in logs, errors, URLs, analytics, webhooks, or job payloads.
- Tests that cover happy-path roles but miss denied/other-tenant cases.

Good findings cite the protected action or data boundary, explain who can gain or lose access incorrectly, and suggest the smallest enforcement point: central policy, server-side check, ownership validation, deny-by-default branch, or negative test.

Reference basis: OWASP ASVS and authorization cheat-sheet guidance.

## Field lessons

Field lessons from completed reviews. Each is a proof prompt, not a presumed finding: trace the current PR before raising anything.

- **A capability token must be bound to the exact resource it was issued for.** Signal:
  a share token, link or invitation code is validated, then caller input picks the type,
  scope, job or child record; soft-deleted links are found by raw ID. Proof: use one
  valid token against its own, a foreign and a deleted resource, and a split code with a
  foreign parent; does every cell refuse before the first durable write?
- **The authority checked must be the authority executed.** Signal: a check on stored
  scope while the sink reads an optional filter; a write helper that resolves a read
  policy; aggregate counters in place of per-item ownership; a fallback owner key once
  the live row is gone. Proof: trace a read-only, a foreign-tenant and a deleted-owner
  principal through every guard to the final query or write; does each fail closed there?
- **An erasure must reach every copy, not just the record it is keyed on.** Signal:
  personal data copied into child rows, logs or analytics; discovery through the current
  user row, the latest operation record or email only; an async rebuild from the parent.
  Proof: enumerate every copy and every key that finds it (identity-only, email-only,
  older audit entries), erase, then regenerate or resume a stale writer; does any raw
  value return? Check the base first: a gap the base already had is not this PR's.
- **A masking or consent rule must cover every sink the data reaches.** Signal: blanket
  masking narrowed to opt-in markers; a filename or title echoed outside a masked input;
  a server-side bridge for a vendor gated in the browser. Proof: enumerate every mounted
  route, DOM echo and server sink; is each masked, and does each honour declined,
  unknown and withdrawn choices at send time?
- **A superseded sign-in can still decide the live session.** Signal: credential writes
  after an awaited login, sign-in screens kept under pushed routes, catches that
  navigate as success, an old session's rejection handler, `max_age`. Proof: settle
  completed, cancelled, failed and late attempts across account switches; can one write
  credentials, pass as fresh, or end a newer session?
- **A content security policy binds every document and redirect in the flow.** Signal:
  library-served interstitials, auto-post or `noscript` fallbacks, form posts that
  redirect within the origin and then off it. Proof: walk each hop of the sign-in or
  switch flow; does every inline script carry the nonce, and does `form-action` allow
  each final target?
