# Research & Design Decisions

## Summary
- **Feature**: `media-type-filters`
- **Discovery Scope**: Extension (integration-focused — reuse existing filter pattern across more surfaces)
- **Key Findings**:
  - The app already has a complete, proven **link-based, server-rendered, URL-as-state** media-type filter on the Home feed and Library. The new surfaces should reuse it rather than invent anything.
  - All target surfaces already load their data in memory in a server component and render a list; **filtering is an in-memory narrowing step**, with no DB query or endpoint changes and (for trending) no extra external calls.
  - Two shared helpers need small, backward-compatible generalizations: counts must be derivable from a raw list of type strings (trending items expose `mediaType`, not `type`), and the href builder must support an arbitrary base path plus a sibling query param to preserve.
  - The Home route `/` already consumes `?type=` for the **feed**, so the Home Trending section must use a **distinct query param** and both controls must preserve each other's param to stay independent (Req 3.3).

## Research Log

### Existing filter pattern (Home feed + Library)
- **Context**: Determine the canonical pattern to extend so the new surfaces are consistent (Req 7.1) and non-regressive (Req 7.2).
- **Sources Consulted**: [src/lib/media-type.ts](../../../src/lib/media-type.ts), [src/components/library/MediaTypeFilter.tsx](../../../src/components/library/MediaTypeFilter.tsx), [src/components/home/FeedFilter.tsx](../../../src/components/home/FeedFilter.tsx), [src/app/(app)/library/page.tsx](../../../src/app/(app)/library/page.tsx), [src/app/(app)/page.tsx](../../../src/app/(app)/page.tsx).
- **Findings**:
  - `MediaTypeFilter` is a server-friendly `<nav>` of `<Link>` pills: props `options: MediaTypeCount[]`, `activeValue`, `hrefFor(value)`, `ariaLabel`; active pill marked `aria-current="true"`; renders a count badge per option.
  - Helpers: `mediaTypeLabel` (with humanized fallback), `distinctMediaTypes`, `mediaTypeOptions` (no counts), `mediaTypeCounts(items: MediaItem[])` (with counts), `resolveActiveType(raw, options)` (defaults to `"all"`), `filterHref(value)` (hard-coded to `/`).
  - Library resolves the active type and builds `hrefFor` **inline** per route; Home feed uses `mediaTypeOptions` + `resolveActiveType` + `FeedFilter`.
- **Implications**: Reuse `MediaTypeFilter` everywhere (it already carries counts and an `hrefFor`); relocate it to a neutral path so importing it into trending/home doesn't cross a "library" boundary. Generalize `filterHref` into a base-path-aware factory and broaden `resolveActiveType`/counts so one implementation serves every surface.

### Trending data shape and fetch path
- **Context**: How to filter trending without re-querying sources (Req 2.4) and where the type lives.
- **Sources Consulted**: [src/lib/types/trending.ts](../../../src/lib/types/trending.ts), [src/lib/trending/feed.ts](../../../src/lib/trending/feed.ts), [src/app/(app)/trending/page.tsx](../../../src/app/(app)/trending/page.tsx), [src/components/trending/TrendingSection.tsx](../../../src/components/trending/TrendingSection.tsx).
- **Findings**:
  - `TrendingItem.mediaType: "ebook" | "music"` (closed union today, label-compatible with `mediaTypeLabel`); `TrendingSourceResult` carries a `status` and an `items[]`.
  - `fetchTrendingFeed({limit})` is called **once** per page render; the page then groups `feed.sources`. The section flattens `ok` sources' items and slices to a preview.
- **Implications**: Filtering is a pure transform over the already-fetched `TrendingResponse`. A specific selection keeps items whose `mediaType` matches and drops source groups left empty (Req 2.2); `"all"` returns the feed unchanged (Req 2.3). No change to `fetchTrendingFeed`.

### Wishlist / Reviews surfaces
- **Context**: Confirm these are in-memory lists amenable to the same pattern (Req 4, 5).
- **Sources Consulted**: [src/app/(app)/wishlist/page.tsx](../../../src/app/(app)/wishlist/page.tsx), [src/app/(app)/reviews/page.tsx](../../../src/app/(app)/reviews/page.tsx), [src/lib/library-view.ts](../../../src/lib/library-view.ts).
- **Findings**: Both build `composeShelfItems(entries, media)` then filter (wishlist by status, reviews by `rating !== null`) and render `LibraryCard`s; neither reads `searchParams`.
- **Implications**: Add `searchParams.type`, derive counts from each surface's own item set, filter, and render the shared `MediaTypeFilter`. Identical to Library's already-working approach.

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Reuse link-based URL-state filter (chosen) | Extend the existing `MediaTypeFilter` + `media-type.ts` helpers to four more surfaces; filter in memory in each server component | Consistent UX, no client JS, deep-linkable, no new endpoints/queries, minimal code | Requires small backward-compatible helper generalization; Home dual-param handling | Matches steering "server-read, additive, keep main working" |
| Client-component filter with local state | A `"use client"` filter holding selection in React state | No URL plumbing | Breaks deep-link/refresh/share (violates Req 6.1), diverges from existing pattern, needs hydration | Rejected |
| Server-side per-surface DB query filter | Push the type predicate into the DAL/SQL | Less in-memory work | New query variants for wishlist/reviews/feed; over-engineered for small lists already fully loaded; doesn't fit trending (external) | Rejected |

