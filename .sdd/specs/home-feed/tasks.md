# Implementation Plan

> Layered sequencing: scaffold/TypeScript → database → local env/config → auth → backend API → app shell/routing → Home & feed → section pages → integration/tests. `(P)` marks work that can proceed concurrently once its layer's prerequisites are met.

- [ ] 1. Project scaffold and TypeScript foundation
- [x] 1.1 Stand up the Next.js (App Router) + React application in strict TypeScript
  - Initialize the app as the new runtime entry point, retiring the prototype IIFE as a reference-only artifact
  - Enable strict type checking and forbid bypassing types with `any` in application code
  - Provide scripts to type-check, build, and run, with the build failing on type errors
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 1.2 (P) Define shared domain and API contract types
  - Model users (with member/community kind), auth identities, sessions, media items, library entries, activities, and nested preferences as shared types
  - Express request/response payload types intended for reuse by both server and client
  - _Requirements: 1.3, 1.4, 8.5_

- [x] 1.3 (P) Port the existing visual language into the front-end
  - Bring over the prototype's brand mark, avatars, pills, typography, cover themes, and color tokens as the starting styles
  - Establish a component-based UI structure so the layer can be re-skinned later without touching data or routing logic
  - _Requirements: 1.6, 13.2_

- [ ] 2. PostgreSQL schema, migrations, seed, and data access
- [x] 2.1 Define the relational schema and generate the initial migration
  - Model a single users table (member and community actors) with nullable-unique email, separate auth identities (one row per provider) and sessions tables, plus media items, library entries, activities, and preferences
  - Enforce foreign keys to the single users table, the wishlist/current/finished status set, an optional 1–5 rating, and optional review text
  - Capture the schema through a versioned, checked-in migration
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 9.8, 6.1_

- [x] 2.2 Implement the typed data-access layer
  - Provide query operations for users, media, library entries, activities, and preferences through the typed ORM layer (no string-concatenated SQL)
  - Select a Postgres driver per environment (serverless/HTTP in production, pooled locally) to avoid connection exhaustion
  - _Requirements: 10.6, 8.2_

- [x] 2.3 Build the database seed routine
  - Insert the starter catalog as `ebook` media items, the seed community users (no credentials), and a demo member with a hashed-password identity
  - Ensure the app is demonstrable immediately after seeding
  - _Requirements: 10.5, 6.4_

- [ ] 3. Local environment and configuration
- [x] 3.1 (P) Provide the Docker-based local Postgres environment
  - Add Docker Compose configuration provisioning Postgres with a persistent volume across restarts
  - Allow the app to connect via environment configuration and keep production secrets out of the compose setup
  - Document start, migrate, and seed commands for local use
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 3.2 (P) Implement environment-based configuration with fail-fast validation
  - Read the database connection string and authentication secret from environment variables only
  - Provide an example environment file documenting required variables without real secrets, and exclude real env files from version control
  - Validate required variables at startup and fail fast with a clear error when missing
  - _Requirements: 12.1, 12.2, 12.5_

- [ ] 4. Authentication, sessions, and authorization
- [x] 4.1 Implement credential and session services
  - Hash passwords with bcrypt stored in the auth-identities record, never in plaintext
  - Create server-side session records keyed by a hashed opaque token, verify sessions, and revoke them on sign-out
  - Structure credential lookups by provider so a future Google identity reuses the same session machinery
  - _Requirements: 9.1, 9.3, 9.5, 9.8_

- [x] 4.2 Build registration, login, and logout endpoints
  - Register a new member with name, email, password; reject duplicate emails without creating an account
  - Verify login credentials against the stored hash and issue an HTTP-only session cookie; clear and revoke it on logout
  - Use generic messaging that avoids account enumeration
  - _Requirements: 9.1, 9.2, 9.6, 8.1_

- [x] 4.3 Enforce route and endpoint protection and per-user authorization
  - Gate signed-in routes and data endpoints, redirecting or rejecting unauthenticated requests
  - Derive the acting user only from the verified session, never from request input, and restrict reads/writes to the user's own records
  - _Requirements: 9.4, 9.7, 8.4_

- [ ] 5. Backend data API
- [ ] 5.1 (P) Profile read/update endpoints
  - Return the authenticated user's profile and preferences; update name, email, bio, and media preferences with validation and duplicate-email handling
  - _Requirements: 8.1, 8.3, 7.3_

- [ ] 5.2 (P) Media catalog listing and custom-item creation endpoints
  - List media items (optionally filtered by type) and create a custom `ebook` item linked to a new library entry
  - _Requirements: 8.1, 8.3, 7.2, 6.1_

