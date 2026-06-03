# Research & Design Decisions

## Summary
- **Feature**: `media-search`
- **Discovery Scope**: Extension — a search fan-out mirroring the shipped trending model, plus an in-memory scoped filter, reusing existing provider clients, the add/cover/detail paths, and the URL-filter pattern.
- **Key Findings**:
  - Global search is structurally the **trending fan-out with a query**: a per-type provider port + a concurrent, per-source-isolated fan-out returning the existing `TrendingResponse` envelope, rendered with the existing `TrendingCard` (Add + Details + owned indicator).
  - Every supported type has a usable **search** endpoint we can reach with patterns we already run: Open Library Search (books, keyless), iTunes Search (music + podcasts, keyless), TMDB Search (TV + movies, keyed by the existing `TMDB_API_KEY`). No new secret is required.
  - The `/search` results page can call the fan-out **server-side directly** (like the trending page calls `fetchTrendingFeed`) — gated by `getSessionUser` — so no new client-exposed API route is required for v1.
  - Scoped search is a pure in-memory filter over data the page already loads, composing with the existing media-type filter and persisted via a `?q=` URL param.

## Research Log

### Reuse of the trending model
- **Context**: Avoid reinventing fan-out, normalization, cards, add, and ownership.
- **Sources**: [feed.ts](../../../src/lib/trending/feed.ts), [provider.ts](../../../src/lib/trending/provider.ts), [TrendingCard.tsx](../../../src/components/trending/TrendingCard.tsx), [add.ts](../../../src/lib/trending/add.ts), [ownership.ts](../../../src/lib/trending/ownership.ts), [item/[id]/page.tsx](../../../src/app/(app)/item/[id]/page.tsx).
- **Findings**: trending defines a provider port + `fetchTrendingFeed` (concurrent, maps unconfigured/error/ok per source) → `TrendingResponse`; `TrendingCard` renders any `TrendingItem` with Add (`/api/trending/add`) and Details (`/api/trending/resolve` → `/item/[id]?from=…`) and an owned state via `ownedTrendingKeys`. The detail page hosts shelf + review.
- **Implications**: Define a parallel `SearchProvider` port + `searchMedia(query, …)` fan-out returning the same envelope; render results with `TrendingCard`; reuse add/resolve/ownership/detail unchanged. `TrendingCard` gains an optional `detailsFrom` so search results' Details deep-link `?from=search`; `itemBackTarget` gains a `search` entry.

### Provider search endpoints (reuse existing integrations)
- **Context**: One search source per media type.
- **Sources**: Open Library Search + iTunes Search (already used by cover-art), TMDB (already used by trending).
- **Findings**:
  - **Books** — Open Library `GET /search.json?q=<query>&fields=title,author_name,cover_i,...&limit=N` (keyless); cover via `covers.openlibrary.org/b/id/{cover_i}-M.jpg`.
  - **Music + Podcasts** — iTunes `GET /search?term=<query>&entity=album|podcast&limit=N&country=US` (keyless, ~20/min); `artworkUrl100` upscaled.
  - **TV + Movies** — TMDB `GET /3/search/movie?query=<q>&api_key=…` and `/3/search/tv?…` (keyed by `TMDB_API_KEY`; unconfigured ⇒ that source degrades); poster via `image.tmdb.org/t/p/w500`.
- **Implications**: New, small search clients in `lib/search/` that fetch these and normalize into `TrendingItem` lists, mirroring the cover-art/trending clients (timed fetch, `httpsOrNull`, defensive parsing, injectable fetch). Music uses iTunes (keyless) — Spotify is not required for search.

### Scoped page search + global bar
- **Context**: Req 5 (Library/Wishlist/Reviews) and Req 1 (global bar).
- **Sources**: [library/page.tsx](../../../src/app/(app)/library/page.tsx), [media-type.ts](../../../src/lib/media-type.ts), [AppNav.tsx](../../../src/components/nav/AppNav.tsx).
- **Findings**: those pages already resolve a `?type=` filter and filter `composeShelfItems` in memory; the shell (`AppNav`) is the natural home for a persistent search input.
- **Implications**: Add a pure `matchesQuery(item, q)` filter composed with the type filter; carry `?q=` alongside `?type=` (preserve each other). The global bar is a native `GET` form to `/search` (submit-based, satisfying "not per keystroke") — no client JS needed.

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks | Decision |
|--------|-------------|-----------|-------|----------|
| Search fan-out mirroring trending (chosen) | `SearchProvider` port + `searchMedia` concurrent fan-out → `TrendingResponse`; render with `TrendingCard` | Maximum reuse (cards/add/cover/detail/ownership); per-source isolation for free; testable with injected fetch | A few new search clients to maintain | **Selected** |
| One combined search client | Single function hitting all APIs inline | Fewer files | Loses per-source isolation/labels; harder to test/extend | Rejected |
| Client-side search calling providers | Browser calls provider APIs | No server work | Leaks no secrets but breaks the server-side rule (TMDB key), CORS/rate issues | Rejected |

## Design Decisions

### Decision: `SearchProvider` port + `searchMedia` fan-out, results as `TrendingItem`
- **Context**: Req 1–4.
- **Selected Approach**: `SearchProvider { id, label, mediaType, isConfigured(env), search(query, {limit, fetchImpl}) }`; a static registry (Open Library books, iTunes music, iTunes podcasts, TMDB movies, TMDB tv); `searchMedia({query, limit, env, fetchImpl, providers})` runs configured providers concurrently, isolating each (unconfigured/error/ok) into a `TrendingResponse`. The `/search` page calls it server-side.
- **Rationale**: Identical resilience/normalization to trending; results render with the existing card and add path with no UI/feed changes.

### Decision: No new client API route; server-component results page
- **Context**: Req 4.1, 4.5.
- **Selected Approach**: `/search?q=` is an authenticated server component (gated by `getSessionUser`, like `/trending`) that calls `searchMedia` and renders grouped results; the global bar is a `GET` form that navigates there.
- **Rationale**: Keeps the exchange server-side without a redundant endpoint; submit-based by construction.

### Decision: Scoped search as a composable in-memory filter
- **Context**: Req 5, 6.2.
- **Selected Approach**: A pure `matchesQuery` (title/creator, case-insensitive, accent-folded) applied after the media-type filter on Library/Wishlist/Reviews; `?q=` persisted in the URL and preserved alongside `?type=`. A small `SearchBox` (GET form) per page.
- **Rationale**: Fast, no external calls, consistent with the existing URL-state filters.

## Risks & Mitigations
- **Provider rate limits / latency (iTunes ~20/min)** — submit-based (not per keystroke), per-provider result caps, timeouts, server-side caching, and per-source isolation; one query = a handful of cached calls.
- **TMDB unconfigured** — TV/movie source reports `unconfigured`; other sources still return (graceful).
- **Result/library duplication** — owned results flagged via `ownedTrendingKeys`; the atomic find-or-create de-dups on add.
- **Wrong/loose matches** — providers' relevance ranking + per-provider caps; results are clearly source/type-attributed so the reader judges.

## References
- [src/lib/trending/feed.ts](../../../src/lib/trending/feed.ts) / [provider.ts](../../../src/lib/trending/provider.ts) — fan-out + port to mirror.
- Open Library Search, iTunes Search, TMDB Search — endpoints already exercised by cover-art and trending.
