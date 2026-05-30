# Requirements Document

## Project Description (Input)
Trending Now — a multi-source feed of popular/best-seller lists (NYT books, Spotify music, …) normalized into a trending feed, shown as a Home dashboard section and a dedicated page; supersedes the nyt-recommendations spec by making NYT the books provider under a pluggable provider abstraction; server-side provider clients read keys from env, with add-to-shelf, caching, and graceful per-provider degradation

## Introduction

**Trending Now** adds external discovery to LibraryLoop: a feed of what's popular right now, sourced live from third-party "popular/best-seller" lists across media types — the **New York Times Best Seller lists** for books and **Spotify** for music to start, extensible to further sources. Items from every source are normalized into a single **trending item** shape and presented two ways: a compact **"Trending Now" section on the Home dashboard** and a **dedicated page** (its own authenticated route + navigation destination) for the full, source-grouped view.

This feature **supersedes the planned `nyt-recommendations` spec**: rather than a books-only "Recommendations" page, NYT becomes the **books provider** under a **pluggable provider abstraction**, so the same UI and feed serve every source and new providers slot in without UI or feed changes.

Because each provider requires secret credentials that must never reach the browser, all upstream calls are made by **server-side provider clients** invoked through the application's own authenticated endpoint(s); keys come from environment configuration only. The feature is resilient by design — if one provider is unconfigured, rate-limited, or failing, the others still render (**graceful per-provider degradation**) — and economical, via **server-side caching** within provider rate limits. Readers can **add a trending item to their library** (creating the media item if needed, recording an activity), connecting discovery back to the personal library.

The feature builds **additively** on the shipped media-platform-v2 platform (Next.js 15 App Router + React 19, Postgres/Drizzle, session auth, the Tailwind v4 + shadcn design system, the enriched media card, and the typed Route Handler + DAL conventions). It must not break existing routes, contracts, auth/session/middleware behavior, or per-user authorization, and the build, type-check, and test suite stay green.

Requirements define WHAT Trending Now must achieve; concrete provider clients, endpoints, schemas, and components are produced in the design phase.

## Requirements

### Requirement 1: Trending surfaces — Home section and dedicated page

**Objective:** As a signed-in reader, I want trending content both on Home and on its own page, so that I can glance at what's popular and also browse the full list.

#### Acceptance Criteria
1. The application shall present a "Trending Now" section on the Home dashboard, alongside the existing stats, achievements, and community feed, without removing them.
2. The application shall define a dedicated authenticated route for the full trending view and add a corresponding destination to the persistent navigation, using the platform's data-driven navigation model.
3. While the trending route is active, the application shall present the trending page as the primary content and indicate its navigation destination as active (`aria-current`).
4. When the app is loaded directly at, or refreshed on, the trending route, the application shall render the page without a 404.
5. While a user is not authenticated, the application shall not render the trending page or its navigation destination and shall direct the user to the authentication surface, consistent with the platform's route gating.

### Requirement 2: Pluggable provider abstraction

**Objective:** As a maintainer, I want trending sources behind a common provider abstraction, so that new sources can be added without changing the feed or UI.

#### Acceptance Criteria
1. The application shall define a provider abstraction in which each provider supplies trending items for a media type from an external popularity/best-seller source.
2. The application shall normalize items from every provider into a single shared, typed trending-item shape so that the feed and UI render any source without per-source branching.
3. Where an additional provider is added, the application shall surface its items through the existing trending feed and UI with no change to the feed-rendering or card logic.
4. The application shall attribute each trending item to its source and media type so that the multi-source breadth is visible to the reader.
5. The application shall expose, for each provider, only the normalized fields the client needs (for example: title, creator, media type, source, the list/ranking it appears on, and artwork where available), not the raw upstream payload.

### Requirement 3: Live, plain trending content per source

**Objective:** As a signed-in reader, I want current best sellers and popular items shown as-is, so that the feed is timely and authoritative rather than computed from the local catalog.

#### Acceptance Criteria
1. When the trending surfaces load, the application shall obtain live trending data from each configured provider (initially NYT Best Seller lists for books and Spotify for music).
2. The application shall present trending items as a plain pull, without re-ranking or filtering by the signed-in user's profile preferences or library history.
3. The application shall group or label trending items by their source and/or list so that the reader can see which source and list each item comes from.
4. If the same item appears more than once within a source's lists, the application shall avoid rendering it as a confusingly exact duplicate (for example, by de-duplicating or clearly attributing each listing).
5. The application shall present trending content for each supported media type using the platform's enriched media-card visual language, with a clear source/ranking indicator.

### Requirement 4: Server-side provider clients and secret handling

**Objective:** As a maintainer, I want all provider access mediated server-side, so that secrets never reach the browser and the integration is secure.

#### Acceptance Criteria
1. The application shall request all upstream provider data from server-side provider clients invoked through the application's own endpoint(s), and the browser shall obtain trending data only through those endpoints.
2. The application shall read each provider's credentials (for example, `NYT_API_KEY`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`) from server-side environment variables only and shall never return them to the client or include them in client-delivered code or responses.
3. Where a provider requires a token exchange (for example, Spotify client-credentials OAuth), the application shall perform and refresh that exchange server-side and shall not expose provider tokens to the client.
4. The application's trending endpoint(s) shall require an authenticated session, consistent with the platform's other data endpoints.
5. The application shall fetch only the trending data needed for the feature and shall not act as an open proxy to arbitrary provider or third-party endpoints.
6. The application shall return trending data as a typed JSON shape shared between server and client, rather than the raw upstream payloads.

### Requirement 5: Caching and rate limiting

**Objective:** As a maintainer, I want trending responses cached and throttled, so that repeated visits stay within each provider's quota and the surfaces stay responsive.

