# Research & Design Decisions — trending-now

## Summary
- **Feature**: `trending-now`
- **Discovery Scope**: Extension + **Complex Integration** — additive to the media-platform-v2 platform, but introduces two external API integrations (NYT Books, Spotify) with OAuth, caching, and per-provider failure isolation.
- **Key Findings**:
  - The platform already has every internal seam needed: the typed Route-Handler template, `getSessionUser()` gating, the DAL (`DbExecutor`), find-or-create media + library upsert + activity helpers, the enriched media card, and a data-driven nav. Trending Now is **purely additive** — new endpoints + a provider layer + new surfaces; no schema change required (trending items are transient until a user adds one, which reuses the existing `media_items`/`library_entries` path).
  - A **provider registry / adapter pattern** cleanly satisfies the "pluggable, normalized, per-provider degradation" requirements: each external source is an adapter to a common `TrendingProvider` port; the endpoint fans out over the registry and isolates each provider's failure.
  - External-call **caching is idiomatic via `fetch(..., { next: { revalidate } })`** (Next.js Data Cache) — no new cache infra. The Spotify app token (client-credentials) is cached in server module memory until just before expiry.

## Research Log

### NYT Books (best-seller) — books provider
- **Context**: Req 3 needs current best sellers across all lists, plain, books only.
- **Source**: NYT Books API (`developer.nytimes.com`), Best Sellers **list overview** endpoint.
- **Findings**: `GET https://api.nytimes.com/svc/books/v3/lists/overview.json?api-key=$NYT_API_KEY` returns the current top books for **every list at once** (`results.lists[]`, each with `list_name` and `books[]` carrying `title`, `author`, `rank`, `book_image`, `primary_isbn13`, `amazon_product_url`). One request covers the "all genres / all lists" breadth (no per-list fan-out). NYT enforces per-key rate limits (low; ~a few requests/min, daily cap) → must cache.
- **Implications**: One cached call per revalidation window yields the whole books feed. Normalize each book → `TrendingItem` (mediaType `ebook`, `creator=author`, `listLabel=list_name`, `rank`, `artworkUrl=book_image`). De-dupe across lists by ISBN, else normalized title+author.

### Spotify — music provider
- **Context**: Req 3 needs current/popular music; Spotify deprecated several Browse/recommendation endpoints (late 2024) for new apps.
- **Sources**: Spotify Web API docs (`developer.spotify.com/documentation/web-api`) and the **New Releases** reference (`/reference/get-new-releases`) — provided by the maintainer.
- **Findings**: Use **client-credentials OAuth** (`POST https://accounts.spotify.com/api/token`, HTTP Basic `client_id:client_secret`) for an app token (no user login), then **`GET https://api.spotify.com/v1/browse/new-releases?limit=N`** → `albums.items[]` (`name`, `artists[]`, `images[]`, `external_urls.spotify`, `id`). This endpoint works with client-credentials and is the durable choice for "what's popular now" given the deprecations.
- **Implications**: Normalize each album → `TrendingItem` (mediaType `music`, `title=album name`, `creator=artists joined`, `listLabel="New Releases"`, `artworkUrl=images[0].url`, `externalUrl`). The app token is cached server-side until shortly before `expires_in`.
- **Deferred (non-goal here)**: per the maintainer, a later enhancement will add **Spotify user OAuth from the Profile page** to import the user's own Spotify library — that needs the authorization-code flow + token storage and is explicitly out of scope for this spec.

