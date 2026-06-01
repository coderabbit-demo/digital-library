# Requirements Document

## Project Description (Input)
Media item detail page: selecting a book/music/etc. item opens a detail page with full metadata/description and actions to add to wishlist, mark as currently reading, mark as read (finished), and add/edit a review — reusing the existing library/review/tags endpoints; linked from the library, wishlist, reviews, catalog, and trending surfaces

## Introduction

This feature adds a **media item detail page** to LibraryLoop — a per-item surface, reachable from every place an item is shown (Library, Wishlist, Reviews, the catalog/add flow, and Trending), that presents the item's full metadata and description and lets the signed-in user manage that item: place it on a shelf (wishlist / currently reading / read), and add or edit a review.

It builds **additively** on the shipped platform: the data already exists (`media_items` with type-specific metadata, `library_entries` with status/rating/review/progress, entry tags), and the write paths already exist as authenticated Route Handlers (library shelf upsert, review, tags, and the trending add-to-library endpoint). This feature is therefore primarily a **new read surface + route + cross-surface linking** that composes those existing endpoints; it must not introduce new persistence or break existing routes, contracts, auth/session/middleware behavior, or per-user authorization. Build, type-check, and the test suite stay green.

One case needs explicit handling: items shown in **Trending** are sourced from external providers and are not persisted until added, so they have no internal id. The requirements below define a coherent, non-broken path from a trending item to a detail view.

Requirements define WHAT the detail page must achieve; concrete routes, components, and data loaders are produced in the design phase, reusing the design system and existing endpoints.

## Requirements

### Requirement 1: Item detail route and navigation

**Objective:** As a signed-in reader, I want each item to have its own page at a stable URL, so that I can view and manage it in one place and share/return to it.

#### Acceptance Criteria
1. The application shall define an authenticated route that addresses a single media item by its identifier and renders that item's detail page as the primary content.
2. When the user selects an item from a surface that lists it, the application shall navigate to that item's detail page.
3. When the detail page is loaded directly at, or refreshed on, its URL, the application shall render it without a 404 for a valid item.
4. While a user is not authenticated, the application shall not render the detail page and shall direct the user to the authentication surface, consistent with the platform's route gating.
5. The application shall provide a way to return to the previous surface (for example, a back affordance) without losing the user's place.

### Requirement 2: Item information display

**Objective:** As a reader, I want the detail page to show an item's full information, so that I can decide what to do with it.

#### Acceptance Criteria
1. The application shall display the item's title, creator, media-type indicator, a type-appropriate meta line, and description.
2. Where the item has type-specific metadata (for example, album, episode count, pages, seasons), the application shall present the relevant fields for that type, and shall derive a sensible label rather than failing to render when a field is absent.
3. The application shall display the item's cover/artwork when available, and a themed fallback otherwise.
4. When the item is in the signed-in user's library, the application shall display the user's current shelf status, rating, review, and tags for that item.
5. The application shall present the page using the media-platform-v2 design system, consistent with the item cards elsewhere in the app.

### Requirement 3: Shelf status actions

**Objective:** As a reader, I want to set an item's shelf from its detail page, so that I can manage my library where I'm looking at the item.

#### Acceptance Criteria
1. The application shall provide actions on the detail page to add the item to the wishlist, mark it as currently reading, and mark it as read (finished).
2. The application shall indicate the item's current shelf status and allow moving it between shelves.
3. When the user changes the shelf, the application shall persist the change for the authenticated user through the platform's existing library endpoint and reflect the new status on the page.
4. When the user places an item on a shelf, the application shall record an activity such that it appears in the Home community feed.
5. Shelf changes shall be scoped to and applied only to the authenticated user's own library.

### Requirement 4: Add and edit a review

**Objective:** As a reader, I want to rate and review an item on its detail page, so that I can capture my opinion alongside the item.

