# Implementation Plan

- [ ] 1. Search provider clients and fan-out
  - Add a search provider port and per-type clients that query each external source and normalize results into the shared trending-item shape: books (Open Library, keyless), music and podcasts (iTunes, keyless), TV and movies (TMDB, keyed by the existing key; unconfigured when absent). Each client uses a timed fetch with an injectable fetch, validates https artwork, caps results, and never throws to the fan-out.
  - Add a concurrent fan-out that runs the configured providers for a query and returns the existing per-source response envelope, isolating each provider (unconfigured/error/ok); an empty/whitespace query makes no calls.
  - Cover with unit tests using injected fetch (no live calls): per-client URL/params, normalization + https validation + caps + no-match/error handling; fan-out aggregation, per-source isolation, and the empty-query short-circuit.
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 4.1, 4.2, 4.3, 4.4_

- [ ] 2. Global search results page and app-shell search bar
  - Add an authenticated search-results page that reads the query from the URL, runs the fan-out server-side, and renders the results grouped/labeled by source and media type using the existing media card with its add and details actions, flagging items already in the library; show loading and empty states, and a prompt when the query is empty.
  - Add a general search input to the app shell that submits the query to the results page (submit-based, works without client JS).
  - Make a result's "details" deep-link back to search, and add a Search entry to the detail page's back-navigation.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 4.5_

- [ ] 3. Scoped search on Library, Wishlist, and Reviews
  - Add a pure title/creator query filter and apply it (composed with the existing media-type filter) on the Library, Wishlist, and Reviews pages; add a search input on each page that submits the query while preserving the active media-type filter, reflect the query in the page URL, and show the page's empty state when nothing matches.
  - Cover the filter and its composition with the media-type filter with unit tests.
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.2_

- [ ] 4. Full verification and non-regression
  - Run the type-checker, test suite, and production build; confirm the existing trending, add-to-library, cover-art, detail, and media-type-filter behavior is unchanged, and that search aggregation is covered by tests that make no live provider calls.
  - _Requirements: 6.1, 6.3_