### Add-to-library reuse
- **Context**: Req 7 — add a trending item; de-dupe against existing catalog by (type, title, creator).
- **Findings**: The DAL already has `findMediaByTitleCreator`, `insertMediaItem`, `upsertEntryStatus`, `insertActivity`, `findEntry`, and `recordNewlyUnlocked`. `findMediaByTitleCreator` matches title+creator but not type; trending spans types, so a **type-scoped match** is needed.
- **Implications**: Add a small DAL helper `findMediaByTypeTitleCreator` (or extend the existing one) and a `POST /api/trending/add` handler that find-or-creates the media item, upserts the entry, records the activity, and runs unlock evaluation — reusing existing helpers end-to-end.

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Provider registry + adapter (chosen) | Each source implements a common `TrendingProvider`; endpoint fans out + isolates failures | Pluggable (Req 2), per-provider degradation (Req 6), no UI branching | Slight indirection | Matches requirements directly |
| One endpoint per provider | `/api/trending/nyt`, `/api/trending/spotify` | Simple per-source | Client must orchestrate N calls + merge; duplicates degradation logic client-side | Rejected — pushes fan-out/merge to the browser |
| Persist trending items to DB | Cache upstream lists in Postgres | Survives restarts | New tables/migration; staleness/ownership complexity; not required | Rejected — `fetch` revalidate cache suffices |
| Reuse `/api/media` for add | — | No new endpoint | Always inserts a *custom* item; no type-scoped find-or-create or de-dupe | Rejected — add a dedicated, de-duping handler |

## Design Decisions

### Decision: Provider registry behind one fan-out endpoint
- **Selected**: A `TrendingProvider` port (`id`, `mediaType`, `label`, `isConfigured(env)`, `fetchTrending()`), a static registry, and `GET /api/trending` that runs configured providers concurrently, each wrapped so one failure can't sink the others, returning a per-source result envelope.
- **Rationale**: Directly realizes Req 2 (pluggable/normalized), Req 6 (degradation), Req 4 (server-only, typed), Req 5 (caching per provider).
- **Trade-offs**: A tiny registry layer; worth it for isolation + extensibility.

### Decision: Caching via Next Data Cache + in-memory token
- **Selected**: Upstream `fetch` uses `next: { revalidate: <ttl> }` per provider; the Spotify token is memoized in module scope until ~60s before expiry.
- **Rationale**: No new infra; satisfies Req 5 quota/rate-limit goals; concurrent same-window requests are de-duped by the framework cache.

### Decision: Dedicated, de-duping add endpoint
- **Selected**: `POST /api/trending/add` → find-or-create `media_items` by (type, normalized title, creator) → `upsertEntryStatus` (default `wishlist`) → `insertActivity` → `recordNewlyUnlocked`, all in a transaction; returns whether it already existed.
- **Rationale**: Req 7 de-dup + activity + unlocks, reusing the platform's library path; keeps `/api/media` (custom add) unchanged.

### Decision: Supersede nyt-recommendations
- **Selected**: NYT ships as the books provider here; mark `.sdd/specs/nyt-recommendations/spec.json` superseded and add a note to its requirements; no `/recommendations` route/endpoint is built; nav uses the **Trending** destination.
- **Rationale**: Req 11 — one coherent feature, no duplicated NYT integration.

## Risks & Mitigations
- **Provider outage / missing key** → per-provider try/catch + `isConfigured`; the feed renders healthy sources and marks the rest (Req 6); app still boots (keys are optional, not in `REQUIRED_SERVER_ENV`).
- **Rate limits (esp. NYT)** → server-side revalidate cache; single overview call for all book lists; no per-render upstream calls.
- **Secret leakage** → keys read only server-side; endpoint returns trimmed typed DTOs; never proxy arbitrary upstreams (Req 4).
- **Untrusted external content** → normalize/validate into typed DTOs; render as text (no `dangerouslySetInnerHTML`); validate `artworkUrl` is https before use.
- **Live calls in tests** → providers take an injectable `fetch`/client; tests use mocked upstream responses (Req 12.3).
- **Duplicate adds** → server-side type-scoped match before insert (Req 7.5).

## References
- NYT Books API — Best Sellers list overview (`/svc/books/v3/lists/overview.json`).
- Spotify Web API — `https://developer.spotify.com/documentation/web-api` and Get New Releases (`/reference/get-new-releases`); client-credentials token at `accounts.spotify.com/api/token`.
- Platform steering: `.sdd/steering/{tech,structure,workflow}.md`; existing patterns in `src/db/queries.ts`, `src/app/api/*`, `src/components/library/MediaCard.tsx`.
