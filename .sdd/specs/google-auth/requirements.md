# Requirements Document

## Project Description (Input)
Let users register and sign in with Google ("Continue with Google"), in addition to the existing email/password authentication. Google sign-in both creates an account on first use and logs the user in on subsequent use, slotting into the platform's existing session model and the SSO-ready `auth_identities` table (which already permits a `google` provider with an external account id and no password hash). The OAuth exchange is performed server-side with secrets in environment configuration only; when Google is not configured, the option is simply unavailable and email/password continues to work.

## Introduction

LibraryLoop authenticates members today with email/password: credentials live in `auth_identities` (currently a `password` row per user), sessions are server-validated and revocable via a signed cookie, and the edge middleware gates routes using `getSessionUser()`. The data model was built **SSO-ready** — `auth_identities.provider` already allows `google`, with a shape constraint for Google rows (an external account id, no password hash) and uniqueness on `(provider, provider_account_id)` and `(user_id, provider)`.

This feature adds **"Continue with Google"** to the login and registration surfaces. Choosing it runs the **Google OAuth 2.0 / OpenID Connect authorization-code flow server-side**: on first use it **registers** a new member (creating the user and a `google` auth identity from the verified Google profile) and signs them in; on later use it **logs in** the existing user. Either way the result is the platform's normal revocable session, so all existing route gating and per-user authorization apply unchanged.

Security is paramount: the OAuth client secret stays in **environment configuration** and never reaches the browser; the flow uses an anti-CSRF **state** parameter (and OIDC nonce/PKCE); the returned Google identity is **verified** (issuer, audience, expiry, and `email_verified`) before any account is created or session issued; and tokens are not persisted beyond what's needed to establish identity. The feature is **additive** — email/password sign-in is unchanged, and when Google credentials are absent the Google option is hidden/disabled rather than erroring. No schema migration is required (the `google` provider already exists).

Requirements define WHAT must be achieved; the concrete OAuth mechanism (a minimal hand-rolled OIDC client vs. a library), endpoints, and components are chosen in the design phase. One product decision — how a Google sign-in relates to an existing password account with the same email — is captured in Requirement 4 and flagged in Open Questions.

## Requirements

### Requirement 1: Continue with Google entry points

**Objective:** As a visitor, I want a "Continue with Google" option on the login and registration pages, so that I can authenticate without creating a password.

#### Acceptance Criteria
1. The application shall present a "Continue with Google" action on both the login and registration surfaces.
2. When the visitor activates "Continue with Google", the application shall begin the Google authorization-code flow by redirecting to Google's consent screen.
3. While Google sign-in is not configured (its credentials are absent from the environment), the application shall not present the Google option and shall continue to offer email/password authentication.
4. The application shall keep email/password registration and login fully functional alongside the Google option.

### Requirement 2: First-time registration via Google

**Objective:** As a new user, I want signing in with Google to create my account, so that I don't need a separate registration step.

#### Acceptance Criteria
1. When a user completes Google sign-in and no account exists for that Google identity, the application shall create a new member user from the verified Google profile (name and email) and a corresponding `google` auth identity recording the Google account id, with no password hash.
2. When creating the member, the application shall populate the required profile fields (for example, a display name and an avatar color) from or derived from the Google profile.
3. After creating the account, the application shall establish an authenticated session and direct the user into the app as an authenticated member.
4. The application shall not create a password credential for a Google-registered user.

### Requirement 3: Returning login via Google

**Objective:** As a returning user, I want signing in with Google to log me into my existing account, so that I get a consistent identity.

#### Acceptance Criteria
1. When a user completes Google sign-in and a `google` auth identity already exists for that Google account id, the application shall sign in the associated user without creating a duplicate user or identity.
2. The application shall match the returning user by the stable Google account identifier, not by email alone.
3. After a successful returning login, the application shall establish the platform's normal revocable session.

### Requirement 4: Relationship to existing password accounts

**Objective:** As a user who already has a password account, I want Google sign-in with my verified email to access that same account, so that I don't end up with two separate accounts.

#### Acceptance Criteria
1. When a user completes Google sign-in whose verified email matches an existing member's email and that member has no `google` identity, the application shall link a new `google` auth identity to that existing user rather than creating a second account.
2. The application shall only link by email when the Google email is verified (`email_verified` is true).
3. While linking to an existing user, the application shall preserve that user's existing identities (e.g. the password credential remains usable).
4. The application shall enforce at most one `google` identity per user and one user per Google account id, consistent with the existing uniqueness constraints.

### Requirement 5: Server-side OAuth and secret handling

**Objective:** As a maintainer, I want the OAuth exchange done server-side with secrets protected, so that the integration is secure and consistent with the platform.

#### Acceptance Criteria
1. The application shall perform the authorization-code exchange and token/ID-token validation on the server; the client secret shall never be sent to or exposed in the browser.
2. The application shall read the Google client credentials and redirect URI from environment configuration only.
3. The application shall use an anti-forgery `state` value (and OIDC `nonce`/PKCE as appropriate) and shall reject a callback whose state does not match the initiating request.
4. Before creating an account or issuing a session, the application shall verify the Google ID token's issuer, audience, and expiry, and require a verified email.
5. The application shall restrict the OAuth redirect to its own allow-listed callback route and shall not store Google access/refresh tokens beyond establishing identity.

### Requirement 6: Session and authorization parity

**Objective:** As a signed-in user, I want a Google-authenticated session to behave exactly like a password session, so that the rest of the app is unaffected.

#### Acceptance Criteria
1. When Google authentication succeeds, the application shall issue the same kind of server-validated, revocable session (signed cookie) used by email/password sign-in.
2. The application shall apply the existing route gating and per-user authorization to Google-authenticated sessions with no behavioral difference.
3. When a Google-authenticated user signs out, the application shall revoke the session exactly as it does for password sessions.

### Requirement 7: Error handling and resilience

**Objective:** As a user, I want clear handling when Google sign-in cannot complete, so that failures are understandable and never leave me half–signed-in.

#### Acceptance Criteria
1. If the user denies consent or Google returns an error, the application shall return the user to the authentication surface with an understandable message and no account or session created.
2. If the Google email is not verified, the application shall decline to create or link an account and shall explain why.
3. If the callback is invalid (missing/mismatched state, invalid or expired token), the application shall reject the request without creating an account or session.
4. If account creation or linking fails, the application shall not establish a session and shall surface a recoverable error, leaving no partially-created account.

### Requirement 8: Non-regression and platform alignment

**Objective:** As a maintainer, I want Google auth added safely, so that existing authentication and quality gates are preserved.

#### Acceptance Criteria
1. The application shall preserve existing email/password registration, login, logout, session, and middleware behavior after Google auth is added.
2. The application shall require no database schema migration, using the existing `google` provider support in `auth_identities`.
3. The type-check, test suite, and production build shall remain green, with the OAuth flow covered by tests that do not depend on live calls to Google.

## Decisions and Open Questions

- **Account-linking policy (decided).** Auto-link a Google sign-in to an existing password account when the Google email is **verified** and matches (Requirement 4) — one account, both sign-in methods usable. Chosen because Google emails are verified and it avoids duplicate accounts.
- **OAuth mechanism.** Whether to implement a minimal hand-rolled OIDC authorization-code client (keeping the existing bespoke session system) or adopt an auth library. The existing session/`auth_identities` model is retained either way.
- **Config.** New environment variables for the Google client id/secret and the callback/redirect URI, plus a Google Cloud OAuth client (authorized redirect URI) — a setup step for whoever runs the app.
