# Requirements Document

## Project Description (Input)
Complete the Trending Now feed by adding trending sources for the remaining media types — **podcasts**, **TV shows**, and **movies** — alongside the shipped NYT (books) and Spotify (music) providers. New providers plug into the existing trending provider abstraction and normalize into the same trending-item shape, so they surface automatically on the Home "Trending Now" section and the dedicated Trending page, in the media-type filter, and through add-to-library and cover-art resolution — with no feed/UI/card changes. Each source is a server-side client; where it requires credentials they come from environment configuration only, and an unconfigured, rate-limited, or failing source degrades gracefully without affecting the others.

## Introduction

LibraryLoop's **Trending Now** feature (the shipped `trending-now` spec) sources popular/best-seller lists per media type through a **pluggable provider abstraction**, normalizes them into one trending-item shape, and renders them on the Home dashboard section and a dedicated, source-grouped page — with server-side provider clients, env-only secrets, and graceful per-provider degradation. Today it ships **books** (NYT Best Sellers) and **music** (Spotify).

This feature completes the set by adding trending providers for **podcasts**, **TV shows**, and **movies**, so every media type the platform supports (`ebook`, `music`, `podcast`, `tv_movie`) has a live trending source. The work is deliberately **additive and reuse-first**: the new providers register under the existing abstraction and emit the existing normalized item shape, so they appear in the Home section, the Trending page's source groups, and the data-driven media-type filter (`media-type-filters`) automatically; and because adding a trending item and resolving its cover already work for any media type (`cover-art`), discovered podcasts/shows/movies can be added to the library and show real art with no new UI.

Each new source follows the platform's established conventions: a **server-side** client invoked through the app's own authenticated endpoint, **secrets in environment configuration only** (never the browser), **graceful degradation** (an unconfigured, rate-limited, or failing source yields its per-source status and never sinks the others), and **server-side caching** within the source's rate limits. The chosen sources are **Apple's keyless public podcast charts** for podcasts and **TMDB** (The Movie Database) for TV shows and movies; TMDB requires a free API key supplied via environment configuration, and when that key is absent the TV/movie source reports as **unconfigured** rather than erroring, exactly as the existing NYT/Spotify providers do.

The feature builds additively on the shipped platform and must not break existing routes, contracts, auth/session/middleware behavior, the existing books/music providers, or the green build/type-check/test suite. Requirements define WHAT must be achieved; the concrete provider sources, endpoints, and clients are chosen in the design phase (see Open Questions).

## Requirements

### Requirement 1: Podcast trending source

**Objective:** As a signed-in reader, I want trending podcasts in the feed, so that I can discover popular shows to add to my library.

#### Acceptance Criteria
1. The application shall provide a trending provider for the `podcast` media type that supplies currently popular podcasts from an external popularity/chart source.
2. The podcast provider shall register under the existing trending provider abstraction and emit the existing normalized trending-item shape, so its items render in the feed and UI with no feed-rendering or card changes.
3. The application shall attribute each podcast item to its source and the `podcast` media type, and include artwork where the source provides it.
4. Where the podcast source provides a ranking or list, the application shall expose that ranking/list position on the normalized item.

### Requirement 2: TV show and movie trending sources

**Objective:** As a signed-in reader, I want trending TV shows and movies in the feed, so that I can discover popular titles to add to my library.

#### Acceptance Criteria
1. The application shall provide trending content for **TV shows** and **movies**, mapped to the platform's `tv_movie` media type, from an external popularity source.
2. The TV/movie provider(s) shall register under the existing provider abstraction and emit the existing normalized trending-item shape, so the items render with no feed-rendering or card changes.
3. The application shall attribute each item to its source and the `tv_movie` media type, and include artwork where the source provides it.
4. Where TV shows and movies are distinguished by the source, the application shall convey that distinction in a normalized field (for example, the list/label the item appears on) without introducing a new media type.
5. Where the source provides a ranking or list, the application shall expose that ranking/list position on the normalized item.

### Requirement 3: Server-side clients and secret handling

**Objective:** As a maintainer, I want the new sources accessed server-side with secrets kept out of the browser, so that the integration is secure and consistent with existing providers.

#### Acceptance Criteria
1. The application shall perform all upstream calls for the new sources from server-side provider clients invoked through the application's own authenticated endpoint(s); the browser shall never call the upstream sources directly.
2. Where a new source requires credentials, the application shall read them from environment configuration only and shall never expose them to the client.
3. While a required credential for a source is absent, the application shall report that source as unconfigured rather than erroring, consistent with the existing providers.
4. The application shall bound each upstream request with a timeout and validate that any artwork or external URL it exposes is https.

### Requirement 4: Graceful degradation and caching

**Objective:** As a signed-in reader, I want the feed to stay fast and resilient as more sources are added, so that one slow or failing source never breaks the experience.

#### Acceptance Criteria
1. If a new source is unconfigured, rate-limited, times out, or returns an error, the application shall render the remaining sources normally and convey that source's status, without failing the feed.
2. The application shall apply server-side caching to the new sources within their rate limits, consistent with the existing providers, so repeated views do not issue redundant upstream calls.
3. When a new source returns no items, the application shall present its group with an accessible empty/again-later state rather than an error.

### Requirement 5: Surface integration and reuse

**Objective:** As a signed-in reader, I want the new media types to behave exactly like the existing trending content everywhere it appears, so that the experience is consistent.

#### Acceptance Criteria
1. The application shall include the new sources' items in both the Home "Trending Now" section and the dedicated Trending page's source-grouped view, using the existing surfaces.
2. The application shall make the new media types selectable in the trending media-type filter automatically, because the filter derives its options from the media types present in the feed (`media-type-filters`).
3. When a reader adds a trending podcast, TV show, or movie to their library, the application shall create or reuse the catalog item and record the activity using the existing add-to-library path, including persisting provider artwork when present.
4. The application shall let an added or resolved podcast/TV/movie item display real cover art using the existing cover-art resolution, falling back to the themed placeholder when none is found.
5. The new providers shall not alter the rendering, ranking, or behavior of the existing books and music providers.

### Requirement 6: Non-regression and platform alignment

**Objective:** As a maintainer, I want this addition to be safe and consistent, so that existing behavior and quality gates are preserved.

#### Acceptance Criteria
1. The application shall preserve the existing trending behavior (books and music), routes, contracts, auth/session/middleware behavior, and per-user authorization after the new sources are added.
2. The trending media-type attribution shall continue to be user-initiated and a plain pull, introducing no automatic profile-based filtering (preserving `trending-now` Req 3.2).
3. The type-check, test suite, and production build shall remain green, with the new providers covered by tests that do not depend on live network access.

## Decisions and Open Questions

- **Sources (decided).** Podcasts use **Apple's keyless public podcast charts**; TV shows and movies use **TMDB**, which requires a free API key supplied via env configuration and is treated as **unconfigured** when absent (Req 3.2, 3.3). This adds one new environment variable for the TMDB key.
- **TV vs movie granularity (for design).** Whether to query trending movies and trending TV separately and label them distinctly within the single `tv_movie` type (Req 2.4), or present a single combined trending list.
