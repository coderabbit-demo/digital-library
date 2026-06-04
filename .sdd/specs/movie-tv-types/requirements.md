# Requirements Document

## Project Description (Input)
Split the unified "tv_movie" media type into two first-class media types, "movie" and "tv", so Movies and TV Shows are separately filterable everywhere the data-driven media-type filter appears (Library, Wishlist, Reviews, Home feed + Trending section, Trending page, Search, catalog/add). The providers already distinguish them (TMDB movie vs tv endpoints; trending has separate Movies/TV providers; search has movie/tv providers; enrichment already records tmdbType "movie"|"tv"), so going forward those providers must emit the precise type. Existing persisted "tv_movie" rows are migrated/backfilled to "movie" or "tv" via a Drizzle migration, using the resolved TMDB type where known (enrichment.tmdbType) and a sensible default otherwise. Update the media-type labels/icons (e.g. Movies, TV Shows) and the discriminated metadata/enrichment unions accordingly, keeping changes additive/non-breaking elsewhere.

Additionally, enrich the detail page for these types: capture and display TV season and episode counts (TMDB number_of_seasons / number_of_episodes, optionally a per-season breakdown) for multi-season/multi-episode shows, and capture and display a synopsis/description from TMDB "overview" for both movies and TV (today externally-added items have an empty description). Taglines are already fetched and shown. All external fetches stay server-side, resilient (timeouts, per-source isolation, graceful unavailable states), validated at the boundary (no any), reuse the existing enrichment resolve-and-cache pattern, and the build/type-check/test suite stays green.

## Introduction

LibraryLoop currently models films and television under a single media type, `tv_movie`, which renders as one "TV & Movies" filter chip everywhere the data-driven media-type filter appears. The upstream providers already distinguish the two (TMDB has separate movie and TV endpoints; Trending and Search each run separate movie and TV providers; the enrichment layer already records a `tmdbType` of `movie` or `tv`), so the information needed to separate them already flows through the system but is collapsed at the type level.

This feature promotes **Movies** and **TV Shows** to two **first-class media types** (`movie` and `tv`), so they filter, label, and icon independently across every surface (Library, Wishlist, Reviews, the Home feed and Home Trending section, the Trending page, Search, and the catalog/add flow). Because the media type is persisted on catalog rows and drives the data-driven filters, a one-time **migration backfills** existing `tv_movie` rows to `movie` or `tv`, preferring the already-resolved TMDB type and falling back to a sensible default. Going forward, the movie/TV providers emit the precise type at the source.

The feature also **deepens the detail page** for these types: TV shows gain **season and episode counts** (and optionally a per-season breakdown), and both movies and TV gain a **synopsis** sourced from TMDB's overview — addressing that externally-added items currently have an empty description. Taglines are already shown.

The change is **additive and non-breaking** elsewhere: the media type remains an open, data-driven set; legacy/unknown types must still render; existing routes, auth/session/authorization, cover resolution, and the enrichment resolve-and-cache pattern are preserved; and the type-check, test suite, and build stay green.

## Requirements

### Requirement 1: First-class Movie and TV media types

**Objective:** As a reader, I want movies and TV shows treated as distinct media types, so that I can browse and filter them independently.

#### Acceptance Criteria
1. The system shall recognize `movie` and `tv` as distinct first-class media types, each with its own human-readable label (for example, "Movies" and "TV Shows") and its own type icon.
2. The system shall continue to treat media type as an open, data-driven set, such that unknown or legacy types still render with a humanized label fallback rather than failing.
3. Where a media-type filter is shown, the system shall offer Movies and TV Shows as separate options, derived from the types actually present in that surface's data.
4. The system shall not present a combined "TV & Movies" option once the split is in effect, except as a transitional label for any legacy rows that remain unmigrated.

### Requirement 2: Providers emit the precise type

**Objective:** As a maintainer, I want each provider to record whether an item is a movie or a TV show, so that newly surfaced or added items carry the correct type without post-hoc guessing.

