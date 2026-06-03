# Requirements Document

## Project Description (Input)
Enrich the media item detail page (`/item/[id]`) with richer per-type metadata and a reviews/ratings section sourced from external providers, degrading gracefully per media type given no new API keys beyond Google Books.

Metadata enrichment (all four types): extend the detail page beyond title/creator/description with type-appropriate fields fetched on demand and cached on the media row — Movies & TV via TMDB (runtime, genres, release date, tagline, top cast/crew, vote average/count); Books via Google Books (page count, publisher, published date, categories, ISBNs) plus Open Library subjects; Music via iTunes plus keyless MusicBrainz (genre, release date, track/disc count, label); Podcasts via iTunes (publisher, episode count, genre).

Reviews/ratings section ("scores + review excerpts"): show per-source rating badges/scores and, where the provider exposes review bodies, a few textual review excerpts with attribution and outbound links. Coverage degrades by type given the key constraint: Movies & TV get TMDB vote average + TMDB user-review excerpts (full); Books get Google Books averageRating/ratingsCount + Open Library ratings (scores only — no review text available); Music and Podcasts have no free review/score source, so the reviews section is omitted for them (metadata enrichment only). No OMDb/Last.fm/Podcast Index integration.

Provider/keys: reuse the existing keyless HTTP helper (`covers/http.ts`: `fetchJson` with `AbortSignal.timeout`, `httpsOrNull`, `isRecord`) and the existing `TMDB_API_KEY`; add a new `GOOGLE_BOOKS_API_KEY` (provided via gitignored `.env`, empty placeholder in `.env.example`). All external fetches must be resilient (per-source isolation, timeouts, graceful "unavailable" states) and server-side; nothing blocks initial render — enrichment/reviews resolve and cache like the existing on-demand cover resolution. Persisted enrichment fields extend the media schema via a Drizzle migration; transient review excerpts are fetched per view (not persisted) unless caching is warranted.

## Introduction

This feature **enriches the existing media item detail page** (`/item/[id]`, shipped under the `media-detail` spec) with two additions: (a) richer, **type-appropriate metadata** for each media type, and (b) a **reviews & ratings section** drawn from external providers. It is purely additive — the detail page's existing content, shelf/review/tag actions, route gating, and cross-surface links are unchanged.

Enrichment follows the **on-demand resolve-and-cache** pattern already used for cover art (`artworkUrl` / `artworkCheckedAt`): the core page renders immediately from persisted data, and enriched metadata is fetched server-side from external providers, validated at the boundary, and persisted to the media row so the lookup is not repeated. Reviews/ratings are read-mostly and may be fetched per view (with optional short-lived caching) rather than persisted, since their content changes over time.

Because the only new credential is a **Google Books key** (TMDB is already configured; Open Library / iTunes / MusicBrainz are keyless; no OMDb / Last.fm / Podcast Index), review coverage is **deliberately uneven and degrades per type**: Movies & TV get a rating score plus a few user-review excerpts (TMDB); Books get rating scores only (Google Books + Open Library expose no review text); Music & Podcasts get **metadata enrichment only** and no reviews section. Every external dependency must fail soft: a provider that is unconfigured, slow, errored, or has no data must never break the page or block its core actions.

Requirements define WHAT this enrichment must achieve; concrete providers' field mappings, the schema migration shape, components, and loaders are produced in the design phase, reusing the existing HTTP helper, validation-at-the-boundary discipline, and design system.

## Requirements

### Requirement 1: Type-appropriate metadata enrichment display

**Objective:** As a reader, I want the detail page to show richer details relevant to each media type, so that I can understand an item without leaving the app.

#### Acceptance Criteria
1. The detail page shall display enriched, type-appropriate metadata for the item in addition to its existing title, creator, media-type indicator, meta line, and description.
2. Where the item is a movie or TV title, the detail page shall present available fields among runtime, genres, release date, tagline, top cast/crew, and an audience rating.
3. Where the item is a book, the detail page shall present available fields among page count, publisher, published date, categories/subjects, and identifiers (for example, ISBN).
4. Where the item is music, the detail page shall present available fields among genre, release date, track/disc count, and label.
5. Where the item is a podcast, the detail page shall present available fields among publisher, episode count, and genre.
6. If a particular enriched field is absent for an item, the detail page shall omit that field gracefully rather than rendering an empty label or failing.
7. The detail page shall present enriched metadata using the existing design system, consistent with the rest of the page, and shall not remove or alter the page's existing content or actions.

### Requirement 2: On-demand enrichment fetch and caching

**Objective:** As a reader, I want enriched data to appear without slowing the page, so that opening an item always feels fast.

#### Acceptance Criteria
1. When the detail page is requested, the application shall render the core item content from persisted data without waiting on external enrichment.
2. While enrichment has not yet been attempted for an eligible item, the application shall fetch it from the relevant external provider(s) server-side and persist the resulting fields to that item's catalog row.
3. Once enrichment has been attempted for an item, the application shall not repeat the external lookup on subsequent views, using a persisted "checked" marker analogous to the cover-art resolution marker.
4. While enrichment is in progress on first view, the application shall present a non-blocking loading affordance for the enriched section and shall reveal the fields when they resolve.
5. The application shall persist enriched metadata via an additive schema change that does not alter or break existing columns, rows, or queries.
6. The application shall validate externally fetched data into typed structures at the boundary and shall not read external responses as `any`.

