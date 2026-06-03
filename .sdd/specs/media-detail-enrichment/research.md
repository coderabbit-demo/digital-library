# Research & Design Decisions

## Summary
- **Feature**: `media-detail-enrichment`
- **Discovery Scope**: Extension (integration-focused) — layers metadata + reviews onto the shipped `media-detail` page, reusing the cover-art resolve-and-cache pattern.
- **Key Findings**:
  - The cover-art flow (`artworkUrl` + `artworkCheckedAt` → client `CoverResolver` → `POST /api/cover` → idempotent `resolveAndPersistCover`) is a directly reusable template for persisted enrichment; mirror it as `enrichment` + `enrichmentCheckedAt` → `EnrichmentResolver` → `POST /api/enrichment` → `resolveAndPersistEnrichment`.
  - The catalog row (`media_items`) carries **no external id**; providers must be re-queried by `type`/`title`/`creator` exactly as cover resolution does (`resolveCover`). Enrichment persists the resolved provider id (e.g. `tmdbId`) for the reviews fetch.
  - Numeric **scores** are stable enough to persist in `enrichment`; only **TMDB review excerpt text** is transient and must be fetched per view. Books therefore need no transient fetch (scores come from persisted enrichment); only movies/TV stream excerpts.
  - `covers/http.ts` (`fetchJson` with `AbortSignal.timeout`, `httpsOrNull`, `isRecord`) and validation-at-the-boundary are the established external-fetch discipline; reuse verbatim.

## Research Log

### External provider contracts (enrichment + reviews)
- **Context**: Determine exact endpoints/fields for each agreed provider with no new keys beyond Google Books.
- **Sources Consulted**: TMDB API v3 docs; Google Books API v1 docs; Open Library search/ratings JSON; iTunes Search API; MusicBrainz WS/2; prior web searches (OMDb/Goodreads ruled out — see below).
- **Findings**:
  - **TMDB (movies/TV)** — keyed (`TMDB_API_KEY`, already configured). Search `GET /3/search/{movie|tv}?query=&api_key=` → `results[].id`. Detail `GET /3/{movie|tv}/{id}?api_key=&append_to_response=credits,reviews` → `runtime`/`episode_run_time[]`, `genres[].name`, `release_date`/`first_air_date`, `tagline`, `vote_average`, `vote_count`, `credits.cast[].name`, `reviews.results[]` (`author`, `content`, `url`, `author_details.rating`).
  - **Google Books (books)** — new key (`GOOGLE_BOOKS_API_KEY`). `GET /books/v1/volumes?q=intitle:{title}+inauthor:{creator}&key=` → `items[0].volumeInfo`: `pageCount`, `publisher`, `publishedDate`, `categories[]`, `industryIdentifiers[]` (ISBN_10/13), `averageRating`, `ratingsCount`. Keyless works at low volume but key is recommended; absence must degrade silently.
  - **Open Library (books)** — keyless. `GET /search.json?title=&author=&fields=key,subject,first_publish_year` → `docs[0].subject[]`. Ratings `GET /works/{key}/ratings.json` → `summary.average`, `summary.count`.
  - **iTunes (music/podcasts)** — keyless. Search/lookup → `collectionName`, `trackCount`, `primaryGenreName`, `releaseDate`, `artistName` (podcast publisher). No critic reviews/scores exposed.
  - **MusicBrainz (music)** — keyless but requires a descriptive `User-Agent` and ~1 req/sec. `GET /ws/2/release/?query=release:{title} AND artist:{creator}&fmt=json` → `releases[0].date`, `label-info[].label.name`, `media[].track-count`.
- **Implications**: Per-type dispatch identical in shape to `resolveCover`. Movies/TV are the only type with review-text; books are scores-only; music/podcasts are metadata-only (no reviews section). MusicBrainz needs a custom UA header — extend the HTTP helper call site, not a new mechanism.