- [ ] 5.3 (P) Library entry and review endpoints
  - Create/update a library entry's status for the authenticated user and record the corresponding activity
  - Save a 1–5 rating and review for a finished item, enforcing ownership
  - _Requirements: 8.1, 8.3, 7.1, 7.4, 9.7_

- [ ] 5.4 (P) Activity feed retrieval endpoint
  - Return community activity joined to actor and media item, newest first, optionally filtered by media type, omitting entries that cannot be resolved
  - _Requirements: 8.1, 4.2, 4.4, 4.6, 5.4_

- [ ] 5.5 Validate inputs and standardize typed responses across endpoints
  - Apply input validation and consistent typed JSON responses with success, client-error, and server-error status codes
  - Confirm the browser reaches data only through these endpoints, holding no database credentials
  - _Requirements: 8.2, 8.3, 8.5_

- [ ] 6. Application shell, routing, and navigation
- [ ] 6.1 Establish routes and the authenticated layout
  - Define routes for Home, Shelves, Catalog, and Profile via file-based routing, plus a not-found page and the unauthenticated auth surface
  - Render only the active route's page as primary content, and hide the hero, stats panel, and feed on non-Home pages
  - _Requirements: 2.1, 2.6, 2.7, 7.5_

- [ ] 6.2 Build the persistent navigation
  - Provide cross-page navigation that updates the URL without a full reload, supports back/forward, indicates the active link accessibly, and is extensible for additional routes such as Recommendations
  - Ensure unauthenticated users see the auth surface rather than signed-in navigation
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.8, 13.3, 13.5_

- [ ] 7. Home page: hero, stats panel, and filterable feed
- [ ] 7.1 Compose the Home page with hero and stats panel
  - Render Home at the root for authenticated users with a hero above the rest of the content
  - Display a hero backdrop that degrades gracefully when the image is unavailable, a name-aware greeting, and an optional call-to-action that navigates to another route
  - Render a stats panel of reader counters/reading stats backed by mock values, structured for a future Goals build-out
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [ ] 7.2 Render the community feed below the hero and stats
  - Show activity entries with actor name, avatar, action detail, media title, and a locale-aware timestamp, newest first
  - Reflect newly recorded activity after data refreshes and show an empty state when nothing matches
  - _Requirements: 4.1, 4.3, 4.5, 4.7, 13.4_

- [ ] 7.3 Implement the data-derived media-type filter
  - Offer an All option plus options derived from the media types present in the data, defaulting to All and indicating the active option accessibly
  - Filter the feed by the selected type, derive a human-readable label with a sensible fallback for unmapped types, and preserve the selection across a refresh
  - Confirm the filter and feed work unchanged when non-`ebook` media types are present
  - _Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 5.7, 6.2, 6.3, 13.3_

- [ ] 8. Dedicated section pages
- [ ] 8.1 (P) Shelves page
  - Present the user's library as the sole content with shelf filtering, wishlist/current/finished status actions, and review controls, persisting actions through the backend so they reach the Home feed
  - _Requirements: 7.1, 7.4, 13.1_

- [ ] 8.2 (P) Catalog page
  - Present the catalog with genre filtering, add-to-shelf actions, and the add-a-custom-e-book capability, persisting through the backend
  - _Requirements: 7.2, 7.4, 13.1_

- [ ] 8.3 (P) Profile page
  - Present editable profile fields and media preferences, saving through the backend
  - _Requirements: 7.3, 13.1_

- [ ] 9. Integration, migration application, and tests
- [ ] 9.1 Wire deploy-time migration application
  - Ensure migrations are applied so the deployed schema matches the application's expectations as part of the build/release process
  - _Requirements: 12.4, 12.3_

- [ ] 9.2 Add core unit and integration tests
  - Cover media-type label/option derivation (including a non-ebook type), feed selection (ordering, omission, filtering, empty), password hashing/verification, session verification and revocation, duplicate-email rejection, add-to-shelf producing an owned activity, and cross-user authorization denial
  - _Requirements: 5.2, 5.3, 4.4, 4.6, 9.1, 9.2, 9.5, 9.6, 9.7, 7.4_

- [ ] 9.3 Add end-to-end navigation and auth-flow coverage (optional)
  - Verify deep-load/refresh of each route renders without 404, unauthenticated access redirects to the auth surface, back/forward navigates between pages, and a signed-in add-to-shelf appears in the Home feed
  - _Requirements: 2.5, 2.6, 2.8, 4.5_