#### Acceptance Criteria
1. The application shall let the user add a 1–5 star rating and review text for the item on the detail page, through the platform's existing review endpoint.
2. When the item already has a rating and review for the user, the application shall pre-fill them and allow editing and re-saving.
3. When a review is saved, the application shall reflect the updated rating and review on the detail page and on the Reviews surface.
4. The application shall present rating and review information by text and semantics, not by color alone.
5. The application shall validate the rating as an integer from 1 to 5 and surface invalid input accessibly without saving.

### Requirement 5: Edit tags

**Objective:** As a reader, I want to manage an item's tags from its detail page, so that organizing it is part of the same view.

#### Acceptance Criteria
1. The application shall display the item's tags and let the user add or edit them on the detail page for an item in their library.
2. When the user saves tags, the application shall persist them for the authenticated user through the platform's existing tags endpoint and reflect them on the page.
3. The application shall normalize tags (trim, de-duplicate) consistent with the rest of the app.

### Requirement 6: Linking from existing surfaces

**Objective:** As a reader, I want to open an item's detail from anywhere it appears, so that navigation feels consistent.

#### Acceptance Criteria
1. The application shall link each item shown on the Library, Wishlist, and Reviews surfaces to that item's detail page.
2. The application shall provide access to an item's detail page from the catalog/add flow and from the Trending surfaces.
3. The application shall make the link an accessible, keyboard-operable control with a clear accessible name.
4. The application shall preserve the existing per-surface actions (the inline card actions shall continue to work and shall not be removed by adding the link).

### Requirement 7: Trending and not-yet-saved items

**Objective:** As a reader, I want a coherent detail experience for a trending item that isn't in my library yet, so that selecting it is never a dead end.

#### Acceptance Criteria
1. When the user selects a trending item that is not yet persisted, the application shall provide a non-broken path to a detail view for that item (for example, by resolving or adding it to the catalog first), without a 404.
2. The application shall not create duplicate catalog entries when resolving a trending item to its detail, reusing the platform's type-scoped find-or-create matching.
3. Where a trending item has not been added to the user's library, the detail view shall still allow the user to add it via the shelf actions.

### Requirement 8: Loading, not-found, and error states

**Objective:** As a reader, I want clear feedback while the page loads or when something is wrong, so that the page never appears broken.

#### Acceptance Criteria
1. While the detail data is loading, the application shall present a loading state.
2. If the requested item does not exist, the application shall present an accessible not-found state rather than crashing, with a way back to a populated surface.
3. If a shelf, review, or tag action fails, the application shall present an accessible error and shall not lose the user's input.
4. The application shall not crash the rest of the app when a detail action fails, keeping other routes usable.

### Requirement 9: Responsive layout and accessibility

**Objective:** As a reader on any device using assistive technology, I want the detail page usable and accessible, so that it matches the rest of the redesigned app.

#### Acceptance Criteria
1. The detail page shall be usable and correctly laid out across mobile, tablet, and desktop widths without horizontal overflow or clipped controls.
2. The detail page shall support light and dark themes from the shared design tokens.
3. All interactive controls shall be keyboard operable with a visible focus indicator, and the page shall preserve accessible roles, names, and form labels.
4. Where motion is used, the application shall honor the user's reduced-motion preference, and status/rating information shall not be conveyed by color alone.

### Requirement 10: Architecture, reuse, and quality preserved

**Objective:** As a maintainer, I want the detail page to reuse existing contracts and uphold the project's quality bar, so that it adds a surface without regressions.

#### Acceptance Criteria
1. The application shall implement the detail page's actions by reusing the existing authenticated library, review, tags, and trending-add endpoints, deriving the acting user from the session and not introducing new write contracts unless a genuine gap exists.
2. The application shall preserve the existing routes, their access gating, the auth/session/middleware model, per-user authorization, and the Next.js server/client component boundaries; no existing contract shall break.
3. The application shall continue to type-check and build, and the test suite shall pass, with tests added for the new behavior and updated only where intentional changes require it.
4. The application shall not introduce `any` in TypeScript application code and shall keep user- and externally-supplied content safely rendered (no `dangerouslySetInnerHTML`).