#### Acceptance Criteria
1. When the Trending feed surfaces a film or television title, the system shall tag it as `movie` or `tv` according to its source rather than a combined type.
2. When Search returns a film or television result, the system shall tag it as `movie` or `tv` according to its source.
3. When a user adds a movie or TV item from any surface (Trending, Search, catalog/add), the system shall persist it under the precise `movie` or `tv` type.
4. Where the catalog/add flow lets a user pick a media type, the system shall offer Movies and TV Shows as separate choices.

### Requirement 3: Separate filtering across all surfaces

**Objective:** As a reader, I want Movies and TV Shows filterable on every list, so that the separation is consistent across the app.

#### Acceptance Criteria
1. The system shall present Movies and TV Shows as independent filter options on the Library, Wishlist, and Reviews surfaces.
2. The system shall present Movies and TV Shows as independent filter options on the Home feed, the Home Trending section, the Trending page, and the Search results.
3. When the user selects the Movies filter, the system shall show only movie items; when the user selects the TV Shows filter, the system shall show only TV items.
4. The system shall reflect the active selection in the surface's URL state consistently with the existing media-type filter behavior.

### Requirement 4: Migration and backfill of existing data

**Objective:** As a maintainer, I want existing combined-type rows reclassified, so that the split applies to data already in the catalog.

#### Acceptance Criteria
1. The system shall provide a one-time schema/data migration that reclassifies existing `tv_movie` catalog rows to `movie` or `tv`.
2. Where an item's resolved TMDB type is known (from prior enrichment), the migration shall use it to choose `movie` or `tv`.
3. Where the resolved type is unknown, the migration shall apply a documented default classification rather than leaving the combined type.
4. The migration shall be additive and reversible in structure (no destructive change to unrelated columns) and shall be committed so the integration-test database applies it.
5. The system shall preserve each migrated item's existing library entries, reviews, tags, activity, and cover so reclassification does not lose user data.

### Requirement 5: TV season and episode information

**Objective:** As a reader viewing a TV show, I want to see how many seasons and episodes it has, so that I understand its scope.

#### Acceptance Criteria
1. Where a TV item is enriched, the system shall capture its season count and episode count when the provider supplies them.
2. The system shall display the season and episode counts on a TV item's detail page when available, omitting them gracefully when absent.
3. Where the provider supplies a per-season breakdown, the system may present it, bounded to a reasonable size.
4. The system shall not display season or episode information for movies.

### Requirement 6: Movie and TV synopsis

**Objective:** As a reader, I want a synopsis for movies and TV shows, so that I can understand what an item is about even when it was added from an external source.

#### Acceptance Criteria
1. Where a movie or TV item is enriched and lacks a description, the system shall capture a synopsis from the provider's overview.
2. The system shall display the synopsis on the item's detail page.
3. If both an existing description and a provider synopsis are available, the system shall present a single coherent description without duplication.
4. If no synopsis is available, the system shall omit it gracefully without an empty placeholder.

### Requirement 7: Resilience, reuse, and safe rendering

**Objective:** As a maintainer, I want the new fetches to follow existing resilient patterns, so that providers never destabilize the page.

#### Acceptance Criteria
1. The system shall perform all external lookups server-side with bounded timeouts, reusing the existing enrichment resolve-and-cache pattern so enrichment is fetched once and cached.
2. If a provider is unconfigured, times out, errors, or returns no usable data, the system shall degrade gracefully and continue rendering the rest of the page.
3. The system shall validate external responses into typed structures at the boundary and shall not read them as `any`.
4. The system shall render externally-sourced text safely as plain text, without unsafe HTML injection.

### Requirement 8: Non-breaking change and quality bar

**Objective:** As a maintainer, I want the split to land without regressions, so that the app keeps working across the change.

#### Acceptance Criteria
1. The system shall preserve existing routes, auth/session/middleware behavior, per-user authorization, cover resolution, the enrichment endpoint, and the detail page's existing actions; no existing contract shall break.
2. The system shall keep media-type handling data-driven so that adding `movie` and `tv` requires no per-type branching in the shared filter components.
3. The system shall continue to type-check and build, and the test suite shall pass, with tests added for the new behavior (type split, provider typing, migration/backfill mapping, TV season/episode and synopsis enrichment) and updated only where intentional.
4. The system shall not introduce `any` in TypeScript application code.
