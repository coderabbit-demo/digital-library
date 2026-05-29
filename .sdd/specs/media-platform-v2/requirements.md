# Requirements Document

## Project Description (Input)
LibraryLoop "v2": evolve the books-only app into a richer **digital media platform** and re-skin the entire UI to match the reference design at `https://stash-hut-28896057.figma.site` ("Media Manager"). The reference is built on **shadcn/ui + Tailwind v4**; its exact design tokens (light + dark) and screen layouts are captured in [design-reference.md](design-reference.md) and [screens/](screens/). This is a combined effort covering both new product capabilities and the visual redesign:

- **New capabilities:** multiple media types (music, podcasts, and TV/movies in addition to e-books) with type-specific metadata; free-form tags on items; consumption progress (e.g. pages read) and aggregate stats; reading **goals**; activity **streaks**; and unlockable **achievements**. The Home page becomes a live goals/stats/achievements dashboard like the reference, while retaining the existing community feed.
- **Re-skin:** adopt Tailwind v4 + shadcn/ui and restyle every surface (primitives, app shell + navigation, Home, Shelves/Catalog/Profile, auth) with the reference's design system, including light and dark themes.

Built on the existing Next.js (App Router) + React + TypeScript app with PostgreSQL/Drizzle, real auth, and the typed data API. Unlike a pure re-skin, this **extends** the schema, DAL, and API — additively and without breaking existing functionality, routes, auth/session/middleware behavior, or security. Build, type-check, and the existing tests stay green (updated only where intentional).

## Introduction

This is a single combined "v2" specification spanning new domain features and a full visual redesign. The reference app ("Media Manager") is the visual and conceptual target; its design system (shadcn/ui tokens, both themes) and real screen layouts are captured under this spec's `design-reference.md` and `screens/`.

The work extends the platform from e-books only to a multi-media library (books, music, podcasts, TV/movies) with tags, consumption progress, goals, streaks, and achievements, and surfaces these in a redesigned, goals/achievements-centric Home dashboard. All of it is presented through a new design system implemented with **Tailwind v4 + shadcn/ui**.

Because this adds features, it is **not** presentation-only: the database schema, seed, data-access layer, and backend API are extended. These changes must be **additive and non-breaking** — existing routes, the auth/session/middleware model, per-user authorization, input-validation discipline, and the domain/API typing approach are preserved, and migrations continue to run on deploy. The existing test suite stays green, with tests added for new behavior and updated only where intentional markup/behavior changes require it.

Requirements define WHAT v2 must achieve; concrete component/schema/endpoint design is produced in the design phase (using `design-reference.md`, `screens/`, and the frontend-design + shadcn approach).

## Requirements

### Requirement 1: Multiple media types with type-specific metadata

**Objective:** As a reader, I want to track music, podcasts, and TV/movies alongside e-books, so that the app is my whole digital-media hub.

#### Acceptance Criteria
1. The application shall support media items of types e-book, music, podcast, and TV/movie, each persisted with its `type` and the fields relevant to it (for example: book author/genre; music artist/album; podcast show/category/episode count; TV/movie title/genre).
2. The application shall let an authenticated user add a custom item of any supported type, capturing that type's relevant fields.
3. The catalog, library, and feed shall render items of every type, with a visually distinct type indicator per type.
4. The data model shall represent type-specific metadata without breaking existing e-book records, and shall require no rewrite of the open `type` field already in place.
5. Where a media type defines no human-readable label, the UI shall derive a sensible label rather than failing to render.

### Requirement 2: Free-form tags on items

**Objective:** As a reader, I want to tag items, so that I can organize and find them by my own labels.

#### Acceptance Criteria
1. The application shall allow zero or more free-form text tags to be associated with a media item.
2. The application shall display an item's tags on its card or detail view.
3. When the user creates or edits an item, the application shall let them set its tags.
4. The application shall persist tags durably and expose them through the typed API and data layer.

### Requirement 3: Consumption progress and stats

**Objective:** As a reader, I want my reading/listening progress tracked, so that I can see meaningful stats.

