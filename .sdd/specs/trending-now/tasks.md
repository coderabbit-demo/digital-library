# Implementation Plan — trending-now

> **Jira (Epic [DL-52](https://coderabbit-demo.atlassian.net/browse/DL-52))** — one story per major task:
> Task 1 → DL-53 · 2 → DL-54 · 3 → DL-55 · 4 → DL-56 · 5 → DL-57 · 6 → DL-58 · 7 → DL-59 · 8 → DL-60 · 9 → DL-61 · 10 → DL-62 · 11 (+12) → DL-63.
>
> Sequenced foundation → providers → endpoints → UI → supersession → quality.
> `(P)` marks tasks runnable in parallel (no data dependency, no shared-file contention, no prerequisite review). Each sub-task targets ~1–3 hours.
> Throughout: additive/non-breaking, keep build + typecheck + tests green; no `any`; no `dangerouslySetInnerHTML`; provider secrets server-side only.

- [x] 1. Provider abstraction and normalized trending types
  - Define the shared `TrendingItem` shape, the `TrendingProvider` port (id, label, media type, configuration check, fetch), and the typed response envelope (per-source result with an `ok | unconfigured | error` status), plus a static provider registry.
  - Place the shapes in the shared types module so server and client use one source of truth; no I/O in this layer.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. (P) NYT Best Sellers provider (books)
  - Implement the books provider: read its key from env (configuration check), fetch the NYT best-seller list overview once (all lists) through an injectable fetch with a server-side revalidation cache, and normalize each book into a `TrendingItem` (creator = author, list label, rank, artwork, external id), de-duplicating across lists.
  - Present the data plainly (no re-ranking/filtering by user); expose only normalized fields, never the raw payload or key.
  - Unit-test the normalizer (overview JSON → items, de-dup, missing-field tolerance, https-only artwork).
  - _Requirements: 3.1, 3.2, 3.4, 4.2, 4.5, 4.6, 5.1, 5.2, 11.1, 11.4_

- [x] 3. (P) Spotify New Releases provider (music)
  - Implement the music provider: read client id/secret from env (configuration check), obtain and memoize a client-credentials app token server-side (refresh before expiry), fetch New Releases through an injectable fetch with a revalidation cache, and normalize each album into a `TrendingItem` (creator = artists, list label "New Releases", artwork, external url/id).
  - Never expose the token or credentials to the client; present plainly.
  - Unit-test the normalizer and the token-cache behavior with a mocked token endpoint.
  - _Requirements: 3.1, 3.2, 4.2, 4.3, 4.5, 4.6, 5.1, 5.2_

- [x] 4. Trending fan-out endpoint
  - Add an authenticated endpoint that runs all configured providers concurrently, isolates each one so a single failure or rate-limit yields that source's `error` status while the rest return `ok`, marks unconfigured providers without an indefinite load, and returns the typed per-source envelope. Support a per-source item limit (compact for Home) and an optional source filter.
  - Derive the acting user from the session; respect provider rate limits via the cache; fetch only the providers' specific endpoints (no open proxy).
  - Integration-test with an injected/mocked fetch: success, one-provider-error isolation, unconfigured provider, and the limit bound — no live external calls.
  - _Requirements: 3.3, 4.1, 4.4, 4.6, 5.3, 5.4, 6.1, 6.2, 6.3_

- [x] 5. Add-to-library endpoint and de-duping data access
  - Add a type-scoped find-or-create data-access helper (match an existing media item by media type + normalized title + creator) and an authenticated endpoint that adds a trending item: find-or-create the media item, upsert the user's library entry (default wishlist), record the activity so it appears in the Home feed, and evaluate achievement unlocks best-effort; report whether the item was newly created and whether the user already owned it.
  - Validate the request payload (type, title, creator, optional metadata per type, status) at the boundary; scope all writes to the session user.
  - Integration-test on the in-process database: create-then-add-again is de-duplicated (already owned), the activity is recorded, and a second user cannot affect the first's library.
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 6. Trending card component
  - Build the trending item card on the design system: artwork (or themed fallback), a source/list indicator and rank, title, creator, a media-type indicator, and an add-to-library control that calls the add endpoint and refreshes; indicate when an item is already in the user's library.
  - Convey source/rank/type/state by text and icon, not color alone; render externally-sourced text as text and use artwork only over https; keep the control keyboard-operable with a visible focus indicator.
  - _Requirements: 3.5, 7.1, 8.4, 10.1, 10.3, 10.4_

- [x] 7. Dedicated Trending page and navigation
  - Add the authenticated `/trending` route presenting the full feed grouped/labelled by source, with each source reflecting its status — healthy sources render cards, while unconfigured or failing sources show an accessible per-source notice rather than breaking the page — plus an overall empty state and an error state with a retry action.
  - Add a "Trending" destination to the persistent navigation with its active-state indication; rely on the existing route gating so the page and link require authentication.
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 3.3, 6.2, 6.4, 8.1, 8.2, 8.3, 10.2_

- [x] 8. Home "Trending Now" section
  - Add a compact "Trending Now" section to the Home dashboard alongside the existing stats, achievements, and community feed (without removing them), showing a small cross-source selection with the trending card and add action, plus loading/empty handling.
  - _Requirements: 1.1, 8.1, 8.3_

- [x] 9. (P) Supersede the nyt-recommendations spec
  - Mark the `nyt-recommendations` spec as superseded by `trending-now` (metadata note + a banner atop its requirements), confirm no separate Recommendations route or endpoint is introduced, and ensure the navigation uses the Trending destination — delivering NYT's substantive behavior through the books provider.
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 10. (P) Configuration, secrets, and local development
  - Ensure each provider reads its credentials only from environment variables and treats them as optional (a missing key degrades that source per the endpoint, never blocking app start), confirm the example env file documents all provider variables without real values and that real env files stay ignored, and document in the README how to obtain and configure each provider's credentials locally and on the host.
  - _Requirements: 4.2, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 11. Integration, isolation, and quality gate
  - Verify end-to-end behavior: graceful per-provider degradation (one source down, others render; all-down shows a non-crashing error with retry and other routes stay usable), add-to-library de-dup/isolation, and that provider clients are exercised only against mocked upstream responses (no live calls in CI).
  - Verify the platform invariants hold: existing routes/contracts/auth/session/middleware and per-user authorization preserved, server/client boundaries intact, responsive across breakpoints and accessible (keyboard, focus, reduced-motion, not color-alone) in light and dark, no `any`, no unsafe HTML, and build/typecheck/tests green.
  - _Requirements: 6.1, 6.4, 10.1, 10.2, 10.3, 10.4, 12.1, 12.2, 12.3, 12.4_

- [x]* 12. UI rendering tests for trending surfaces
  - Deferrable UI tests asserting the Trending page renders source groups with per-source status, the Home section renders a compact strip, and the card exposes an accessible add control and "already in library" state.
  - _Requirements: 1.1, 6.2, 8.1, 8.3, 10.3_
