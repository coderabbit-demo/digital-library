# Requirements Document

## Project Description (Input)
Media-type filtering parity: add a user-facing "filter by media type" control (Books / Music / Podcasts / TV & Movies, data-driven so only types actually present are shown) to every media-list surface that currently lacks one — the Trending page (/trending), the Home "Trending" section, Wishlist, and Reviews — bringing them to parity with the Home feed and Library. Reuse the existing shared helpers in src/lib/media-type.ts (mediaTypeOptions, mediaTypeCounts, resolveActiveType, filterHref) and the established link-based URL state pattern (?type= query param, no client JS, aria-current for the active chip). Trending currently emits only ebook|music, so its filter must be data-driven and scale automatically as new types/sources are added. This is user-initiated filtering and does not conflict with trending-now Req 3.2 ("plain pull, no filtering by profile preferences"), which concerns automatic personalization — add a clarifying note there rather than reopening that spec.

## Introduction

This feature brings **media-type filtering parity** to LibraryLoop. The Home feed (`/`) and the Library page (`/library`) already let a reader narrow a list to a single media type (Books, Music, Podcasts, TV & Movies) using a link-based control whose options are derived from the data and whose selection persists in the URL. The other media-list surfaces — the **Trending page** (`/trending`), the Home page **Trending section**, the **Wishlist page** (`/wishlist`), and the **Reviews page** (`/reviews`) — currently show all media types with no way to filter.

This spec adds the same kind of media-type filter to those four surfaces so the experience is consistent everywhere a reader sees a list of media. The control is **data-driven**: each surface offers only the media types actually present in its own data, so newly added types and sources (e.g. podcasts, TV/movies) appear automatically without code changes. Filtering is **user-initiated and URL-addressable**, following the existing pattern (a query parameter on the surface's route, navigable links, an accessible active-state indicator), and it reuses the application's shared media-type labels and helpers.

The Catalog (`/catalog`) and Shelves (`/shelves`) routes redirect to the Library and are therefore out of scope (Library already has the filter). Filtering remains **user-initiated only**: it does not introduce automatic, profile-based filtering of trending content, so it does not contradict the `trending-now` requirement that trending results are a plain pull — a clarifying note is added to that spec rather than changing its behavior.

## Requirements

### Requirement 1: Consistent media-type filter control

**Objective:** As a signed-in reader, I want a consistent media-type filter on every list of media, so that I can focus on one kind of media anywhere in the app.

#### Acceptance Criteria
1. The application shall provide a media-type filter control on each of the following surfaces: the Trending page, the Home page Trending section, the Wishlist page, and the Reviews page.
2. Each media-type filter control shall include an "All" option and one option per media type, deriving its media-type options from the media types present in that surface's own data rather than from a hard-coded list, so that future media types appear automatically.
3. The default selection of each media-type filter control shall be "All".
4. When the user selects the "All" option on a surface, the application shall display items of every media type for that surface, subject to that surface's other existing constraints.
5. When the user selects a specific media-type option on a surface, the application shall display only items whose media type matches the selected option.
6. Where a media type has no human-readable label defined, the application shall display a sensible derived label for that media-type option rather than failing to render it.
7. When a media type is not present in a surface's current data, the application shall not render an option for that media type on that surface, so that no filter option yields an empty result by construction.

### Requirement 2: Trending page filtering

**Objective:** As a signed-in reader, I want to filter the Trending page by media type, so that I can browse only the kind of media I care about across all trending sources.

#### Acceptance Criteria
1. The Trending page shall provide the media-type filter control defined in Requirement 1, with options derived from the media types present in the current trending feed.
2. When the user selects a specific media-type option on the Trending page, the application shall display only trending items of that media type, and shall show only the source groups that contain at least one matching item.
3. While the "All" option is selected, the Trending page shall display every trending source group and item as it does today.
4. The Trending page's media-type filter shall narrow only the already-fetched trending results; it shall not change which external sources are queried.

### Requirement 3: Home Trending section filtering

**Objective:** As a signed-in reader, I want to filter the Home page's Trending section by media type, so that the preview reflects the kind of media I care about, consistent with the rest of Home.

#### Acceptance Criteria
1. The Home page Trending section shall provide the media-type filter control defined in Requirement 1, with options derived from the media types present in the section's trending items.
2. When the user selects a specific media-type option in the Home Trending section, the application shall display only that section's trending items of the selected media type, subject to the section's existing item limit.
3. The Home Trending section's media-type filter shall operate independently of the Home feed's media-type filter on the same page, such that selecting an option in one control does not change the selection or contents of the other.
4. When the user follows the Trending section's "see all" link while a specific media-type option is selected, the application shall open the Trending page with the same media-type selection applied.

### Requirement 4: Wishlist filtering

**Objective:** As a signed-in reader, I want to filter my Wishlist by media type, so that I can review the items I plan to consume one kind at a time.

#### Acceptance Criteria
1. The Wishlist page shall provide the media-type filter control defined in Requirement 1, with options derived from the media types present in the user's wishlist items.
2. When the user selects a specific media-type option on the Wishlist page, the application shall display only wishlist items whose media type matches the selection.
3. While the "All" option is selected, the Wishlist page shall display all of the user's wishlist items as it does today.

### Requirement 5: Reviews filtering

**Objective:** As a signed-in reader, I want to filter my Reviews by media type, so that I can revisit my reviews for one kind of media at a time.

#### Acceptance Criteria
1. The Reviews page shall provide the media-type filter control defined in Requirement 1, with options derived from the media types present in the user's reviewed items.
2. When the user selects a specific media-type option on the Reviews page, the application shall display only reviewed items whose media type matches the selection.
3. While the "All" option is selected, the Reviews page shall display all of the user's reviewed items as it does today.

### Requirement 6: Filter persistence, deep-linking, and accessibility

**Objective:** As a signed-in reader, I want the filter to behave consistently, be shareable, and be accessible on every surface, so that I can rely on it the same way everywhere.

#### Acceptance Criteria
1. When the user selects a media-type option on a surface, the application shall encode the selection in that surface's URL so that the selection survives a page refresh and can be shared or bookmarked.
2. When a surface is opened with a URL that specifies a media-type selection, the application shall apply that selection on load; if the specified value is unknown or not present in the data, the application shall fall back to "All".
3. While a media-type option is selected, the application shall visually indicate the active option and expose its active state to assistive technologies.
4. The media-type filter controls shall be operable without client-side JavaScript, consistent with the existing Home feed and Library filter controls.
5. If a selected media-type option results in no items being shown on a surface, the application shall display that surface's empty-state message rather than a blank list.

### Requirement 7: Reuse, consistency, and non-regression

**Objective:** As a developer extending LibraryLoop, I want the new filters to be consistent with existing ones and to avoid regressing current behavior or personalization rules.

#### Acceptance Criteria
1. The media-type labels and active-selection behavior on the new surfaces shall be consistent with the existing Home feed and Library media-type filters.
2. The existing media-type filtering on the Home feed and the Library page shall continue to function unchanged after this feature is delivered.
3. The trending media-type filter shall be user-initiated only; the application shall not introduce any automatic filtering of trending content based on the user's profile preferences, preserving the `trending-now` "plain pull" behavior.
4. The project documentation shall record that user-initiated media-type filtering is distinct from, and does not contradict, the `trending-now` requirement that trending results are a plain pull without profile-based filtering.