### Requirement 3: External provider sourcing and resilience

**Objective:** As a maintainer, I want external lookups to be isolated and fail-soft, so that one provider's outage never degrades the app.

#### Acceptance Criteria
1. The application shall perform all external metadata and review lookups server-side, reusing the existing HTTP helper with a bounded timeout per request.
2. If an external provider is unconfigured, times out, errors, or returns no usable data, the application shall treat that source as unavailable for the item and shall continue rendering everything else.
3. When multiple sources contribute to one item, the application shall isolate them so that one source failing does not prevent another source's data from being used.
4. The application shall source enriched data only from the agreed providers for this iteration — TMDB (movies/TV), Google Books and Open Library (books), iTunes and MusicBrainz (music), iTunes (podcasts) — and shall not add OMDb, Last.fm, or Podcast Index.
5. The application shall constrain external response sizes (for example, capping the number of cast members, categories, or review excerpts) so the page stays bounded.

### Requirement 4: Reviews and ratings section with per-type coverage

**Objective:** As a reader, I want to see how an item is rated and what others said, so that I can judge it at a glance.

#### Acceptance Criteria
1. Where review or rating data is available for an item, the detail page shall present a reviews/ratings section showing each contributing source's score with its source attribution.
2. Where a movie or TV title is shown, the reviews section shall present the TMDB audience rating and up to a small fixed number of user-review excerpts, each with attribution and an outbound link to its source.
3. Where a book is shown, the reviews section shall present available rating scores (for example, Google Books average rating and rating count, and Open Library rating) without review text, since review bodies are not available from these sources.
4. Where the item is music or a podcast, the application shall omit the reviews/ratings section, since no agreed free source provides scores or reviews for these types.
5. If no rating or review data is available for an item whose type can have it, the application shall present an accessible "no reviews yet / unavailable" state rather than an empty or broken section.
6. The application shall convey ratings by text and semantics (for example, a numeric/labelled value), not by color alone.

### Requirement 5: Safe handling of external review content

**Objective:** As a maintainer, I want externally sourced text and links rendered safely, so that enrichment introduces no injection or trust risks.

#### Acceptance Criteria
1. The application shall render externally sourced review text as plain text without using `dangerouslySetInnerHTML`.
2. The application shall truncate review excerpts to a bounded length and indicate truncation, linking out to the full review at its source.
3. Where the application renders an outbound link to an external source, the link shall be an `https` URL and shall open externally with safe rel attributes.
4. The application shall attribute each score and excerpt to its originating source so the reader knows where it came from.

### Requirement 6: Configuration and secrets

**Objective:** As a maintainer, I want the new provider credential configured safely, so that secrets stay out of the repo and absence degrades gracefully.

#### Acceptance Criteria
1. The application shall read the Google Books credential from environment configuration (`GOOGLE_BOOKS_API_KEY`) and shall not hard-code it.
2. The application shall keep the actual key only in the gitignored local environment and shall provide an empty placeholder for it in the example environment file.
3. While the Google Books credential is absent, the application shall skip Google Books enrichment for books and continue with the other available sources, without error.
4. The application shall reuse the already-configured `TMDB_API_KEY` for movie/TV enrichment and shall not require any additional keys for the keyless providers.

### Requirement 7: Loading, empty, and error states

**Objective:** As a reader, I want clear feedback for the enriched sections, so that the page never appears broken while data is missing or pending.

#### Acceptance Criteria
1. While enriched metadata or reviews are loading on first view, the application shall present an accessible loading state for those sections only, leaving the rest of the page interactive.
2. If enrichment or reviews are unavailable for an item, the application shall present an accessible unavailable/empty state for the affected section and shall keep the rest of the page fully functional.
3. If an external lookup fails, the application shall not crash the detail page, block its shelf/review/tag actions, or affect other routes.
4. The application shall not regress the detail page's existing not-found, loading, and action-error behavior.

### Requirement 8: Accessibility and responsive layout

**Objective:** As a reader on any device using assistive technology, I want the enriched sections usable and accessible, so that they match the rest of the app.

#### Acceptance Criteria
1. The enriched metadata and reviews sections shall be laid out correctly across mobile, tablet, and desktop widths without horizontal overflow or clipped content.
2. The new sections shall support light and dark themes from the shared design tokens.
3. The new sections shall use accessible roles, names, and headings, and any interactive control (for example, outbound links) shall be keyboard operable with a visible focus indicator.
4. The application shall not convey rating or status information by color alone in the new sections.

### Requirement 9: Architecture, reuse, and quality preserved

**Objective:** As a maintainer, I want enrichment to reuse existing patterns and uphold the quality bar, so that it adds value without regressions.

#### Acceptance Criteria
1. The application shall implement enrichment additively, preserving existing routes, the auth/session/middleware model, per-user authorization, the detail page's existing actions, and the Next.js server/client component boundaries; no existing contract shall break.
2. The application shall reuse the existing HTTP helper, type-scoped find-or-create catalog matching, and the cover-art-style resolve-and-cache pattern rather than introducing parallel mechanisms.
3. The application shall continue to type-check and build, and the test suite shall pass, with tests added for the new pure logic (provider normalizers, per-type selection, degradation) and for the data-access/endpoint changes.
4. The application shall not introduce `any` in TypeScript application code and shall keep externally supplied content safely rendered.
