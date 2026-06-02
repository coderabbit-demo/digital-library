# Research & Design Decisions

## Summary
- **Feature**: `trending-podcasts-tv-movies`
- **Discovery Scope**: Extension (new providers under the shipped Trending Now abstraction) with two external-API integrations.
- **Key Findings**:
  - The trending system is already pluggable: a `TrendingProvider` port (`provider.ts`), a static `registry.ts`, and a fan-out (`feed.ts`) that isolates each provider (`unconfigured`/`ok`/`error`). New sources are **just new providers** + registry entries + a widened `TrendingMediaType` — no feed/UI changes.
  - **Apple Podcasts charts** are keyless and https: `GET https://rss.marketingtools.apple.com/api/v2/us/podcasts/top/{N}/podcasts.json` → `feed.results[]` (`id`, `name`, `artistName`, `artworkUrl100` on `mzstatic.com`, `url`, `genres[]`); array order is the chart rank. `artworkUrl100` upscales `100x100bb`→`600x600bb` like iTunes.
  - **TMDB** covers TV + movies but needs a free **API key** (env, query param `api_key`), matching the existing keyed providers (NYT/Spotify) — absent key ⇒ `unconfigured`.
  - Everything downstream already supports the new types: `media-type-filters` is data-driven (Podcasts/“TV & Movies” chips appear automatically), `cover-art` persists provider artwork on add and resolves podcast/tv covers, and add-to-library keys on `(type,title,creator)`.

## Research Log

### Existing trending provider system (reuse target)
- **Context**: Confirm the seam new sources plug into.
- **Sources Consulted**: [provider.ts](../../../src/lib/trending/provider.ts), [registry.ts](../../../src/lib/trending/registry.ts), [feed.ts](../../../src/lib/trending/feed.ts), [nyt.ts](../../../src/lib/trending/nyt.ts), [spotify.ts](../../../src/lib/trending/spotify.ts), [types/trending.ts](../../../src/lib/types/trending.ts).
- **Findings**: `TrendingProvider = { id, label, mediaType, isConfigured(env), fetchTrending({limit, fetchImpl}) }`; the fan-out runs configured providers concurrently and maps throws→`error`, missing config→`unconfigured`. NYT shows the pattern: pure `normalize…` function (unit-tested), `httpsOrNull` guard, env key read server-side, Next Data Cache via `fetch(url, { next: { revalidate } })`. `TrendingMediaType` is currently `"ebook" | "music"`.
- **Implications**: Add providers that emit the same `TrendingItem`; widen `TrendingMediaType` to add `"podcast"` and `"tv_movie"`. No change to feed/registry mechanics beyond new entries.

### Apple Podcasts charts (podcasts — keyless)
- **Context**: A keyless popularity source for `podcast`.
- **Sources Consulted**: live feed `https://rss.marketingtools.apple.com/api/v2/us/podcasts/top/10/podcasts.json` (the older `rss.applemarketingtools.com` host 301-redirects here).
- **Findings**: No auth. `feed.title` = "Top Shows"; `feed.results[]` each: `id`, `name`, `artistName`, `kind: "podcasts"`, `artworkUrl100` (https `mzstatic.com`), `url` (https Apple Podcasts link), `genres[]` (`{ genreId, name }`). No per-item rank field — the array order is the chart position. `artworkUrl100` ends `100x100bb.png`; replacing with `600x600bb` enlarges it.
- **Implications**: Provider id `apple-podcasts`, `isConfigured` always true (keyless). Normalize: `rank = index+1`, `creator = artistName`, `listLabel = "Top Shows"`, `genre = genres[0].name`, `artworkUrl` = upscaled https, `externalUrl = url`, `externalId = id`. Cache via `next.revalidate`.