#### Acceptance Criteria
1. The application shall record consumption progress for library items where applicable (for example, pages read for books).
2. The application shall compute aggregate stats for the signed-in user, including total pages read and counts by shelf/status.
3. The application shall expose these stats through the typed API/data layer for display on Home.
4. Progress and stats shall be scoped to and computed only from the authenticated user's own data.

### Requirement 4: Reading goals

**Objective:** As a reader, I want to set a reading goal, so that I can track progress toward it.

#### Acceptance Criteria
1. The application shall let a user define a periodic reading goal (for example, a target number of books for a year).
2. The application shall compute and present progress toward the goal (completed vs. target, with a remaining count).
3. The application shall persist the goal per user and expose it through the typed API/data layer.
4. While no goal is set, Home shall present a sensible default or prompt rather than an error.

### Requirement 5: Activity streaks

**Objective:** As a reader, I want to see my activity streak, so that I stay motivated.

#### Acceptance Criteria
1. The application shall compute the user's current streak and longest streak from their recorded activity over time.
2. The application shall present current and longest streak on Home.
3. Streaks shall be derived only from the authenticated user's own activity.

### Requirement 6: Achievements

**Objective:** As a reader, I want to unlock achievements, so that engagement is rewarding.

#### Acceptance Criteria
1. The application shall define a set of achievements, each with an unlock condition (for example, "complete your first book", "maintain a 7-day streak").
2. When a user's data satisfies an achievement's condition, the application shall mark that achievement unlocked for the user with the date achieved.
3. The application shall present unlocked and not-yet-unlocked (in-progress) achievements and an unlocked count (for example, "2 of 8").
4. Achievement state shall be persisted per user and computed only from that user's data.

### Requirement 7: Redesigned Home dashboard

**Objective:** As a signed-in reader, I want a goals/achievements dashboard like the reference, so that Home summarizes my progress at a glance.

#### Acceptance Criteria
1. The Home page shall present a header greeting and a row of stat cards covering the reading goal, total pages read, current streak, and items in progress, matching the reference's composition.
2. The Home page shall present an achievements section showing unlocked and in-progress achievements with the unlocked count.
3. Stat cards with a target (goal, pages read) shall show progress visually (for example, a progress bar) with a caption.
4. The Home page shall retain the existing community feed (it is not removed by the redesign), presented within the new design.
5. Home stats and achievements shall reflect live data from Requirements 3–6, not placeholder values.

### Requirement 8: Enriched library and media cards

**Objective:** As a reader, I want rich, consistent media cards and filtering, so that browsing my library is clear and useful.

#### Acceptance Criteria
1. The application shall present media items as cards showing a type indicator, status indicator, title, creator, a type-appropriate meta line, a star rating where rated, an optional review snippet, and tags, matching the reference card anatomy.
2. The catalog/library shall provide a media-type filter presenting an "All" option plus one option per media type present, each with a count, defaulting to "All".
3. Each card shall offer its item actions (move shelf / add to shelf, review) through an accessible control set.
4. The filter and cards shall function for every supported media type without per-type branches in the filtering logic.

### Requirement 9: Design system foundation (Tailwind v4 + shadcn/ui)

**Objective:** As a developer, I want the reference's design system in code, so that every surface is styled consistently and matches the target.

#### Acceptance Criteria
1. The application shall adopt Tailwind v4 and shadcn/ui-style primitives, configured with the reference's design tokens (color, typography, radii, spacing, shadows, motion) as captured in `design-reference.md`.
2. The application shall provide light and dark themes from these tokens, following the operating system's color-scheme preference by default.
3. All surfaces shall be styled from the shared token system rather than ad-hoc per-component values, with a consistent focus-visible treatment.
4. Introducing the styling framework and UI-primitive library (dependencies and build configuration) is in scope for this feature.

### Requirement 10: Restyled app shell and navigation

**Objective:** As a signed-in reader, I want the reference's shell and navigation, so that the app looks and feels like the target.

