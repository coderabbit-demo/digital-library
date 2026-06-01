# Implementation Plan — media-detail

> Sequenced foundation → page → actions → linking → quality.
> `(P)` marks tasks runnable in parallel (no data dependency, no shared-file contention). Each sub-task targets ~1–3 hours.
> Additive/non-breaking: reuse the existing library/review/tags endpoints; keep build + typecheck + tests green; no `any`; no `dangerouslySetInnerHTML`; per-user writes derive the user from the session.

- [x] 1. (P) Trending item resolution (external → catalog id)
  - Add a pure-ish data helper that finds or creates the catalog media row for an external item by its type/title/creator (reusing the existing type-scoped match) without creating a library entry, reporting whether it was created.
  - Add an authenticated endpoint that validates the payload, runs the helper, and returns the resolved id; derive no library side effects.
  - Integration-test on the in-process database: a new external item is created once and re-resolves to the same row (de-dup, case-insensitive), and no library entry is produced.
  - _Requirements: 7.1, 7.2_

- [x] 2. Item detail route, data loading, and information display
- [x] 2.1 Authenticated detail route and data loader
  - Add an authenticated dynamic route addressing a single item by id; load the item and, for the signed-in user, their entry and tags; redirect unauthenticated users to the auth surface and render a not-found state for an unknown id without crashing; provide a back affordance.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.1, 8.2_
- [x] 2.2 Item information display
  - Present the title, creator, media-type indicator, a type-appropriate meta line, description, and cover/artwork (with a themed fallback), plus the user's current status, rating, review, and tags when the item is in their library; derive sensible labels for absent fields; render on the design system in light and dark.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Item actions (shelf, review, tags)
  - Build the client actions panel that sets the shelf (wishlist / currently reading / read) via the existing library endpoint and reflects the current status, recording an activity; add/edit a 1–5 rating and review (validated) and edit tags via the existing review/tags endpoints, enabling review/tags once the item is in the library and creating the entry first for a not-yet-added item; surface action errors accessibly without losing input and without breaking other routes; convey status/rating by text and icon, not color alone; keep all controls keyboard-operable.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 8.3, 8.4_

- [x] 4. Cross-surface linking
  - Link each item on the Library, Wishlist, Reviews, and catalog surfaces (and the media card) to its detail page via an accessible, keyboard-operable control, preserving the existing inline card actions; add a "View details" action to the trending card that resolves the external item to a catalog id and navigates to its detail page, where it can then be added to a shelf.
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.3_

- [x] 5. Accessibility, responsiveness, and quality gate
  - Verify the detail page is responsive (mobile→desktop, no overflow/clipped controls), accessible (semantic roles/names/labels, keyboard + visible focus, reduced-motion, not color-alone) in both themes; confirm the feature reuses the existing endpoints with no new write contracts for owned items, preserves existing routes/contracts/auth/boundaries, introduces no `any` and no unsafe HTML, and that build/typecheck/tests pass.
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4_
- [x]* 5.1 UI rendering tests for the detail surface
  - Deferrable UI tests asserting the detail renders metadata/description/status/tags, the review controls prompt to add-to-shelf when there is no entry, the not-found state renders for a missing item, and the create-then-review path saves correctly.
  - _Requirements: 2.1, 4.2, 8.2, 8.3_