## Design Decisions

### Decision: Reuse and relocate `MediaTypeFilter` as the single filter component
- **Context**: Req 1 requires one consistent control on four surfaces; Req 7.1 requires consistency with existing filters.
- **Alternatives Considered**: 1) Import the existing `components/library/MediaTypeFilter` directly into trending/home. 2) Build per-surface bespoke controls.
- **Selected Approach**: Move the component to a neutral location (`src/components/media/MediaTypeFilter.tsx`), keep its props identical, and import it from every surface (Library, Wishlist, Reviews, Trending page, Home Trending section).
- **Rationale**: One implementation = guaranteed consistency and a single test target; avoids a UI component living under a feature folder that other features depend on (clean boundary).
- **Trade-offs**: One import-path change in the Library page; trivial and covered by typecheck/tests.
- **Follow-up**: Update the existing Library import; confirm any existing `MediaTypeFilter` test moves with it.

### Decision: Generalize the shared helpers (backward compatible)
- **Context**: Trending items expose `mediaType` (not `type`); href must work for any base path and preserve a sibling param (Home).
- **Selected Approach**: Add `countMediaTypes(types: readonly string[])` (and make `mediaTypeCounts(items)` delegate to it); broaden `resolveActiveType(raw, options)` to accept `readonly { value: string }[]`; add a `typeFilterHrefFactory({ basePath, param?, preserve? })` returning an `hrefFor(value)`.
- **Rationale**: One code path drives counts/active-resolution/hrefs across surfaces and item shapes; existing call sites keep working (or are refactored onto the factory for full DRY).
- **Trade-offs**: Slightly larger helper surface; mitigated by unit tests.
- **Follow-up**: Refactor Home feed + Library hrefs onto the factory so there is a single href implementation (Req 7.1) without changing their behavior (Req 7.2).

### Decision: Distinct query param for the Home Trending section
- **Context**: `/` already uses `?type=` for the community feed; the section must filter independently (Req 3.3) on the same route.
- **Alternatives Considered**: 1) Section chips are pure deep-links into `/trending?type=` (no in-place filtering). 2) Section filters in place using a separate param.
- **Selected Approach**: Section uses `?trending=<type>`; the Home page reads both `type` and `trending`, and each control's `hrefFor` **preserves the other's** current value via the href factory's `preserve` option. The section's "see all" link carries the current selection as `/trending?type=<sel>` (Req 3.4).
- **Rationale**: Satisfies in-place filtering (Req 3.1–3.2) and independence (Req 3.3) and deep-link continuity (Req 3.4) with one small factory feature.
- **Trade-offs**: The Home feed filter must now also preserve `trending`; handled by the same factory, no bespoke logic.
- **Follow-up**: Verify selecting one control does not reset the other (component/integration check).

### Decision: Extract trending filtering as a pure function
- **Context**: Keep server-component pages thin and the filtering logic unit-testable; avoid re-querying sources (Req 2.4).
- **Selected Approach**: Add `filterTrendingFeed(feed, type)` and `trendingMediaTypes(feed)` in `src/lib/trending/`. `"all"` returns the feed unchanged; a specific type keeps matching items and drops emptied source groups.
- **Rationale**: Pure, deterministic, easy to test; mirrors how `library-view` isolates list logic.
- **Trade-offs**: One small module; net simplification of the page.
- **Follow-up**: Decide notice visibility under a specific filter — see Risks.

## Risks & Mitigations
- **Source status notices under a specific filter** — When a type is selected, unconfigured/error sources have no matching items; showing their notices would contradict Req 2.2 ("only groups with ≥1 matching item"). Mitigation: notices render only in the `"all"` view; filtered views show solely matching groups, with a single empty-state when none match (Req 6.5).
- **Home dual-param coupling regression** — Refactoring the feed href to preserve `trending` could alter existing feed behavior. Mitigation: cover the factory and both Home controls with unit tests; the feed's behavior with no `trending` param is identical to today.
- **Closed `TrendingMediaType` union** — Adding podcast/TV trending later must not require filter changes. Mitigation: the filter derives options from the data (`mediaType` strings) and uses the humanized label fallback, so new types appear automatically (Req 1.2, 1.6).

## References
- [src/lib/media-type.ts](../../../src/lib/media-type.ts) — shared labels, options/counts, active-type resolution, href.
- [src/components/library/MediaTypeFilter.tsx](../../../src/components/library/MediaTypeFilter.tsx) — the component to relocate and reuse.
- [.sdd/specs/home-feed/requirements.md](../home-feed/requirements.md) — Req 5/6, the original media-type filter requirements this feature extends.
- [.sdd/specs/trending-now/requirements.md](../trending-now/requirements.md) — Req 3.2 ("plain pull"), clarified (not changed) by this feature.