#### Acceptance Criteria
1. The application shall cache each provider's trending response server-side for a defined period so that repeated visits do not issue a new upstream request each time.
2. While a cached provider response is valid, the application shall serve the cached data instead of calling the provider.
3. The application shall issue upstream requests in a way that respects each provider's rate limits, avoiding redundant concurrent upstream requests for the same data.
4. If a provider responds with a rate-limit status, the application shall serve cached data when available or surface a non-crashing per-source error, rather than failing the whole feed.

### Requirement 6: Graceful per-provider degradation

**Objective:** As a signed-in reader, I want the feed to keep working when one source is down, so that a single provider failure never breaks discovery.

#### Acceptance Criteria
1. If one provider is unconfigured, errors, or is rate-limited, the application shall still render the trending items from the remaining healthy providers.
2. If a provider fails, the application shall convey that source's unavailability within the feed (a per-source empty or error indication) without crashing the page.
3. If a provider's credentials are not configured, the application shall omit or mark that source rather than rendering an indefinite loading state for the whole feed.
4. If all providers fail, the application shall present a single non-crashing error state with a retry action and shall keep all other routes usable.

### Requirement 7: Add a trending item to the library

**Objective:** As a signed-in reader, I want to add a trending item to my shelves, so that discovery connects to the rest of my library.

#### Acceptance Criteria
1. The application shall provide an add-to-library action for each trending item, on both the Home section and the dedicated page.
2. When a user adds a trending item, the application shall create a media item of the item's media type when an equivalent one does not already exist, and a library entry for the authenticated user, reusing the platform's library and activity backend.
3. When a user adds a trending item, the application shall record an activity such that it appears in the Home community feed.
4. When a trending item already exists in the authenticated user's library, the application shall indicate that and shall not create a duplicate library entry.
5. The application shall match a trending item to an existing media item using stable identifying fields (for example, normalized title and creator, scoped by media type), performed server-side, so the same item is not added twice.

### Requirement 8: Loading, empty, and error states

**Objective:** As a signed-in reader, I want clear feedback while trending data loads or fails, so that the surfaces never appear broken or frozen.

#### Acceptance Criteria
1. While trending data is being fetched, the application shall display a loading state on the Home section and the dedicated page.
2. If the overall request fails, the application shall display an error state with a retry action, and when the user selects retry the application shall re-request the data.
3. If a request succeeds but returns no items (overall or for a source), the application shall display an empty state rather than a blank region.
4. The application shall convey loading, empty, and error states accessibly (text and status semantics), not by visual styling alone.

### Requirement 9: Configuration, secrets, and local development

**Objective:** As a maintainer, I want clear, safe configuration for provider credentials, so that secrets are not committed and the feature runs locally and on Vercel.

#### Acceptance Criteria
1. The repository's example environment file shall document the required provider variables (for example, `NYT_API_KEY`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`) without containing real values, alongside the platform's other variables.
2. The repository's ignore configuration shall continue to exclude real environment files from version control.
3. The README shall document how to obtain and configure each provider's credentials (locally via the env file and on Vercel via project environment variables).
4. The application shall obtain provider credentials only from environment configuration and shall not hard-code them in any source file.
5. When a provider's credentials are not configured, the application shall degrade that source per Requirement 6 rather than appearing to load indefinitely.

### Requirement 10: Design system, responsiveness, and accessibility

**Objective:** As a reader on any device, I want trending surfaces consistent with the redesigned app and usable everywhere, so that discovery feels cohesive and accessible.

#### Acceptance Criteria
1. The application shall render trending surfaces using the media-platform-v2 design system (shared tokens, shadcn primitives, the enriched media card), not an unrelated style, in both light and dark themes.
2. The Home "Trending Now" section and the dedicated page shall be usable and correctly laid out across mobile, tablet, and desktop widths without horizontal overflow or clipped controls.
3. The application shall convey source, ranking, media type, and state information by text and semantics, not by color alone.
4. The trending surfaces' interactive controls (add-to-library, retry, source navigation) shall be keyboard operable with a visible focus indicator, and the application shall honor the user's reduced-motion preference.

### Requirement 11: Supersede the nyt-recommendations spec

**Objective:** As a maintainer, I want Trending Now to replace the planned NYT-only recommendations, so that there is one coherent discovery feature and no duplicated NYT integration.

#### Acceptance Criteria
1. The application shall deliver the NYT Best Seller capability as the **books provider** within Trending Now, rather than as a separate Recommendations page.
2. The `nyt-recommendations` specification shall be marked superseded by `trending-now`, and no parallel NYT-only Recommendations route or endpoint shall be built.
3. Where the platform's navigation previously reserved a "Recommendations" destination, the application shall use the trending destination instead, keeping the navigation model extensible.
4. The application shall preserve the substantive NYT requirements (server-side key handling, plain best-seller pull across lists, add-to-shelf) as realized through the provider abstraction.

### Requirement 12: Architecture and quality preserved

**Objective:** As a maintainer, I want Trending Now to uphold the platform's architecture and quality, so that adding discovery doesn't cause regressions.

#### Acceptance Criteria
1. The application shall add trending data access and endpoints additively, preserving existing routes, their access gating, the auth/session/middleware model, and per-user authorization; no existing contract shall break.
2. The application shall preserve the Next.js server/client component boundaries, deriving the acting user from the session for any per-user action (such as add-to-library).
3. The application shall continue to type-check and build, and the test suite shall pass, with tests added for new behavior — including provider clients exercised against mocked upstream responses so no live external calls are made in tests.
4. The application shall not introduce `any` in TypeScript application code, shall keep provider secrets in environment configuration, and shall keep externally-sourced content safely rendered (no `dangerouslySetInnerHTML`).
