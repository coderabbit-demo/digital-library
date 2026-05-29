# Requirements Document

## Project Description (Input)
Home page with a hero image at the top and a filterable activity Feed below it, plus dedicated Shelves, Catalog, and Profile pages. As part of delivering this, the project is re-platformed: migrate the existing vanilla-JS prototype to **TypeScript** built on a real front-end framework (**Next.js + React**), move data storage from browser `localStorage` to a **PostgreSQL** database behind a real backend API with proper authentication, use **Docker** for local development, and deploy on **Vercel** with managed Postgres. The Feed currently shows book activity but must support future media types (music, podcasts, TV/movies) via a media-type filter. The Recommendations page is covered by the separate `nyt-recommendations` spec.

## Introduction

This feature re-platforms LibraryLoop from a client-only vanilla-JS prototype into a **full-stack, typed web application**, and on that foundation delivers a routed multi-page experience: a **Home** landing page (hero + stats panel + filterable community Feed) and dedicated **Shelves**, **Catalog**, and **Profile** pages.

The application is built with **Next.js (App Router) and React in TypeScript**. Next.js file-based routing provides clean per-page URLs, client navigation, deep-linking, and browser-history behavior natively (replacing the prototype's hand-rolled routing). Data is persisted in **PostgreSQL** and accessed only through the backend; the browser never talks to the database directly. The backend is implemented as **Next.js Route Handlers** that enforce **real authentication** (hashed passwords, signed session cookies) and per-user authorization, replacing the prototype's plaintext-password/`localStorage` model.

**Local development** uses **Docker** (Docker Compose) to run Postgres (and optionally the app) so every contributor has a consistent environment. **Production** deploys to **Vercel** with a **managed Postgres** database (for example, Vercel Postgres or Neon).

The existing prototype ([src/app.js](../../../src/app.js), [src/styles.css](../../../src/styles.css)) is the **behavioral reference**: its data model (accounts, media items, library entries, activities, community users, preferences), its flows (auth, shelves, reviews, recommendations seed, feed), and its visual language are reproduced in the new stack. The UI will be re-skinned more thoroughly in a later effort, so the front-end is built cleanly with TypeScript and React but is not the place for heavy visual investment in this slice.

The defined page routes for this spec are: Home (`/`), Shelves (`/shelves`), Catalog (`/catalog`), and Profile (`/profile`). The Recommendations route (`/recommendations`) and its NYT integration are added by the separate `nyt-recommendations` spec, which builds on this platform.

## Requirements

### Requirement 1: TypeScript and framework foundation

**Objective:** As a developer, I want the app rebuilt in TypeScript on Next.js and React, so that the codebase is typed, componentized, and ready for a future re-skin.

#### Acceptance Criteria
1. The project shall be implemented in TypeScript with strict type checking enabled, and shall not retain the prototype's untyped `src/app.js` as the runtime entry point.
2. The application shall be built on Next.js (App Router) with React, replacing the single-file IIFE rendering approach.
3. The application shall reproduce the existing prototype's domain concepts and user-facing behavior (accounts, media items, library entries with statuses and reviews, activities, community users, and media preferences) in typed components and modules.
4. The project shall define shared TypeScript types for the domain model and API contracts, and shall not use the `any` type to bypass typing in application code.
5. The project shall provide scripts to type-check, build, and run the application, and the build shall fail on type errors.
6. The front-end shall organize pages and shared UI as React components so that the visual layer can be re-skinned later without rewriting data or routing logic.

### Requirement 2: Client-side routing and navigation

**Objective:** As a signed-in reader, I want each major section to be its own page with its own URL, so that I can navigate, deep-link, and use browser history.

#### Acceptance Criteria
1. The application shall define routes, each with its own URL path, for Home (`/`), Shelves (`/shelves`), Catalog (`/catalog`), and Profile (`/profile`), using the framework's file-based routing.
2. The application shall provide a persistent navigation control, visible across signed-in pages, with a link to each route, implemented so additional routes (such as Recommendations) can be added without rework.
3. When the user selects a navigation link, the application shall render the target page and update the URL without a full document reload.
4. While a route is active, the application shall visually indicate the corresponding navigation link as the active target.
5. When the user navigates with browser back/forward, the application shall render the page matching the resulting URL.
6. When the app is loaded or refreshed directly at a defined route URL (for example, `/shelves`), the application shall render that route's page without a 404.
7. If a requested path does not match any defined route, the application shall render a not-found page.
8. While a user is not authenticated, the application shall not render any signed-in route's page or the persistent navigation, and shall direct the user to the authentication surface.

### Requirement 3: Home page, hero section, and stats panel

**Objective:** As a signed-in reader, I want Home to be the default landing page with a hero banner, a stats panel, and the Feed, so that the app opens on a branded surface that summarizes my reading and surfaces community activity.

#### Acceptance Criteria
1. When an authenticated user navigates to the root path (`/`), the application shall render the Home page.
2. While the Home page is active, the application shall render a hero region positioned above the rest of the page content.
3. The hero region shall display a hero image or styled visual backdrop and a headline.
4. While the hero image asset fails to load or is unavailable, the hero region shall fall back to a styled background so that no broken-image placeholder is shown.
5. The hero region shall display a greeting or contextual text that includes the signed-in user's name.
6. Where the hero region includes a call-to-action control, selecting that control shall navigate the user to the relevant route (for example, Catalog or Shelves).
7. While the Home page is active, the application shall render a stats panel that displays reader counters and reading stats.
8. The stats panel shall be backed by mock/placeholder values for this slice and shall be structured so that counters, reading stats, and a future Goals section can be built out into live data without redesigning the page.
9. The hero region, stats panel, and Feed shall remain legible and correctly laid out at both desktop and mobile widths.

### Requirement 4: Community activity Feed

**Objective:** As a signed-in reader, I want the Feed to show recent community activity below the hero, so that I can see what other readers and I have been doing.

#### Acceptance Criteria
1. While the Home page is active, the application shall render the Feed region below the hero region and stats panel.
2. The Feed shall display activity entries retrieved from the backend, including activity from the signed-in user and from community users.
3. The Feed shall render each activity entry with the actor's name and avatar, the action detail, and the title of the associated media item.
4. The Feed shall order activity entries from most recent to least recent by their creation timestamp.
5. When the signed-in user performs an action that records an activity (adding to a shelf, starting, finishing, or reviewing an item), the resulting activity shall appear in the Feed after the data refreshes.
6. If an activity entry references a user or media item that cannot be resolved, the application shall omit that entry rather than render an incomplete row.
7. While there are no activity entries that match the current filter, the Feed shall display an empty-state message.

### Requirement 5: Media-type filter

**Objective:** As a signed-in reader, I want to filter the Feed by media type, so that I can focus on one kind of media even as the catalog grows beyond books.

#### Acceptance Criteria
1. The Feed shall provide a media-type filter control that includes an "All" option and at least one media-type option corresponding to books.
2. The media-type filter shall derive its selectable media-type options from the media types present in the data rather than from a single hard-coded value, so that future media types appear automatically.
3. When the user selects the "All" filter option, the Feed shall display activity entries for every media type.
4. When the user selects a specific media-type filter option, the Feed shall display only activity entries whose associated media item is of that media type.
5. While a media-type filter option is selected, the Feed shall visually indicate the active filter option.
6. The default media-type filter selection shall be "All".
7. When the user changes the media-type filter selection, the application shall preserve the selection for the duration of the session (for example, via URL query or client state) so a refresh does not silently reset a deliberately chosen filter.

### Requirement 6: Extensible media-type model

**Objective:** As a developer extending LibraryLoop, I want media types represented as data, so that adding music, podcasts, or TV/movies later does not require reworking the Feed or filter.

#### Acceptance Criteria
1. The data model shall store a media item's type as a first-class field, and the application shall determine an activity's media type from its associated media item rather than assuming all activity is book activity.
2. The media-type filter and Feed rendering shall function correctly when the data contains media items whose type is not `ebook`, without code changes to the filtering logic.
3. Where a media type has no human-readable label defined, the application shall display a sensible derived label for that media type rather than failing to render the filter option.
4. The migration that seeds existing prototype data shall represent the existing e-book content as the `ebook` media type.

### Requirement 7: Dedicated Shelves, Catalog, and Profile pages

**Objective:** As a signed-in reader, I want Shelves, Catalog, and Profile to each be their own page, so that each section has a focused surface and its own URL.

#### Acceptance Criteria
1. The application shall render the Shelves section as the sole primary content of the Shelves (`/shelves`) route, preserving the existing shelf filtering, status actions (wishlist/current/finished), and review controls.
2. The application shall render the Catalog section as the sole primary content of the Catalog (`/catalog`) route, preserving the existing genre filtering and add-to-shelf actions, including the add-a-custom-e-book capability.
3. The application shall render the Profile section as the sole primary content of the Profile (`/profile`) route, preserving the existing editable profile fields and media preferences.
4. When the user performs an action on a page that records an activity, the application shall persist the activity such that it appears in the Home Feed.
5. While a page other than Home is active, the application shall not render the hero region, the stats panel, or the Home Feed.

### Requirement 8: Backend API and data access

**Objective:** As a developer, I want all data read and written through a typed backend API, so that the browser never touches the database and access is centrally controlled.

#### Acceptance Criteria
1. The application shall expose backend API endpoints (Next.js Route Handlers) for the operations the UI requires: authentication, profile read/update, catalog/media listing and custom-item creation, library entry read/create/update, review save, and activity feed retrieval.
2. The browser shall access persisted data only through these backend endpoints and shall never hold database credentials or issue database queries directly.
3. Each API endpoint shall validate its inputs and shall return typed JSON responses with appropriate HTTP status codes for success, client error, and server error.
4. The API shall return only data the requesting user is authorized to access, and write operations shall affect only the authenticated user's own records.
5. The API and client shall share TypeScript types for request and response payloads so that contracts are checked at compile time.

### Requirement 9: Authentication and authorization

**Objective:** As a reader, I want secure sign-up and sign-in with my data protected, so that the app is safe rather than a plaintext prototype.

#### Acceptance Criteria
1. The application shall allow a new user to register with name, email, and password, and shall store passwords only as salted cryptographic hashes (for example, bcrypt), never in plaintext.
2. The application shall allow a returning user to sign in with email and password, verifying the password against the stored hash.
3. When a user authenticates successfully, the application shall establish a server-validated session represented by an HTTP-only cookie, and shall not expose session tokens or secrets to client-side JavaScript.
4. The application shall protect signed-in routes and data endpoints so that unauthenticated requests are rejected or redirected to the authentication surface.
5. When a user signs out, the application shall invalidate the session server-side so that protected routes and endpoints are no longer accessible with the prior session token, even if that token is replayed.
6. If registration is attempted with an email that already exists, the application shall reject it with a clear error and shall not create a duplicate account.
7. The application shall enforce that a user can read and modify only their own profile, library entries, and reviews.
8. The application shall store login credentials separately from the core user record (one record per authentication provider) so that the planned Google SSO provider can be added in a later release without changing the user, session, or data model.

### Requirement 10: PostgreSQL persistence and schema

**Objective:** As a maintainer, I want durable relational storage in PostgreSQL, so that data survives across sessions, devices, and deployments.

#### Acceptance Criteria
1. The application shall persist users (both authenticating members and feed-only community actors in a single users table distinguished by a kind field), authentication identities, sessions, media items, library entries, activities, and user preferences in a PostgreSQL database.
2. The schema shall be defined and evolved through versioned migrations checked into the repository.
3. The schema shall enforce referential integrity between activities/library entries and their users and media items via real foreign keys to the single users table, and shall enforce uniqueness of a member's email (email may be null for community actors).
4. The schema shall model the library entry's status as one of wishlist, current, or finished, and shall store an optional 1–5 rating and optional review text.
5. The repository shall provide a seed routine that populates the database with the prototype's starter catalog, community users, and demo account so the app is demonstrable immediately after setup.
6. Data access shall go through a typed query layer (Drizzle ORM) rather than ad-hoc string-concatenated SQL.

### Requirement 11: Docker-based local development

**Objective:** As a contributor, I want a one-command local environment, so that I can run Postgres and the app consistently without manual setup.

#### Acceptance Criteria
1. The repository shall include Docker configuration (for example, `docker-compose.yml`) that provisions a PostgreSQL service for local development.
2. The Docker configuration shall allow the application to connect to the local database via environment configuration, and shall persist local database data across container restarts via a volume.
3. The repository shall document the commands to start the local environment, run migrations, and seed the database.
4. The local environment shall provide the same routing and API behavior as production so features can be validated before deployment.
5. The Docker configuration shall not contain real production secrets; local credentials shall be provided via an example environment file.

### Requirement 12: Configuration, secrets, and deployment

**Objective:** As a maintainer, I want clean configuration and a working Vercel deployment, so that the app runs locally and in production with secrets kept safe.

#### Acceptance Criteria
1. The application shall read its database connection string and authentication secret(s) from environment variables and shall not hard-code them in source.
2. The repository shall provide an example environment file (for example, `.env.example`) documenting required variables (such as `DATABASE_URL` and the session secret) without containing real secret values, and the real environment files shall be excluded from version control.
3. The application shall deploy on Vercel using a managed PostgreSQL database, with production environment variables configured in the Vercel project.
4. The deployment process shall apply database migrations so the deployed schema matches the application's expectations.
5. If a required environment variable is missing at startup, the application shall fail fast with a clear error rather than running in an undefined state.
6. The README shall document local setup (Docker, migrations, seed), the environment variables, and the deployment steps.

### Requirement 13: Layout, accessibility, and consistency

**Objective:** As a reader on any device, I want every page usable and consistent, so that the experience feels cohesive ahead of the later re-skin.

#### Acceptance Criteria
1. Every defined route's page shall be usable and correctly laid out at both desktop and mobile widths.
2. Every page shall reuse the existing LibraryLoop visual language (brand mark, avatars, pills, typography, and color themes) as the starting point, ported into the new front-end.
3. The persistent navigation and the media-type filter control shall expose accessible labels and indicate the currently selected option to assistive technology.
4. The Feed shall present each activity entry's timestamp in a human-readable, locale-aware format.
5. Interactive controls shall be implemented as accessible, semantic components (for example, real links and buttons) consistent with the framework's conventions.
