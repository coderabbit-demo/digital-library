# Requirements Document

## Project Description (Input)
Display real cover art (book covers and album art) on the media item detail page, with a graceful fallback to the existing themed placeholder when no art is available. Today no artwork is shown because media items store only a `cover_theme` (a CSS color key) and no artwork URL: the detail page's BookCover component renders only initials on a colored box, trending items carry a real `artworkUrl` (NYT covers, Spotify art) that is dropped at every layer when an item is added to the library, and seeded/custom items never had artwork URLs.

Scope (chosen): persist artwork AND backfill it from cover APIs so seeded and custom items also show real covers.

## Introduction

This feature makes LibraryLoop show **real cover art** — book jackets and album art — wherever an item's cover is rendered, beginning with the media item **detail page**, while preserving the existing **themed placeholder** (initials on a colored cover) as the fallback for anything without art.

Two gaps are closed. First, items gain an optional, persisted **cover artwork URL** alongside their existing theme; trending items already carry provider artwork (NYT book covers, Spotify album art) that is currently discarded on add, so that art is captured and stored. Second, for items with no artwork — seeded catalog entries, custom additions, or trending items whose provider gave none — the application **resolves a cover from a keyless external source** appropriate to the media type (a books cover source for ebooks, and a media-catalog source for album, podcast, and TV/movie art), persists the result, and falls back to the placeholder when nothing suitable is found.

Because external lookups by title and creator can return the wrong item, a **match-safety rule** ensures a resolved cover is only stored when it confidently corresponds to the item; otherwise the item keeps the placeholder rather than show a mismatched image. All external access is **server-side and keyless**, bounded by timeouts, cached onto the row to avoid refetching, and degrades gracefully so cover loading never slows or breaks a page. The work follows the platform's conventions: server-read/client-mutate, https-only external media, domain/API contracts in `src/lib/types`, and no regression to surfaces that currently use the themed placeholder.

The exact backfill trigger (lazy resolution during render with persist-to-row, a one-time backfill of seeded data, or both) and the precise match rule are intentionally left to the design phase; this document specifies the required behavior, not the mechanism.

## Requirements

### Requirement 1: Cover art on the detail page

**Objective:** As a reader, I want to see an item's real book or album cover on its detail page, so that my library is recognizable at a glance.

#### Acceptance Criteria
1. When a media item that has a stored cover artwork URL is shown on the detail page, the application shall display that artwork as the item's cover image.
2. While a media item has no cover artwork available, the detail page shall display the existing themed placeholder (title initials on a colored cover) in its place.
3. The application shall provide an accessible text alternative for the cover image consistent with the platform's accessibility conventions, so the cover does not become unlabeled content for assistive technologies.
4. The application shall load cover images only over https and shall request them without sending a referrer.
5. If a cover image fails to load in the browser, the detail page shall remain usable and present a non-broken state (the themed placeholder or an equivalent).

### Requirement 2: Persisted cover artwork on media items

**Objective:** As the system, I want media items to optionally carry a stored cover artwork reference, so that real art persists and renders consistently without re-fetching.

#### Acceptance Criteria
1. The application shall allow a media item to store an optional cover artwork URL in addition to its existing theme.
2. The application shall accept only an https URL as a media item's cover artwork and shall reject or ignore any non-https value.
3. While a media item has no stored cover artwork URL, the application shall treat the item as having no real cover and apply the placeholder behavior.
4. Existing media items without cover artwork shall remain valid and continue to function, so the field is optional and backward compatible.

### Requirement 3: Capture cover art when adding from Trending

**Objective:** As a reader who adds a trending item, I want its cover preserved, so that my library shows the same art I saw while browsing.

#### Acceptance Criteria
1. When a user adds a trending item that has a cover artwork URL, the application shall persist that artwork URL on the resulting media item.
2. When the added trending item has no cover artwork URL, the application shall create the media item without artwork, leaving it eligible for later resolution.
3. If a trending item resolves to an existing catalog media item that already has cover artwork, the application shall not overwrite the existing artwork.
4. When a trending item resolves to an existing catalog media item that lacks artwork and the trending item supplies a valid one, the application shall populate the item's missing artwork.

### Requirement 4: Resolving covers from external sources

**Objective:** As a reader, I want covers to appear even for items not sourced from Trending, so that seeded and custom items look complete rather than blank.

#### Acceptance Criteria
1. Where a media item lacks cover artwork, the application shall be able to resolve a cover from an external source appropriate to the item's media type, obtaining book covers from a books cover source and album, podcast, and TV/movie art from a media-catalog source.
7. Where a media item's type has no supported external cover source, the application shall leave the item without artwork and apply the themed placeholder, without attempting a lookup.
2. When a cover is successfully resolved for an item, the application shall persist the resolved artwork URL on that media item so it is reused on later views without refetching.
3. The application shall obtain external cover data server-side only and never from the browser.
4. The application shall resolve covers using sources that require no API key or secret.
5. Once an outcome has been determined for an item (a cover was stored, or none was found), the application shall not repeat the same external cover lookup on every subsequent view.
6. If an external cover source is unavailable, times out, or returns no usable result, the application shall leave the item without artwork, continue to show the themed placeholder, and not surface an error to the reader.

### Requirement 5: Match safety

**Objective:** As a reader, I want to trust that a displayed cover is actually for that item, so that title-based lookups never show the wrong art.

#### Acceptance Criteria
1. When resolving a cover by an item's title and creator, the application shall accept a candidate only when it satisfies a defined match rule for that item, and shall reject ambiguous or low-confidence matches.
2. If no candidate satisfies the match rule, the application shall record no artwork for the item rather than store a possibly incorrect cover.
3. The application shall accept only https image URLs returned by an external source.

### Requirement 6: Consistency and non-regression

**Objective:** As a maintainer, I want cover handling to be consistent and to not regress existing surfaces.

#### Acceptance Criteria
1. Where the platform renders an item's cover, the application shall display the item's stored artwork when present and the themed placeholder otherwise, applying the same fallback rule across those surfaces.
2. The existing themed-placeholder appearance and the surfaces that currently rely on it shall continue to function unchanged for items without artwork.
3. The Trending browsing surfaces shall continue to display provider artwork as they do today.

### Requirement 7: Performance and resilience

**Objective:** As a reader, I want cover loading to never slow down or break a page.

#### Acceptance Criteria
1. The application shall bound each external cover lookup with a timeout so that a slow source cannot hang a page render.
2. If cover resolution runs during a page render, the application shall ensure that a failure or timeout does not prevent the rest of the page from rendering.
3. The application shall not block adding an item to the library on the availability of external cover art.
