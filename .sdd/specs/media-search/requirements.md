# Requirements Document

## Project Description (Input)
Add search to LibraryLoop. (1) A general search bar that queries across media types from all configured external providers (books, music, podcasts, TV/movies) and lists the results in one place, each with actions to add to the library (wishlist/currently reading/read) and to open its detail page where a review can be added. (2) A scoped search on the Library, Wishlist, and Reviews pages that filters only the items already on that page. Reuses the existing provider/add/cover/detail patterns; global search runs server-side with graceful per-source degradation; scoped search is an in-memory filter combinable with the existing media-type filter.

## Introduction

LibraryLoop lets readers discover trending media and manage a personal library, but there is no way to **search**. This feature adds two complementary search experiences.

**Global search** — a general search bar (in the app shell) that, on submit, queries the **external providers** for every supported media type and presents a unified, source-attributed result list. Each result carries the same actions as a trending card: add it to the library (defaulting to the wishlist) and open its detail page, where the existing shelf controls and **review** live. Results already in the reader's library are indicated so they aren't added twice. Aggregation reuses the trending model: server-side provider clients invoked through the app's own authenticated endpoint, **graceful per-source degradation** (one provider failing or being unconfigured never sinks the others), https-only artwork, bounded timeouts, and caching within provider rate limits. Because each query fans out to several rate-limited providers, global search runs **on submit** (not per keystroke).

**Scoped search** — a search box on the **Library**, **Wishlist**, and **Reviews** pages that filters only the items already shown on that page (by title and creator), composing with the existing media-type filter and persisting in the URL like the other filters. This is a fast in-memory narrowing of data the page already loads — no external calls.

The feature builds additively on the shipped platform and reuses existing pieces: the normalized media-item/trending-item shapes, the provider clients (Open Library, iTunes, TMDB, Spotify), the add-to-library and cover-art paths, the media-detail page (shelf + review actions), the data-driven media-type filter, and the URL-as-state filter pattern. It must not regress existing routes, contracts, auth/session/middleware behavior, or the green build/type-check/test suite.

Requirements define WHAT must be achieved; the concrete provider search clients, endpoints, and components are chosen in the design phase. Two scope choices are flagged in Open Questions.

## Requirements

### Requirement 1: Global search entry point

**Objective:** As a signed-in reader, I want a general search bar, so that I can look for any media from anywhere in the app.

#### Acceptance Criteria
1. The application shall present a general search input in the app shell, available across the authenticated pages.
2. When the reader submits a query, the application shall show a search-results view for that query, with the query reflected in the URL so it can be refreshed, shared, and navigated back to.
3. The application shall perform the external search on submit (not on every keystroke), and shall ignore an empty/whitespace-only query.
4. While a search is in progress, the application shall present an accessible loading state; while a query returns no results, it shall present an accessible empty state.

### Requirement 2: Aggregated multi-provider results

**Objective:** As a signed-in reader, I want results spanning all media types and sources, so that one search surfaces books, music, podcasts, and TV/movies together.

#### Acceptance Criteria
1. When a query is submitted, the application shall query the configured external providers across the supported media types and present their results together in a single results view.
2. The application shall normalize every provider's results into the shared trending-item shape so the result list renders any source without per-source branching.
3. The application shall attribute each result to its source and media type, and include artwork where available (https only).
4. The application shall let the reader see results grouped or labeled by media type/source so the breadth of matches is clear.
5. Where a provider returns no matches for the query, the application shall simply contribute nothing from that provider without error.

### Requirement 3: Result actions

**Objective:** As a signed-in reader, I want to act on a search result directly, so that I can add it to my library or review it.

#### Acceptance Criteria
1. The application shall let the reader add a search result to their library from the results view, creating or reusing the catalog item and recording the activity via the existing add path (persisting provider artwork when present).
2. The application shall let the reader add a result to a chosen shelf (wishlist, currently reading, or read), defaulting to the wishlist.
3. The application shall let the reader open a result's detail page, where the existing shelf controls and review entry are available (so a review can be added there).
4. While a result is already in the reader's library, the application shall indicate that rather than offering a duplicate add.
5. The application shall not block adding a result on the availability of external cover art (cover resolution remains best-effort).

### Requirement 4: Server-side search, secrets, and resilience

**Objective:** As a maintainer, I want global search done server-side and resiliently, so that it is secure, consistent, and never breaks on one provider.

#### Acceptance Criteria
1. The application shall perform all external search calls from server-side clients invoked through the application's own authenticated endpoint; the browser shall never call the providers directly, and provider secrets shall come from environment configuration only.
2. If a provider is unconfigured, rate-limited, times out, or errors for a query, the application shall return the other providers' results and convey that provider's status, without failing the search.
3. The application shall bound each provider search with a timeout and cap the number of results requested per provider.
4. The application shall apply server-side caching within provider rate limits so repeated identical queries do not issue redundant upstream calls.
5. While a reader is not authenticated, the application shall not perform searches or expose the search results route, consistent with the platform's route gating.

### Requirement 5: Scoped search on Library, Wishlist, and Reviews

**Objective:** As a signed-in reader, I want to search within my Library, Wishlist, and Reviews, so that I can find an item on the page I'm on.

#### Acceptance Criteria
1. The application shall present a search input on the Library, Wishlist, and Reviews pages that filters only the items already shown on that page.
2. When the reader enters a query, the application shall show only items whose title or creator matches the query (case-insensitively), and all items when the query is empty.
3. The scoped search shall compose with the existing media-type filter on those pages, so the two narrow the list together.
4. The application shall reflect the scoped query in that page's URL so it survives a refresh and is shareable, consistent with the existing filter pattern.
5. While a scoped query matches no items, the application shall present that page's empty state rather than a blank list.

### Requirement 6: Non-regression and platform alignment

**Objective:** As a maintainer, I want search added safely, so that existing behavior and quality gates are preserved.

#### Acceptance Criteria
1. The application shall preserve existing pages, routes, contracts, auth/session/middleware behavior, and the trending/add/cover/detail features after search is added.
2. The scoped search shall introduce no external calls and shall not alter the data shown on the page beyond filtering it.
3. The type-check, test suite, and production build shall remain green, with the search aggregation covered by tests that do not depend on live provider calls.

## Decisions and Open Questions

- **Global search scope (decided).** Global search is **external providers only** (discovery). Results already in the reader's library are flagged (Req 3.4); the reader's own items are found via the scoped page search (Req 5). No local-catalog section in global results.
- **Result actions (decided).** Results mirror the trending card: an **Add** action (to the wishlist) plus **Details** → the item page, where shelf changes (currently reading / read) and review live (Req 3.2, 3.3). No inline shelf picker on the result card.
- **Provider sources (for design).** Which client serves each type's search — e.g. Open Library (books), iTunes (podcasts, and music), TMDB (TV/movies), Spotify (music) — to be settled in design, reusing the existing clients; one search provider per media type behind a search fan-out mirroring the trending registry.