#### Acceptance Criteria
1. The application shall present a top brand bar (logo + product name/tagline) with a primary "add item" action, and a horizontal tab navigation using the reference's labels — **Home, Library, Wishlist, Reviews** — with account/profile access available from the brand bar, and the navigation extensible to additional destinations (for example, Recommendations).
2. While a route is active, the navigation shall present an accessible active-state indication.
3. The shell and navigation shall remain usable at mobile widths without horizontal overflow.
4. The navigation shall preserve all existing destinations, the sign-out control, and accessible labeling.

### Requirement 11: Section pages (reference IA) and auth surface

**Objective:** As a reader, I want the pages organized like the reference (Library / Wishlist / Reviews) and restyled, so that the IA and look match the target.

#### Acceptance Criteria
1. The application shall present a **Library** page: the signed-in user's collection across all media types, with the media-type filter (Requirement 8), type/status indicators, and per-item actions — preserving the existing shelf/status behavior.
2. The application shall present a **Wishlist** page: the user's wishlist items, with actions to move them along their shelves.
3. The application shall present a **Reviews** page: the user's reviewed items showing ratings and review text, with the ability to edit a review.
4. The application shall preserve the ability to add items to the library — both custom items of any type and items discovered from the seeded catalog — reachable via the "add item" action; the prior Catalog/Shelves functionality shall be reorganized into this IA without losing capability.
5. The application shall provide a **Profile** surface (editable profile fields and media preferences), reachable from the brand bar, restyled to the new design.
6. The application shall restyle the login and registration pages, presenting validation and request errors accessibly, without the signed-in shell.
7. All add and edit flows shall capture the relevant fields for the item's type, including tags.

### Requirement 12: Responsive layout

**Objective:** As a reader on any device, I want the interface to adapt, so that it is usable from mobile to desktop.

#### Acceptance Criteria
1. Every surface shall be usable and correctly laid out across mobile, tablet, and desktop widths.
2. While viewed at a narrow width, content (including the navigation and card grids) shall reflow without horizontal scrolling or clipped controls.
3. Interactive targets shall remain comfortably tappable at mobile widths.

### Requirement 13: Accessibility

**Objective:** As a reader using assistive technology, I want v2 to be accessible, so that the redesign and new features do not regress usability.

#### Acceptance Criteria
1. The application shall preserve and apply accessible semantics — element roles, accessible names, form labels, and the active-navigation indication (`aria-current`).
2. Text and essential UI shall meet WCAG 2.1 AA contrast in both light and dark themes.
3. All interactive elements shall be keyboard operable with a visible focus indicator.
4. Where motion is used, the application shall honor the user's reduced-motion preference.
5. Status, rating, achievement, and progress information shall be conveyed by text/semantics, not by color alone.

### Requirement 14: Backend and data extensions

**Objective:** As a maintainer, I want the new features backed by sound, secure persistence and APIs, so that v2 is robust.

#### Acceptance Criteria
1. The application shall extend the PostgreSQL schema for the new data (type-specific media metadata, tags, consumption progress, goals, any streak source data, and achievements) through versioned migrations checked into the repository.
2. The application shall extend the typed data-access layer and the backend API (Next.js Route Handlers) to read/write the new data, with input validation and typed JSON responses.
3. Every new endpoint shall require an authenticated session and shall derive the acting user from the session only, restricting reads/writes to that user's own records.
4. The seed routine shall be updated to populate representative multi-type catalog data, tags, a demo goal, and demo achievements so the redesigned UI is demonstrable after setup.
5. Schema and API changes shall be additive and shall not break existing e-book data or existing endpoints/contracts; migrations shall continue to apply on deploy.

### Requirement 15: Architecture and quality preserved

**Objective:** As a maintainer, I want v2 to uphold the project's quality and architecture, so that growth doesn't cause regressions.

#### Acceptance Criteria
1. The application shall preserve the existing routes and their access gating, the auth/session/middleware model, and per-user authorization; no existing contract shall break.
2. The application shall preserve the Next.js server/client component boundaries.
3. The application shall continue to type-check and build, and the test suite shall pass — with tests added for new behavior and updated only where intentional changes require it, never to weaken assertions.
4. The application shall not introduce `any` in TypeScript application code, shall keep secrets in environment configuration, and shall keep user-supplied content safely rendered (no `dangerouslySetInnerHTML`).
