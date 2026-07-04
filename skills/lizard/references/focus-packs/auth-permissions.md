# Auth and Permissions Focus Pack

Load when changed files or PR context mention authentication, authorization, permissions, roles, scopes, tenants, sessions, tokens, sharing, policy checks, admin/staff access, or privacy boundaries.

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
