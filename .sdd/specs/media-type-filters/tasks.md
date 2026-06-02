# Implementation Plan

- [ ] 1. Shared media-type filter foundation
- [x] 1.1 Generalize the shared media-type helpers
  - Add the ability to build per-type option counts from a plain list of media-type strings, so both library items and trending items (which expose their type under a different field) are supported, and have the existing item-based count helper reuse it.
  - Broaden active-type resolution so it accepts either the plain option list or the counted option list, always falling back to "All" for an unknown or missing value.
  - Add a configurable link builder that, given a surface's base path, an optional query-key, and optional sibling selections to preserve, returns a function producing the filter link for any option — omitting the key for "All" and dropping preserved selections that are "All" or absent, with URL-encoded values.
  - _Requirements: 1.2, 1.6, 1.7, 6.1, 6.2, 7.1_

- [x] 1.2 Relocate the shared filter control and adopt the helpers on existing surfaces
  - Move the existing media-type filter control to a neutral, feature-agnostic location so any surface can use it without crossing a feature boundary; keep its inputs unchanged.
  - Update the Library page to import the relocated control and to obtain its links from the new configurable link builder, with no change to its current URLs or behavior.
  - _Requirements: 1.1, 6.3, 6.4, 7.1, 7.2_

- [x] 1.3 Cover the shared foundation with tests
  - Unit-test the generalized helpers: counts/labels/sorting from raw type strings including the humanized fallback for an unknown type and the empty-input case; active-type resolution passing through known values and defaulting unknown/missing to "All" for both option shapes; the link builder for "All" versus a specific value, custom query-key, and sibling preservation (kept when set, dropped when "All"/absent).
  - Confirm the relocated filter control renders one option per input with its count, marks the active option for assistive technology, and renders each option as a navigable link to the expected target.
  - _Requirements: 1.1, 1.2, 1.6, 1.7, 6.1, 6.2, 6.3, 6.4_

- [x] 2. (P) Trending media-type filtering logic
  - Add pure functions over an already-fetched trending feed: one returning the distinct media types present across healthy sources (for option building), and one that narrows the feed by a selected type — returning the feed unchanged for "All", and otherwise keeping only items whose type matches while dropping source groups left with no matching items, preserving item order and never triggering any source fetch.
  - Unit-test "All" (unchanged), a specific type (matching items kept, empty groups removed), mixed-type sources, and a no-match selection (no groups).
  - _Requirements: 2.2, 2.3, 2.4, 3.2_

- [x] 3. (P) Trending page filter
  - Read the selected media type from the page URL, build the filter options from the media types present in the current feed, resolve the active selection (defaulting to "All"), and render the shared filter control with links targeting the trending route.
  - Display source groups from the narrowed feed: "All" shows every group as today; a specific type shows only groups containing a matching item; show source status notices only in the "All" view, and show a single empty-state message when a selected type matches nothing.
  - Keep the feed fetched once with no type argument so filtering never changes which external sources are queried.
  - _Requirements: 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 6.1, 6.2, 6.3, 6.4, 6.5, 7.3_

- [ ] 4. Home page dual filter and Trending section
- [x] 4.1 Make the Home page carry two independent filters
  - Read both the community-feed selection and a separate Home Trending-section selection from the page URL using distinct query keys, and resolve each independently.
  - Build each control's links with the configurable link builder so selecting one control preserves the other's current selection, leaving the existing community-feed filter behavior otherwise unchanged.
  - _Requirements: 3.3, 6.1, 6.2, 7.1, 7.2_

- [ ] 4.2 Make the Home Trending section filterable
  - Accept the section's active selection and link builder, derive the section's options from the media types present in its own trending items, apply the narrowing before limiting to the preview size, and render the shared filter control above the preview.
  - Carry the active selection through the section's "see all" link so the Trending page opens with the same media type applied; show the section's empty state when the selection matches nothing.
  - Verify selecting a section option does not alter the community-feed selection and vice versa.
  - _Requirements: 1.3, 1.4, 1.5, 3.1, 3.2, 3.4, 6.5_

- [ ] 5. Wishlist and Reviews filters
- [ ] 5.1 (P) Add the media-type filter to the Wishlist
  - Read the selected type from the page URL, build options and counts from the user's wishlist items, resolve the active selection (default "All"), render the shared control with wishlist-route links, show only matching items for a specific type and all items for "All", and show an empty state when nothing matches.
  - _Requirements: 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 5.2 (P) Add the media-type filter to the Reviews page
  - Read the selected type from the page URL, build options and counts from the user's reviewed items, resolve the active selection (default "All"), render the shared control with reviews-route links, show only matching reviewed items for a specific type and all for "All", and show an empty state when nothing matches.
  - _Requirements: 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 6. Consistency note and full verification
- [ ] 6.1 Record the trending filtering clarification
  - Add a clarifying note to the trending-now specification stating that this user-initiated media-type filtering is distinct from, and does not contradict, the requirement that trending results are a plain pull without profile-based filtering.
  - _Requirements: 7.3, 7.4_

- [ ] 6.2 Verify consistency and non-regression
  - Run the type-checker, the test suite, and the production build, and confirm the existing Home community-feed and Library media-type filters still function unchanged (including the feed link now preserving the Trending-section selection).
  - _Requirements: 7.1, 7.2_
