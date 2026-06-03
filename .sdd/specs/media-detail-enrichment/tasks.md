# Implementation Plan

- [ ] 1. Persisted enrichment shape, schema, and data access
- [ ] 1.1 Define the per-type enrichment shape and extend the catalog additively
  - Define a typed, per-media-type structure for enriched fields (movies/TV, books, music, podcasts), all fields optional for graceful absence.
  - Add two additive, nullable fields to the catalog row — a structured enrichment column and an "enrichment checked" timestamp marker — mirroring the existing cover-art artwork/checked-at pair; generate and commit the migration so integration tests apply it; leave existing columns, rows, keys, and queries unchanged.
  - _Requirements: 2.5, 9.1, 9.2_

- [ ] 1.2 Persist and read enrichment through the data layer
  - Add data access to write resolved enrichment together with its checked timestamp, and to read the enrichment back as part of loading an item, validating the stored structure into the typed shape at the boundary (never read as `any`).
  - _Requirements: 2.5, 2.6, 9.4_

- [ ] 2. External enrichment providers and per-type dispatch
- [ ] 2.1 (P) Movie and TV enrichment via TMDB
  - Re-query TMDB by title/creator to resolve the item, then fetch its details and credits to produce runtime, genres, release date, tagline, a capped cast list, the audience rating and count, and the resolved provider id (kept to drive the reviews fetch); use a timed, injectable fetch, validate any URLs as https, cap list sizes, and never throw to the caller; reuse the already-configured TMDB key.
  - _Requirements: 1.2, 3.1, 3.2, 3.5, 6.4_

- [ ] 2.2 (P) Book enrichment via Google Books and Open Library
  - Produce page count, publisher, published date, categories/subjects (merged and capped across both sources), identifiers (ISBNs), and rating scores from each source; gate Google Books on its key and skip it cleanly when the key is absent while still using keyless Open Library; timed injectable fetch, capped, never throws.
  - _Requirements: 1.3, 3.1, 3.2, 3.4, 3.5, 6.1, 6.3_

- [ ] 2.3 (P) Music and podcast enrichment via iTunes and MusicBrainz
  - For music, produce genre, release date, track/disc count, and label by combining keyless iTunes with a single capped, descriptively-identified MusicBrainz request; for podcasts, produce publisher, episode count, and genre from keyless iTunes; timed injectable fetch, capped, never throws, and a failed source degrades to the other.
  - _Requirements: 1.4, 1.5, 3.1, 3.2, 3.4, 3.5_

- [ ] 2.4 Per-type dispatch, source isolation, and configuration
  - Route an item by its media type to the providers for that type and merge their partial results into one enrichment, isolating sources so one failing or empty source never suppresses another, and yielding nothing for an unknown type; read the new book credential from environment configuration and add it as an empty placeholder in the example environment file (only the agreed providers — no OMDb/Last.fm/Podcast Index).
  - _Requirements: 1.6, 3.3, 3.4, 6.1, 6.2_

- [ ] 2.5 Unit-test providers and dispatch with injected fetch
  - For each provider, test that a representative payload maps to the expected fields and that failure, empty, and malformed responses map to an empty partial with no throw; for dispatch, test that the correct providers run per type, partials merge, one source's failure is isolated, and an unknown type yields nothing — all with injected fetch and no live calls.
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 3.2, 3.3_

- [ ] 3. Resolve-and-cache service, endpoint, and client trigger
- [ ] 3.1 Idempotent resolve-and-persist service
  - Resolve enrichment for an item and persist it, skipping items already checked, stamping the checked timestamp even when no data is found so the lookup never repeats, returning a typed outcome, and never throwing on a provider failure (mirrors the cover-art resolve-and-persist behavior).
  - _Requirements: 2.2, 2.3, 3.2, 7.3_

- [ ] 3.2 Authenticated enrichment endpoint
  - Add an authenticated route that validates the item id and delegates to the service, returning the persisted enrichment; an unknown item is a not-found, and a provider failure returns success with no data rather than a server error; render no item data without a session.
  - _Requirements: 2.1, 7.2, 7.3, 9.1_

- [ ] 3.3 Fire-once client trigger
  - Render a client trigger only for an item that has not yet been checked; on mount it requests resolution once and refreshes the view when enrichment lands, leaving the rest of the page interactive and silently ignoring failures.
  - _Requirements: 2.1, 2.4, 7.1_

- [ ] 3.4 Integration-test the service and endpoint
  - Using the in-memory database with the committed migration, test that the first resolution persists enrichment and the checked timestamp, a second call is idempotent with no external call, an unknown id is not-found, and a "no data" result still stamps the checked time; test the endpoint for unauthenticated, invalid-body, unknown-item, and success cases, and that a provider failure yields success-with-no-data rather than a server error.
  - _Requirements: 2.2, 2.3, 7.2, 7.3_

- [ ] 4. Reviews and ratings section
- [ ] 4.1 Transient TMDB review-excerpt fetch
  - Using the persisted movie/TV provider id, fetch a small capped number of user-review excerpts read-only per view: each excerpt is plain text bounded in length with a truncation indicator, an optional author rating, an author attribution, and an https-only outbound link; return nothing for non-movie/TV items or on any failure, never throwing.
  - _Requirements: 4.2, 5.1, 5.2, 5.3, 5.4, 3.2_

- [ ] 4.2 Per-type reviews/ratings section
  - Present a reviews/ratings section that branches by media type: movies/TV show the persisted audience score and then stream the excerpts behind a non-blocking boundary; books show the persisted rating scores from both book sources with attribution; music and podcasts omit the section entirely; convey ratings by text and semantics (not color), and show an accessible empty/unavailable state for a type that can have reviews but has none.
  - _Requirements: 4.1, 4.3, 4.4, 4.5, 4.6, 7.1, 7.2, 8.4_

- [ ] 4.3 Unit-test review fetch and section behavior
  - Test that the excerpt fetch caps count, truncates and flags long text, drops non-https links, returns empty on failure, and is skipped for non-movie/TV types; test that the section is omitted for music/podcasts and renders scores for books.
  - _Requirements: 4.2, 4.4, 5.2, 5.3_

- [ ] 5. Detail page display and integration
- [ ] 5.1 Per-type enriched-metadata display
  - Render the enriched, type-appropriate fields for the item, listing only the fields actually present and omitting absent ones, using the existing design system so it is responsive, supports light and dark themes, uses accessible roles/labels/headings, and conveys nothing by color alone; cover the pure per-type field selection with a unit test.
  - _Requirements: 1.1, 1.6, 1.7, 8.1, 8.2, 8.3_

- [ ] 5.2 Wire enrichment and reviews into the detail page
  - Compose the enriched-metadata display, the fire-once resolver trigger, and the reviews section into the existing detail page so the core content renders immediately and the enriched/review sections fill in without blocking, while preserving the page's existing not-found, loading, and action-error behavior and all existing actions and links.
  - _Requirements: 2.1, 2.4, 7.1, 7.4, 9.1_

- [ ] 6. Full verification and non-regression
  - Run the type-checker, full test suite, and production build to green; confirm the existing detail page, cover-art resolution, trending/add-to-library, search, and media-type-filter behavior are unchanged; confirm all new external logic is covered by injected-fetch tests that make no live provider calls; and confirm no `any` in application code and no use of unsafe HTML rendering for external content.
  - _Requirements: 9.1, 9.3, 9.4_
