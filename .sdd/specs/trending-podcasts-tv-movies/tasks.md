# Implementation Plan

- [ ] 1. Widen trending media types and document the TMDB key
  - Add `podcast` and `tv_movie` to the trending media-type union so providers can emit them and they flow through the existing feed, filter, add-to-library, and cover-art unchanged.
  - Document a new optional `TMDB_API_KEY` in the environment example (server-side only), consistent with the existing provider keys.
  - _Requirements: 5.1, 5.2, 3.2_

- [ ] 2. (P) Apple Podcasts trending provider
  - Add a keyless provider for the `podcast` media type that fetches the current Apple Podcasts charts server-side (cached within rate limits) and normalizes each entry into the shared trending-item shape: title, creator, the chart as the list label, rank from chart order, first genre, https artwork (upscaled), and the external id/url.
  - The provider is always configured (no key), validates that artwork/links are https, and throws on a failed request so the fan-out isolates it.
  - Cover with unit tests using an injected fetch: field mapping, rank-by-order, artwork upscale + https validation, skipping malformed entries, capping to the limit, and empty/error payloads.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.3, 3.4, 4.2_

- [ ] 3. (P) TMDB trending providers for TV and movies
  - Add two providers (Trending Movies, Trending TV), both mapped to the `tv_movie` media type and sharing one TMDB client, that fetch TMDB's weekly trending lists server-side (cached) using the env key, and normalize each entry into the shared item shape: title (movie or show name), the list label distinguishing movies from TV, rank from order, https poster artwork, and the external id/url. Trending items carry no creator, so creator is left empty.
  - Both providers report unconfigured when the key is absent (rather than erroring), read the key from the environment only, validate https, and throw on a failed request.
  - Cover with unit tests using an injected fetch: movie-vs-show title/label mapping, poster URL construction + https, rank order, configured/unconfigured by key presence, skipping entries without a title, capping, and error payloads.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 4.2_

- [ ] 4. Register the providers and verify end-to-end
  - Register the podcast and the two TMDB providers in the trending registry so their items appear in the Home section, the dedicated page's source-grouped view, and (automatically) the media-type filter, and remain addable to the library with cover art.
  - Update the registry/fan-out tests to confirm the new providers are present, that the feed yields `unconfigured` for the TMDB sources when no key is set and `ok` for podcasts, and that one source failing never sinks the others.
  - Run the type-checker, full test suite, and production build; confirm the existing books/music providers and all other surfaces are unchanged (no live network in tests).
  - _Requirements: 4.1, 4.3, 5.1, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3_
