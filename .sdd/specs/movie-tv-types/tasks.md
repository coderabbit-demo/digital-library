# Implementation Plan

- [ ] 1. First-class movie/tv types and the shared video shape
- [ ] 1.1 Introduce movie and tv as media types with a central type-to-kind mapping
  - Add `movie` and `tv` as recognized media types and rename the combined film/TV member of the metadata and enrichment unions to a single shared `video` shape; add a central mapping from an open media type to its closed metadata/enrichment kind (movie, tv, and legacy combined all map to `video`; other types map to themselves), and route the boundary parsers through it so the stored kind is always derived from the type.
  - Update the closed trending media-type union to carry `movie` and `tv` (instead of the combined value) so transient feed/search items type precisely.
  - Cover the mapping and the parsers with unit tests (movie/tv/legacy → video shape; other types unchanged).
  - _Requirements: 1.1, 1.2, 8.2, 8.4_

- [ ] 1.2 Separate labels, icons, and filter options for Movies and TV Shows
  - Give Movies and TV Shows their own human-readable labels and distinct type icons wherever a media-type icon or label is shown, keeping a humanized fallback for unknown/legacy types and a transitional label for the combined value; ensure the data-driven media-type filter surfaces them as independent options with no per-type branching.
  - _Requirements: 1.1, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4_

- [ ] 2. Providers and add flow emit the precise type
- [ ] 2.1 (P) Trending and Search tag movies and TV distinctly
  - Make the movie and TV trending providers and the movie and TV search providers each emit their precise media type so newly surfaced items are typed as `movie` or `tv`, and adding such an item persists it under that type.
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 2.2 (P) Catalog/add picker and cover lookup split movie vs TV
  - Split the add-item type picker into Movie and TV Show choices with the appropriate per-type fields, and split the cover-resolution lookup entities so movies and TV shows each resolve covers from the right source.
  - _Requirements: 2.3, 2.4, 8.1_

- [ ] 3. Migration, backfill, and seed data
- [ ] 3.1 Backfill existing combined-type rows
  - Add a committed data migration that reclassifies existing combined-type catalog rows to `movie` or `tv`, preferring the resolved TMDB type from prior enrichment, then a season-count hint, then a documented default; change only the type so each item's library entries, reviews, tags, activity, and cover are preserved; make re-running a no-op.
  - Update seed data so the seeded film and show carry the precise types (and the shared video metadata shape).
  - Add an integration test (against the in-memory database with the committed migration) asserting the reclassification mapping and that related user data survives.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 4. TV season/episode and synopsis enrichment
- [ ] 4.1 Capture seasons, episodes, and synopsis from TMDB
  - Extend the TMDB enrichment to record season and episode counts for TV items and a synopsis (overview) for both movies and TV, query only the endpoint matching the item's precise type (falling back to trying both for legacy combined items), validate the new fields at the boundary, cap any list-valued data, and never throw; reuse the existing resolve-and-cache flow so enrichment is fetched once and cached.
  - Cover with unit tests using injected fetch: a TV payload yields seasons/episodes/synopsis; a movie payload yields a synopsis but no seasons/episodes; failures degrade to empty.
  - _Requirements: 5.1, 5.3, 5.4, 6.1, 7.1, 7.2, 7.3_

- [ ] 4.2 Display episodic info and synopsis on the detail page
  - Show season and episode counts in the detail page's details for TV items (omitted for movies and when absent), and show a synopsis on the detail page for movies and TV, preferring an existing description and falling back to the captured synopsis so there is no duplication and no empty placeholder; render external text safely as plain text.
  - Cover the field-selection and synopsis-fallback logic with unit tests.
  - _Requirements: 5.2, 5.4, 6.2, 6.3, 6.4, 7.4_

- [ ] 5. Full verification and non-regression
  - Run the type-checker, full test suite, and production build to green; confirm Movies and TV Shows filter independently on every surface (Library, Wishlist, Reviews, Home feed and Trending section, Trending page, Search), that existing routes, auth, cover resolution, the enrichment endpoint, and detail actions are unchanged, that the backfill leaves no combined-type rows, and that no `any` is introduced.
  - _Requirements: 3.1, 3.2, 8.1, 8.3, 8.4_
