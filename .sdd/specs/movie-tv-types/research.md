# Research & Design Decisions

## Summary
- **Feature**: `movie-tv-types`
- **Discovery Scope**: Extension (cross-cutting data-model change + enrichment additions).
- **Key Findings**:
  - The providers already know movie vs TV: Trending runs `tmdbMoviesProvider`/`tmdbTvProvider`, Search runs `tmdbMoviesSearchProvider`/`tmdbTvSearchProvider`, and enrichment records `tmdbType: "movie" | "tv"`. They merely tag the result as the combined `tv_movie`. So the split is a re-labelling at the type layer plus a backfill — not new provider logic.
  - Media type is an **open string set** on the row and drives the **data-driven** media-type filter (`countMediaTypes(items.map(i => i.type))`). Adding `movie`/`tv` needs no per-type branching in the shared filter/UI — only labels and icons.
  - The discriminated unions (`MediaItemMetadata`, `MediaEnrichment`) key on a `kind`, and the parsers derive `kind` from the **type argument**, ignoring any stored `kind`. So renaming the film/TV member and re-mapping types is safe and requires no jsonb data migration of the `kind` field — only the `type` column changes.
  - `TrendingMediaType` is a **closed** union backing an exhaustive icon `Record`; it must gain `movie`/`tv` (and drop `tv_movie`) so transient feed/search items type precisely.
  - TMDB detail already in hand: `runtime`/`episode_run_time`, `genres`, `tagline`, `vote_average/count`, `credits`. TV detail also returns `number_of_seasons`, `number_of_episodes`, `seasons[]`; both return `overview` (synopsis). No new endpoint or key needed.

## Research Log

### tv_movie blast radius
- **Context**: Determine everything that references the combined type before changing it.
- **Findings**: ~18 non-test source files reference `tv_movie`: type defs (`domain.ts`, `trending.ts`), parsers (`media-metadata.ts`, `media-enrichment.ts`), enrichment (`tmdb.ts`, `dispatch.ts`, `display.ts`, `reviews.ts`), search (`tmdb.ts`, `registry.ts`), trending (`tmdb.ts`), covers (`resolve.ts` — `ITUNES_ENTITIES.tv_movie = ["movie","tvSeason"]`), UI (`TrendingCard` icon map, `MediaCard`, `ReviewsSection`), media-type labels (`media-type.ts`), the add dialog (`AddItemDialog`), and seed data (Severance = TV w/ `seasons`, Arrival = movie w/ `runtimeMinutes`).
- **Implications**: A central type→kind mapping minimizes edits; most files only need the type literal and label/icon updates. Cover entities split cleanly: `movie: ["movie"]`, `tv: ["tvSeason"]`.

### Discriminated-union strategy
- **Context**: When `item.type` splits into `movie`/`tv`, how should the metadata/enrichment unions model it?
- **Findings/Decision**: Keep one **shared shape** for film/TV, renaming the union member discriminator from `tv_movie` to **`video`**. A central `mediaTypeToMetadataKind(type)` maps `movie → video`, `tv → video`, legacy `tv_movie → video`, and the other types to themselves. Parsers/format/display/reviews branch on `kind === "video"` (mechanical rename); TV-only fields (seasons/episodes) are simply present only for TV items because the provider sets them only when `tmdbType === "tv"`, so movies naturally show none (Req 5.4).
- **Implications**: The open media type carries the user-facing distinction (filters/labels/icons); the closed metadata kind stays a single shape, avoiding duplicate `movie`/`tv` union members with identical fields.

### Backfill heuristic (no resolved type)
- **Context**: Legacy `tv_movie` rows without prior enrichment have no `tmdbType`.
- **Decision**: Migration classifies by priority: (1) `enrichment->>'tmdbType'` when `movie`/`tv`; (2) else if `metadata->>'seasons'` is present → `tv`; (3) else default `movie`. Documented, deterministic; re-enrichment does not retroactively change a persisted type.
- **Implications**: Seed rows resolve correctly (Severance→`tv` via seasons, Arrival→`movie`). A custom (hand-authored) SQL migration is required because there is no schema/column change for `drizzle-kit generate` to diff.

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Shared `video` kind, open `movie`/`tv` types (chosen) | Split only the media type; keep one metadata/enrichment shape | Minimal, mechanical churn; data-driven filters "just work"; no jsonb kind migration | Discriminator name differs from type names | Lowest risk |
| Distinct `movie` & `tv` union members | Two kinds with identical shape | Type name == kind name | Duplicated shape; more branching in providers/format/display | Rejected (churn, duplication) |
| Derived sub-filter on `tv_movie` | Keep combined type, add secondary facet | No migration | Not "first-class"; parallel filter concept; rejected by product | Rejected by stakeholder |

## Design Decisions

### Decision: Synopsis stored in enrichment, displayed as a fallback
- **Context**: Externally-added items have empty `description`; TMDB `overview` is available.
- **Selected Approach**: Capture `synopsis` into the cached `enrichment` (not the `description` column); the detail page shows `item.description` when non-empty, else the synopsis. Avoids mutating the catalog description and prevents duplication (Req 6.3).
- **Trade-offs**: Synopsis lives in enrichment cache (refreshes with re-enrichment) rather than the row; acceptable and consistent with the resolve-and-cache model.

### Decision: Type-directed TMDB enrichment endpoint
- **Context**: `enrichFromTmdb` currently tries movie then TV.
- **Selected Approach**: Use the item's precise type to query only the matching endpoint (`movie` → movie, `tv` → tv); legacy `tv_movie` keeps the try-both behavior.
- **Rationale**: More accurate (no cross-type mis-hit) and fewer calls.

## Risks & Mitigations
- **Backfill misclassification** — Deterministic heuristic with `tmdbType` first; `seasons` hint; documented `movie` default. Mitigated by logging counts; re-enrichment fixes nothing destructively.
- **Ownership-key skew during rollout** — `trendingItemKey` uses `mediaType`; once providers emit `movie`/`tv` and rows are migrated, both sides align. The window is the single deploy; migration runs with the code.
- **Exhaustive `TrendingMediaType` Record** — Updating the union forces the icon map to cover `movie`/`tv` at compile time (a feature, not a risk).
- **Legacy/unknown types** — Filters and labels keep the humanized fallback; a transitional `tv_movie` label is retained so any unmigrated row still reads sensibly.

## References
- [TMDB movie details](https://developer.themoviedb.org/reference/movie-details) — `overview`, `runtime`, `tagline`, `genres`
- [TMDB TV details](https://developer.themoviedb.org/reference/tv-series-details) — `number_of_seasons`, `number_of_episodes`, `seasons[]`, `overview`
- Existing in-repo patterns: `lib/enrichment/*` (resolve-and-cache), `lib/media-type.ts` (data-driven filter), `lib/covers/resolve.ts` (per-type entities).
