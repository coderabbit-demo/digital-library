# Research & Design Decisions — media-detail

## Summary
- **Feature**: `media-detail`
- **Discovery Scope**: Extension / Simple Addition — a new authenticated **read surface + dynamic route + cross-surface linking** that composes existing endpoints. Integration-focused (light) discovery; no external dependencies.
- **Key Findings**:
  - Everything needed to **read** a single item already exists in the DAL: `findMediaById`, `findEntry(userId, mediaItemId)`, `listTagsByEntryIds`. Everything needed to **mutate** exists as authenticated Route Handlers: `/api/library` (shelf upsert + activity), `/api/library/review` (rating+review), `/api/library/tags`. So the detail page needs **no new write contract for catalog/library items** (Req 10.1).
  - **Review requires an existing entry**: `saveReview` updates a `library_entries` row by `(entryId, userId)` — it does not create one. So on the detail page, reviewing is enabled once the item is on a shelf; for a not-yet-added item the client first creates the entry (a shelf upsert), then reviews.
  - **Trending items have no internal id** (external NYT/Spotify), so "open detail" needs a resolution step. The one **genuine gap** is resolving an external item to a catalog `media_items.id` *without* forcing a library entry — `/api/trending/add` always creates an entry (a side effect the user didn't ask for when merely viewing). This justifies one thin new endpoint.

## Research Log

### Existing reuse points
- **Sources**: `src/db/queries.ts`, `src/app/api/library/**`, `src/app/api/trending/**`, `src/components/library/LibraryCard.tsx`, `src/lib/api/client.ts` (`sendJson` POST|PUT), `src/lib/media-metadata.ts` (`formatMetaLine`), `src/components/ui/StarRating.tsx`, design-system primitives.
- **Findings**: `LibraryCard` already implements the shelf-move + review/tags edit pattern against these endpoints; the detail page reuses the same endpoints with a richer, full-page layout. `findMediaByTypeTitleCreator` (added in DL-57) is the type-scoped de-dup used by the trending add and is reusable for resolve.
- **Implications**: The detail page is mostly presentation + routing. Extract no DAL; add one thin resolve endpoint for trending.

### Trending → detail resolution (Req 7)
- **Options**: (a) reuse `/api/trending/add` then route to `/item/[mediaItemId]` — but it adds a wishlist entry as a side effect; (b) a thin **`POST /api/trending/resolve`** that find-or-creates the `media_items` row only (no entry) and returns its id, then navigate to `/item/[id]`; (c) a preview detail rendered from external data with no persistence.
- **Decision**: (b). One detail page keyed by a real id (simplest, consistent), de-duped via `findMediaByTypeTitleCreator`, no unwanted library entry. From the detail page the user can then add to a shelf (Req 7.3). Rejected (a) for the side effect and (c) for bifurcating the page into persisted/preview modes.

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks | Notes |
|--------|-------------|-----------|-------|-------|
| New read surface + route, reuse endpoints (chosen) | `/item/[id]` server page loads via DAL; client actions call existing endpoints | Additive, no new contracts for owned items, consistent | Minor: review-needs-entry ordering | Matches Req 10 |
| Extract shared actions from LibraryCard into a hook | Share shelf/review/tags logic | DRY | Refactor blast radius into shipped card | Optional cleanup; not required |
| Persist trending preview vs resolve to id | — | — | Two detail modes; complexity | Rejected |

## Design Decisions

### Decision: `/item/[id]` server route, client action panel, no new write API for owned items
- **Selected**: A dynamic authenticated route renders a server-loaded detail; a client `ItemActions` panel calls the existing `/api/library`, `/api/library/review`, `/api/library/tags` endpoints and `router.refresh()`s.
- **Rationale**: Req 10.1 (reuse, no new contracts); mirrors the platform's server-read / client-mutate split.
- **Trade-offs**: Some logic overlaps `LibraryCard`; acceptable (small) or optionally extracted later.

### Decision: Reviewing requires an entry; create-then-review for un-added items
- **Selected**: Review/tags controls are enabled when the item is in the user's library; for an un-added item the client performs a shelf upsert first (creating the entry), then the review/tags write.
- **Rationale**: `saveReview`/tags operate on an existing entry; this avoids changing those contracts.

### Decision: Thin `POST /api/trending/resolve` for external items
- **Selected**: find-or-create the `media_items` row (no entry), return `{ id }`; the Trending "View details" action calls it, then routes to `/item/[id]`.
- **Rationale**: The only genuine gap (Req 7); de-duped; avoids an unwanted library entry on view.
- **Follow-up**: Same TOCTOU caveat as add (tracked by DL-64); best-effort de-dup.

## Risks & Mitigations
- **Review-before-add confusion** → enable review only with an entry; clear "add to a shelf first" affordance.
- **Resolve creates catalog rows on view** → de-dupe via type-scoped match; acceptable shared-catalog growth (same as add).
- **Unknown/invalid id** → `notFound()` → accessible not-found state (Req 8.2).
- **Externally-sourced text/artwork** → render as text, https-only artwork (Req 10.4).
- **No new tests skipped** → unit/integration for resolve + the create-then-review ordering.

## References
- Platform steering `.sdd/steering/{tech,structure,workflow}.md`; existing `src/db/queries.ts`, `src/app/api/library/**`, `src/components/library/LibraryCard.tsx`, `src/lib/trending/add.ts`.