### No-new-keys constraint and ruled-out sources
- **Context**: User chose "None beyond Google Books"; confirm what that excludes.
- **Findings**: **Goodreads API** stopped issuing keys (Dec 2020) and is deprecated — not viable. **OMDb** (IMDb/Rotten Tomatoes/Metacritic) requires a key and was explicitly declined. **Last.fm**/**Podcast Index** require keys and were declined. Music/podcast "critic score" APIs do not exist for free.
- **Implications**: Movie/TV ratings come solely from TMDB; no IMDb/RT/Metacritic. Reviews section is omitted entirely for music and podcasts. This is a deliberate, documented degradation (Req 4.4).

### Reuse of the cover-art resolve-and-cache pattern
- **Context**: Persist enrichment without blocking render or repeating lookups.
- **Findings**: `resolveAndPersistCover` is idempotent on `artworkUrl || artworkCheckedAt`; `CoverResolver` (client) fires once on mount, POSTs, and `router.refresh()` on success; render performs no writes. `loading.tsx` covers route-level loading.
- **Implications**: Add `enrichmentCheckedAt` as the idempotency marker; `EnrichmentResolver` mirrors `CoverResolver`; writes stay out of render. Transient review excerpts are a **read-only** server fetch, so they are safe to `await` inside a Suspense-streamed server component (no write in render).

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Resolve-and-cache via client trigger + POST (chosen for enrichment) | Mirror cover-art: client `EnrichmentResolver` triggers idempotent persist | Proven in-repo; no writes in render; one lookup ever | Needs a tiny client component + route | Consistent with steering "reuse existing patterns" |
| Write-during-render in server component | `await` resolve+persist in the page render | Fewer files | Mutations in render are discouraged in App Router; harder to test | Rejected |
| Suspense-streamed read for transient reviews (chosen for excerpts) | Async server component inside `<Suspense>` | Server-side (safe), no client route, streams without blocking shell | Only suitable for read-only data | Used for TMDB excerpts only |
| Persist review excerpts too | Store excerpts in DB | Avoids refetch | Excerpts go stale; storage of third-party text; not warranted | Rejected — fetch per view |

## Design Decisions

### Decision: Persist scores, stream excerpts
- **Context**: "Scores + excerpts" with graceful, fast pages.
- **Selected Approach**: Persist all enrichment metadata **and numeric scores** on the media row; fetch only TMDB review-excerpt **text** per view via a Suspense-streamed server component.
- **Rationale**: Scores are stable and cheap to store; excerpt text changes and is third-party — fetching per view keeps it fresh and avoids persisting others' content. Books need no transient fetch at all.
- **Trade-offs**: A small per-view TMDB call for movies/TV; mitigated by timeout + graceful unavailable state.
- **Follow-up**: Confirm excerpt cap (default 3) and length cap during implementation.

### Decision: Re-query providers by title/creator (no external id on the row)
- **Context**: `media_items` has no external id column.
- **Selected Approach**: Each enrichment provider searches by `type`/`title`/`creator` (as cover resolution does), then fetches detail; the resolved provider id (e.g. `tmdbId`) is persisted in `enrichment` to drive the reviews fetch.
- **Rationale**: Avoids a schema/contract change to trending-resolve; matches the existing find-by-search approach.
- **Trade-offs**: Occasional mismatched search hit; mitigated by the same matching discipline used for covers and capped fields.

## Risks & Mitigations
- **Provider outage/latency** — Per-source isolation + `AbortSignal.timeout`; any source failing yields a partial/"unavailable" result, never an exception (Req 3.2, 7.3).
- **Untrusted external text/links** — Render excerpts as plain text (no `dangerouslySetInnerHTML`), bound length, `https`-only outbound links with `rel="noopener noreferrer"` + attribution (Req 5).
- **MusicBrainz rate limiting / UA requirement** — Single capped request per item with a descriptive User-Agent; failure degrades to iTunes-only music metadata.
- **Wrong search match** — Reuse cover-style title/creator matching; cap cast/categories/excerpts to keep the page bounded (Req 3.5).
- **Missing Google Books key** — Skip Google Books, keep Open Library; no error (Req 6.3).

## References
- [TMDB API](https://developer.themoviedb.org/reference/intro/getting-started) — search + detail + append_to_response credits/reviews
- [Google Books API](https://developers.google.com/books/docs/v1/using) — volumes query, volumeInfo fields
- [Open Library APIs](https://openlibrary.org/developers/api) — search.json + works ratings.json
- [iTunes Search API](https://performance-partners.apple.com/search-api) — keyless lookup/search
- [MusicBrainz WS/2](https://musicbrainz.org/doc/MusicBrainz_API) — release query, UA + rate-limit guidance
