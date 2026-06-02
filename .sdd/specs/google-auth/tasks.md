# Implementation Plan

- [ ] 1. Google OIDC client and configuration
- [ ] 1.1 Add the configuration gate and document the env vars
  - Read the Google client id, client secret, and redirect URI from environment configuration, and expose a check that reports whether Google sign-in is fully configured; document the new variables in the environment example. Email/password must work whether or not Google is configured.
  - _Requirements: 1.3, 5.2_

- [ ] 1.2 Build the OIDC client (authorization-code + PKCE)
  - Provide pure helpers to: generate one attempt's anti-forgery state, PKCE verifier/challenge (S256), and nonce; build the Google consent URL with the openid/email/profile scope and code response type; exchange an authorization code (with the verifier) at the token endpoint server-side using an injectable fetch; and decode and validate the returned ID token (issuer, audience, expiry, nonce) requiring a verified email, returning a normalized profile or nothing.
  - Cover with unit tests (injected fetch, no live calls): URL/params, challenge derivation, code exchange success/failure, and claim validation accept/reject cases.
  - _Requirements: 1.2, 5.1, 5.3, 5.4_

- [ ] 2. Profile-picture column and Google user resolution
  - Add a single nullable profile-image column to the users table (and surface it on the user domain type), and generate the migration; this is the feature's only schema change.
  - Map a verified Google profile to a platform user in one transaction: return the user already linked to that Google account id; otherwise link a new Google identity to an existing member whose verified email matches; otherwise create a new member (name/email/avatar-color from the profile) with a Google identity and no password. Persist the verified https profile picture on create, and fill it on link only when the user has none (never clobbering an existing value). Handle concurrent-creation races and the existing uniqueness constraints; never create a password credential.
  - Cover with pglite integration tests: create-on-first-use (picture persisted), returning-by-account-id, link-by-verified-email (password still works; picture filled only when empty), no email-link when unverified.
  - _Requirements: 2.1, 2.2, 2.4, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 9.1_

- [ ] 3. Start and callback route handlers
  - Add the start endpoint: when configured, create the attempt material, set a short-lived signed HttpOnly state cookie, and redirect to Google; when not configured, decline.
  - Add the callback endpoint: reject denied consent and missing/mismatched state; exchange the code; validate the ID token; resolve the user; issue the platform's revocable session and clear the state cookie; on any failure redirect back to the auth surface with a recoverable message and no session or partial account.
  - Cover with integration tests using a stubbed exchange/verify and pglite: success issues a session; denied consent, state mismatch, and invalid token each redirect without a session.
  - _Requirements: 2.3, 3.3, 5.3, 5.5, 6.1, 6.3, 7.1, 7.2, 7.3, 7.4_

- [ ] 4. Continue-with-Google entry points
  - Add a "Continue with Google" action to the login and registration surfaces that begins the flow, rendered only when Google sign-in is configured; leave the email/password forms unchanged.
  - _Requirements: 1.1, 1.4_

- [ ] 5. Profile picture in the site header
  - Display the signed-in user's stored profile picture as their avatar in the persistent header, loaded over https without a referrer, wrapped by the existing link to the Profile page; fall back to the initial-and-color avatar when there is no picture or the image fails to load. Pass the user's picture URL from the app layout into the navigation.
  - Cover the picture and fallback (including image-load error) with a component test.
  - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 6. Session parity and full verification
  - Confirm Google-authenticated sessions are gated and revoked identically to password sessions (reusing the existing session/middleware/logout), run the type-checker, test suite, and production build, and verify email/password authentication and all other surfaces are unchanged apart from the single additive avatar column.
  - _Requirements: 6.2, 8.1, 8.2, 8.3_
