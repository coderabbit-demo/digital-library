# Research & Design Decisions

## Summary
- **Feature**: `google-auth`
- **Discovery Scope**: Complex Integration (external OAuth/OIDC provider, security-sensitive) on top of the existing bespoke session/auth model.
- **Key Findings**:
  - The platform already has everything except the OAuth wiring: `auth_identities` permits a `google` provider (external account id, no password hash; unique on `(provider, provider_account_id)` and `(user_id, provider)`), and sessions are issued via `createSession(db, userId)` + `setSessionCookie` — the same primitives password login uses. **No schema migration.**
  - Google OIDC (verified via the discovery doc): authorization `https://accounts.google.com/o/oauth2/v2/auth`, token `https://oauth2.googleapis.com/token` (supports `client_secret_post` + PKCE `S256`), issuer `https://accounts.google.com`, scopes `openid email profile`; the ID token (RS256 JWT) carries `sub`, `email`, `email_verified`, `name`, `picture`, `iss`, `aud`, `exp`.
  - Because the authorization-code exchange is a **direct server-to-server HTTPS call** to Google's token endpoint, the returned ID token is trustworthy after validating `iss`/`aud`/`exp` (+ `email_verified`); JWKS RS256 signature verification is optional hardening (Google's own guidance). This keeps the client dependency-free.
  - Adopting a full auth library (e.g. Auth.js) would introduce a parallel session system; a **minimal hand-rolled OIDC authorization-code client** that reuses the existing session + `auth_identities` is the smaller, lower-risk change.

## Research Log

### Existing auth/session seam (reuse target)
- **Context**: Confirm Google sign-in can reuse the platform's session + identity model.
- **Sources Consulted**: [auth/session.ts](../../../src/lib/auth/session.ts), [auth/service.ts](../../../src/lib/auth/service.ts), [api/auth/login/route.ts](../../../src/app/api/auth/login/route.ts), [auth/cookie.ts](../../../src/lib/auth/cookie.ts), [schema.ts](../../../src/db/schema.ts).
- **Findings**: `createSession(db, userId) → { token, expiresAt }` then `setSessionCookie(token, expiresAt)` issues the revocable signed-cookie session; `resolveSession`/`revokeSession`/`getSessionUser` already gate routes. `registerMember` shows the create-user-then-insert-identity transaction pattern. `auth_identities` shape check forces `google` rows to carry `providerAccountId` and no `passwordHash`.
- **Implications**: Add a Google user-resolution service (find-by-sub → link-by-verified-email → create), then issue a session with the existing helpers. Mirror `registerMember`'s transaction + unique-violation handling.

### Google OIDC contract
- **Context**: Need exact endpoints/claims and a safe validation approach.
- **Sources Consulted**: [Google OIDC discovery](https://accounts.google.com/.well-known/openid-configuration), [Google OAuth web-server flow](https://developers.google.com/identity/openid-connect/openid-connect).
- **Findings**: authorization-code flow with `scope=openid email profile`, `state`, PKCE `code_challenge_method=S256`, and `nonce`; token endpoint returns `id_token` (+ `access_token`). ID-token claims include `sub` (stable id), `email`, `email_verified`, `name`, `picture`, `iss`, `aud`, `exp`.
- **Implications**: Start endpoint builds the auth URL and stashes `state`/`code_verifier`/`nonce`; callback verifies `state`, exchanges the code with the verifier, validates claims, and maps the profile to a user. No access/refresh token is stored.

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks | Decision |
|--------|-------------|-----------|-------|----------|
| Minimal hand-rolled OIDC client (chosen) | Two route handlers + a small `lib/auth/google` client, reusing existing session + `auth_identities` | No parallel auth system; keeps bespoke revocable sessions; dependency-light; fully testable with injected fetch | Must implement state/PKCE/claim-validation carefully | **Selected** |
| Auth.js / NextAuth | Adopt a library managing providers + sessions | Batteries-included | Parallel/!= session model, adapter to our schema, large surface, migration risk | Rejected |
| Access-token + userinfo (no ID token) | Skip OIDC, call userinfo with the access token | Slightly simpler | Loses ID-token claim validation/nonce; weaker | Rejected |

## Design Decisions

### Decision: Hand-rolled OIDC authorization-code client with PKCE
- **Context**: Req 5 (server-side, secret-safe, state/nonce/PKCE, claim validation).
- **Selected Approach**: A `lib/auth/google` module with pure helpers (build auth URL, PKCE verifier/challenge, state/nonce, exchange code via injected `fetch`, decode + validate ID-token claims). Two `nodejs` route handlers: `start` (redirect to Google, set a short-lived HttpOnly state cookie) and `callback` (verify state, exchange, validate, resolve user, issue session).
- **Rationale**: Smallest secure footprint that fits the existing model; injectable fetch keeps it unit-testable without contacting Google.
- **Trade-offs**: We own the security details (mitigated by tests + claim validation); ID-token signature verification is optional since the token arrives over the direct TLS exchange.

### Decision: Account resolution order — sub, then verified email, else create
- **Context**: Req 2/3/4 (register, returning login, link).
- **Selected Approach**: `resolveGoogleUser(db, profile)`: (1) existing `google` identity for `sub` → that user; (2) else a member whose email matches and `email_verified` → link a new `google` identity to it; (3) else create a new member + `google` identity. All in one transaction, handling unique violations like `registerMember`.
- **Rationale**: Matches by the stable `sub` (not email), auto-links verified emails (chosen policy), avoids duplicates, and respects the existing uniqueness constraints.

### Decision: State/PKCE carried in a short-lived signed HttpOnly cookie
- **Context**: Req 5.3 (anti-forgery) and the callback needing the `code_verifier`.
- **Selected Approach**: On `start`, store `{ state, codeVerifier, nonce }` in an HttpOnly, `SameSite=Lax`, short-TTL cookie (signed with `AUTH_SECRET`); the callback requires it, compares `state`, and clears it. `Lax` so the cookie returns on Google's top-level redirect.
- **Rationale**: Stateless, no server store; tamper-resistant via signing; one-time use.

### Decision: Explicit `GOOGLE_REDIRECT_URI` + config gate
- **Context**: Req 1.3, 5.2.
- **Selected Approach**: Read `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` from env; `isGoogleConfigured()` true only when all present. The login/register surfaces render "Continue with Google" only when configured; otherwise email/password is unaffected.
- **Rationale**: Deterministic redirect that must match the Google console; graceful absence mirrors the trending providers' "unconfigured" behavior.

## Risks & Mitigations
- **CSRF / replay** — `state` compared against the signed cookie; PKCE `S256`; `nonce`; one-time cookie cleared on callback.
- **Token/secret exposure** — secret + exchange server-side only; no access/refresh token persisted; only ID-token claims read.
- **Unverified email / spoofing** — require `email_verified` before create/link; match returning users by `sub`, not email.
- **Partial accounts** — create/link inside a transaction; issue the session only after it commits (Req 7.4).
- **Cookie not returned on redirect** — `SameSite=Lax` (not Strict) so the state cookie survives Google's cross-site redirect back.

## References
- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect) · [discovery doc](https://accounts.google.com/.well-known/openid-configuration)
- [src/lib/auth/session.ts](../../../src/lib/auth/session.ts) · [src/lib/auth/service.ts](../../../src/lib/auth/service.ts) — session + registration patterns to reuse.