### TMDB trending (TV + movies — keyed)
- **Context**: A reliable TV/movie popularity source; chosen over keyless options for completeness.
- **Sources Consulted**: [TMDB Trending reference](https://developer.themoviedb.org/reference/trending-movies) (schema not rendered inline; contract below is the stable, documented TMDB v3 API).
- **Findings**: `GET https://api.themoviedb.org/3/trending/movie/week` and `/3/trending/tv/week`, auth via `?api_key=<v3 key>` (query param). Response `{ results: [...] }`; each item: `id`, `title` (movie) / `name` (tv), `overview`, `poster_path` (e.g. `/abc.jpg`), `popularity`, `release_date` (movie) / `first_air_date` (tv), `genre_ids[]`. Poster URL = `https://image.tmdb.org/t/p/w500{poster_path}` (image base + size; stable). TMDB has no hard published rate limit but caching is expected.
- **Implications**: Key in env (`TMDB_API_KEY`); `isConfigured` checks it. Two providers (movies, tv) share one TMDB client. Trending payload carries **no creator/cast**, so `creator` is empty for tv/movie items (the card shows title + source/list). `artworkUrl` built from `poster_path` (https), `null` when absent. Parse defensively (title vs name, dates). Cache via `next.revalidate`.

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks | Decision |
|--------|-------------|-----------|-------|----------|
| New providers under existing abstraction (chosen) | `apple-podcasts`, `tmdb-movies`, `tmdb-tv` implement `TrendingProvider`, registered in `registry.ts` | Zero feed/UI change; isolation + caching for free; mirrors NYT/Spotify | Must widen `TrendingMediaType` (small typed change) | **Selected** |
| One combined `tmdb` provider doing two fetches | Single provider fetches movie+tv and merges | One registry entry | Loses the per-source group on the page; conflates two lists; harder partial failure | Rejected |
| Keyless TV/movie source | Avoid the TMDB key | No new secret | No reliable keyless trending source; degraded data | Rejected (user chose TMDB) |

## Design Decisions

### Decision: Two TMDB providers (movies, tv) sharing one client
- **Context**: Req 2.4 (distinguish TV vs movie within the single `tv_movie` type); the page groups by source/provider.
- **Selected Approach**: `tmdb-movies` (label "Trending Movies") and `tmdb-tv` (label "Trending TV"), both `mediaType: "tv_movie"`, sharing a `tmdb.ts` client/normalizer. Each renders as its own source group; the media-type filter still groups both under "TV & Movies" (filter keys on `mediaType`, not source).
- **Rationale**: Natural fit for the per-source-group page and per-source failure isolation; distinguishes the two lists without a new media type.
- **Trade-offs**: Two registry entries and two upstream calls (both cached); both gated by the same `TMDB_API_KEY`.

### Decision: Widen `TrendingMediaType`; rely on downstream data-driven behavior
- **Context**: Req 5 (reuse across surfaces).
- **Selected Approach**: Add `"podcast"` and `"tv_movie"` to `TrendingMediaType`. No other type changes: `mediaTypeLabel` already maps these to "Podcasts"/"TV & Movies"; the trending filter derives options from present types; add-to-library and cover-art already handle any media type.
- **Rationale**: Smallest change that lights up every surface automatically.

### Decision: Empty creator for TV/movie items
- **Context**: TMDB trending carries no creator/cast.
- **Selected Approach**: `creator: ""` for tv/movie items; the card shows title + source/list; the add path persists the TMDB poster as artwork (so cover-art won't re-resolve).
- **Rationale**: Avoids an extra credits call per item; artwork is already provided so the blank creator has no cover-resolution impact.

## Risks & Mitigations
- **TMDB key absent in an environment** — `isConfigured` returns false → the two TMDB groups show `unconfigured`; podcasts/books/music unaffected (graceful degradation, Req 4.1).
- **External payload drift** — pure normalizers parse defensively (string guards, `httpsOrNull`) and skip malformed entries, mirroring `normalizeNytOverview`.
- **Rate/latency** — `next.revalidate` server-side caching per source; the fan-out already isolates slow/erroring sources.
- **Apple host change** — already migrated `applemarketingtools.com`→`marketingtools.apple.com`; use the current host and validate https.

## References
- [Apple RSS marketing feed (podcasts)](https://rss.marketingtools.apple.com/api/v2/us/podcasts/top/10/podcasts.json)
- [TMDB Trending API](https://developer.themoviedb.org/reference/trending-movies) · [TMDB images guide](https://developer.themoviedb.org/docs/image-basics)
- [src/lib/trending/nyt.ts](../../../src/lib/trending/nyt.ts) — provider pattern to mirror.
