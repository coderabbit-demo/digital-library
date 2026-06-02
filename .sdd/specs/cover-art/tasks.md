# Implementation Plan

- [x] 1. Persisted cover-artwork data model
- [x] 1.1 Add cover-artwork storage to media items
  - Add an optional cover-artwork URL and a "cover checked" marker to the media item record and its domain type, generate the database migration, and keep existing items valid with no artwork (the fields are optional and backward compatible).
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 1.2 Data access for reading and updating artwork
  - Provide a way to set an item's artwork URL and checked marker, to find items that still need a cover (never checked and of a supported type), and to carry an artwork URL when creating or reusing a catalog item.
  - Cover with integration tests against the real migration.
  - _Requirements: 2.3, 4.2, 4.5_

- [x] 2. (P) Cover-resolution domain
- [x] 2.1 Item match rule
  - Decide whether an external candidate is confidently the same item using normalized title comparison with creator corroboration (title-only for podcasts), rejecting ambiguous or unrelated matches so a wrong cover is never accepted.
  - _Requirements: 5.1, 5.2_

- [x] 2.2 (P) Book cover source
  - Resolve an ebook cover from the keyless books source by searching the item's title and author, applying the match rule, and building an https cover image URL; the lookup is time-bounded and returns nothing on a miss, a non-success response, or a timeout.
  - _Requirements: 4.1, 4.3, 4.4, 4.6, 5.3, 7.1_

- [x] 2.3 (P) Music, podcast, and TV/movie cover source
  - Resolve album, podcast, and TV/movie art from the keyless media-catalog source using the lookup category appropriate to the media type, upscaling the returned artwork, applying the match rule and https validation; time-bounded and graceful on failure.
  - _Requirements: 4.1, 4.3, 4.4, 4.6, 5.3, 7.1_

- [x] 2.4 Resolve dispatcher by media type
  - Route an item to the correct source for its media type and return a single validated cover URL or nothing; a media type with no supported source yields nothing without attempting a lookup.
  - _Requirements: 4.1, 4.7_

- [x] 3. On-demand cover-resolution endpoint
  - Add an authenticated endpoint that, given an item, resolves and persists its cover exactly once: it performs no external call when the item already has artwork or has already been checked (idempotent), records the checked marker, stores the URL only on a confident match, returns the resulting URL or nothing, and never returns a server error when a source fails.
  - Cover with integration tests (resolve-and-persist, idempotency, auth required, graceful no-result).
  - _Requirements: 4.2, 4.3, 4.5, 4.6_

- [x] 4. Cover rendering on the detail page
- [x] 4.1 (P) Render artwork in the shared cover component
  - Extend the shared cover renderer to display the artwork image when present — loaded over https, without a referrer, lazily, and with an accessible alternative — and to fall back to the existing themed placeholder when artwork is absent or the image fails to load.
  - Cover with a component test for both the image and fallback paths.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2_

- [x] 4.2 Wire the detail page and the on-demand trigger
  - Show the stored artwork on the detail page; when an item has no artwork, has never been checked, and is of a supported type, trigger a single on-demand resolution and update the view if a cover is found — without blocking the render or breaking the page on failure.
  - _Requirements: 1.1, 4.6, 7.2_

- [x] 5. Capture artwork when adding from Trending
- [x] 5.1 Carry the trending artwork through the add request
  - Accept an optional artwork URL on the add-from-trending request (validated as https), and include the browsing item's artwork when the user adds it to the library.
  - _Requirements: 3.1, 3.2_

- [x] 5.2 Persist artwork on add without blocking or overwriting
  - Persist the supplied artwork when a new catalog item is created; when the add reuses an existing catalog item that lacks artwork, fill it from the supplied value, but never overwrite artwork that already exists; do not block adding an item on external cover availability.
  - _Requirements: 3.1, 3.3, 3.4, 7.3_

- [x] 6. Backfill covers for seeded and existing items
  - Provide a throttled, idempotent maintenance routine that finds items still needing a cover and resolves and persists them in bulk, staying within the external source's rate limit and skipping items already checked so it can be re-run safely.
  - _Requirements: 4.1, 4.2, 4.5_

- [x] 7. Consistency and full verification
  - Run the type-checker, the test suite, and the production build; confirm covers display with the themed-placeholder fallback, the Trending browsing art still shows as before, and existing surfaces that rely on the placeholder are not regressed.
  - _Requirements: 6.1, 6.2, 6.3, 7.1_
