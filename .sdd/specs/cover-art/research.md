# Research & Design Decisions

## Summary
- **Feature**: `cover-art`
- **Discovery Scope**: Complex Integration (new external API clients + schema change + cached backfill + match-safety), built on the existing media/library platform.
- **Key Findings**:
  - Two **keyless, https** cover sources cover all four media types: **Open Library** for ebooks (Search → `cover_i` → Covers-by-ID URL, which is *not* rate-limited), and the **iTunes Search API** for music/podcast/TV-movie art (`entity=album|podcast|movie|tvSeason`, `artworkUrl100` upscalable to `600x600bb`).
  - The platform already has the exact patterns to reuse: timed `fetch` with `AbortSignal.timeout`, an `httpsOrNull` validator, per-source graceful degradation, and atomic `findOrCreateMedia`. Trending items already carry validated https `artworkUrl` that is currently discarded on add.
  - The steering convention is **server-read / client-mutate**: a Server Component must not perform side-effectful writes during render, so cover resolution+persist belongs in a **Route Handler** (client-triggered) and an offline **backfill script**, not in the detail page's render.
  - Title/creator lookups can mismatch; a normalized **match rule** (title equality/containment + creator corroboration) is required so we never store a wrong cover (Req 5).

## Research Log

### Open Library (ebook covers)
- **Context**: Need keyless book covers for seeded/custom ebooks that have only title + author (no ISBN).
- **Sources Consulted**: [Search API](https://openlibrary.org/dev/docs/api/search), [Covers API](https://openlibrary.org/dev/docs/api/covers).
- **Findings**:
  - `GET https://openlibrary.org/search.json?title=<t>&author=<a>&fields=cover_i,title,author_name&limit=<n>` returns relevance-ranked `docs[]` with `cover_i`, `title`, `author_name[]`. No key required.
  - Cover image: `https://covers.openlibrary.org/b/id/<cover_i>-M.jpg` (M = "details page" size). **Access by cover ID is unrestricted**; access by ISBN/OLID is rate-limited (100 req / 5 min / IP). Default returns a blank image unless `?default=false`.
- **Implications**: Resolve via Search (to get `cover_i` and the title/author needed for the match rule), then build the **by-ID** cover URL — keyless, https, and not rate-limited. Bound the Search call with a timeout; send a descriptive User-Agent.

### iTunes Search API (music, podcast, TV/movie art)
- **Context**: One keyless source for the three non-book types.
- **Sources Consulted**: [iTunes Search API](https://performance-partners.apple.com/search-api).
- **Findings**:
  - `GET https://itunes.apple.com/search?term=<t>&entity=<e>&limit=<n>&country=US`; `entity` ∈ `album` (music), `podcast`, `movie` / `tvSeason` (TV & movies). No key required; rate limit ≈ **20 calls/min**.
  - Results carry `artworkUrl100` / `artworkUrl60` plus `collectionName` / `trackName` / `artistName` for matching. `artworkUrl100` ends in `100x100bb.jpg`; replacing with `600x600bb.jpg` yields a larger image (widely used, undocumented but stable).
- **Implications**: Map media type → entity; for `tv_movie`, try `movie` then `tvSeason`. Throttle the **backfill** to stay under ~20/min; the on-demand path is one call per item and self-throttles. Upscale `artworkUrl100`; validate https.

### Existing platform patterns to reuse
- **Context**: Avoid re-inventing fetch/validation/persistence.
- **Sources Consulted**: [src/lib/trending/nyt.ts](../../../src/lib/trending/nyt.ts), [src/lib/trending/spotify.ts](../../../src/lib/trending/spotify.ts), [src/lib/trending/add.ts](../../../src/lib/trending/add.ts), [src/db/queries.ts](../../../src/db/queries.ts), [src/components/ui/BookCover.tsx](../../../src/components/ui/BookCover.tsx), [src/db/seed.ts](../../../src/db/seed.ts).
- **Findings**: `httpsOrNull` https-only validation; `fetch(url, { signal: AbortSignal.timeout(ms) })` with try/catch → graceful null; `findOrCreateMedia(db, Omit<MediaItem,"id">)`; `BookCover` is a themed `<div>` (no `<img>`); seed/script entrypoints import `src/db/load-env.ts` and `getDb()`.
- **Implications**: New cover clients mirror the trending clients (timed fetch, https validation, never throw to caller). `findOrCreateMedia` gains an optional `artworkUrl`. `BookCover` gains an optional image URL with placeholder fallback. The backfill script mirrors `seed.ts`.

## Architecture Pattern Evaluation

| Option (backfill trigger) | Description | Strengths | Risks / Limitations | Decision |
|---------------------------|-------------|-----------|---------------------|----------|
| Resolve during detail-page render | Server Component fetches + writes while rendering | Simplest call site | Violates server-read/client-mutate; side-effects in RSC; adds external latency to SSR; can hang render | Rejected |
| Resolve at add-time (inline) | Look up cover when an item is added | Covers new items | Adds latency to every add; violates Req 7.3 (don't block add); doesn't help existing/seeded rows | Rejected as primary |
| **Client-triggered Route Handler + offline backfill script (chosen)** | Detail page reads stored art; an unresolved+supported item triggers a one-shot `POST` that resolves+persists; a throttled script warms seeded/existing rows | Fits server-read/client-mutate; no SSR latency; self-healing for custom/new items; bulk-warms seed data; one attempt per item | Brief placeholder→image swap on first view of an unresolved item; one extra route + small client component | **Selected** |

## Design Decisions

### Decision: Persist artwork + a "checked" marker on `media_items`
- **Context**: Req 2 (store art), Req 4.5 (don't refetch once an outcome is known, including "no cover found").
- **Selected Approach**: Add nullable `artwork_url` (https) and nullable `artwork_checked_at` (timestamp). `artwork_checked_at IS NULL` ⇒ never attempted (eligible for resolution); set it whenever resolution runs, storing the URL only on a confident match.
- **Rationale**: One pair encodes all three states (unknown / resolved / attempted-none) and prevents repeat lookups for items that genuinely have no cover.
- **Trade-offs**: Two columns vs. one enum; the pair is simpler to reason about and records freshness.

### Decision: Cover resolution as keyless, per-type clients behind one dispatcher
- **Context**: Req 4.1 (per-type source), Req 4.3/4.4 (server-side, keyless), Req 5 (match safety), Req 7.1 (timeout).
- **Selected Approach**: `resolveCover(item, deps)` dispatches by `media type`: ebook → Open Library client; music/podcast/tv_movie → iTunes client (`album`/`podcast`/`movie`→`tvSeason`). Each client does a timed `fetch`, applies the shared **match rule**, validates https, and returns `string | null`; never throws. Unsupported types short-circuit to `null` (Req 4.7).
- **Rationale**: Mirrors the trending provider/registry shape the team already maintains; injectable `fetchImpl` keeps it unit-testable without network.
- **Trade-offs**: Two clients to maintain; isolated and small.

### Decision: Normalized match rule (no wrong covers)
- **Context**: Req 5.1/5.2.
- **Selected Approach**: Normalize title/creator (lowercase, strip diacritics + punctuation, collapse whitespace). Accept the first candidate whose normalized title **equals or strongly contains** the item's title **and** whose creator corroborates (item creator appears in the candidate's artist/author, or vice versa). If no candidate passes, store no artwork. Podcasts (weak creator data) require a strong title match.
- **Rationale**: Relevance-ranked APIs put the right item first; the rule rejects near-misses and unrelated hits.
- **Trade-offs**: Occasionally rejects a real match (false negative → placeholder), which is the safe failure direction.

### Decision: Reuse `BookCover` as the single cover renderer
- **Context**: Req 1, Req 6.1 (consistent fallback everywhere).
- **Selected Approach**: `BookCover` gains an optional `imageUrl`; when present it renders an `<img>` (https, `referrerPolicy="no-referrer"`, lazy, accessible) that falls back to the themed initials on load error; otherwise unchanged.
- **Rationale**: One renderer keeps the fallback identical across surfaces and confines the image concern to one component.

## Risks & Mitigations
- **External rate limits / latency (iTunes ~20/min)** — On-demand path is one call per item (self-limited); the backfill script throttles and is idempotent (`artwork_checked_at`); all calls are timeout-bounded and degrade to the placeholder.
- **Wrong cover from title lookup** — Normalized match rule with creator corroboration; reject on doubt (Req 5).
- **SSR side-effects** — Resolution/persist only in a Route Handler and the script, never during render (steering compliance).
- **Mixed-content / external host variability** — https-only validation (`httpsOrNull`); `<img>` `onError` falls back to the placeholder so a dead URL never shows a broken image (Req 1.5).
- **Privacy** — `referrerPolicy="no-referrer"` on cover images, matching TrendingCard.

## References
- [Open Library Search API](https://openlibrary.org/dev/docs/api/search) · [Covers API](https://openlibrary.org/dev/docs/api/covers)
- [iTunes Search API](https://performance-partners.apple.com/search-api)
- [src/lib/trending/spotify.ts](../../../src/lib/trending/spotify.ts) — timed-fetch + https-validation pattern to mirror.
