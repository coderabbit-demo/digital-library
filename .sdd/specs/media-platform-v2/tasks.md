# Implementation Plan — media-platform-v2

> **Jira (Epic [DL-39](https://coderabbit-demo.atlassian.net/browse/DL-39))** — one story per major task:
> Task 1 → DL-40 · Task 2 → DL-41 · Task 3 → DL-42 · Task 4 → DL-43 · Task 5 → DL-44 · Task 6 → DL-45 · Task 7 → DL-46 · Task 8 → DL-47 · Task 9 → DL-48 · Task 10 → DL-49 · Task 11 → DL-50 · Task 12 → DL-51.

> Sequenced foundation → data → API → UI foundation → UI surfaces → integration.
> `(P)` marks tasks runnable in parallel (no data dependency, no shared-file contention, no prerequisite review). Each sub-task targets ~1–3 hours.
> Throughout, keep build, typecheck, and the existing test suite green; never introduce `any`; never use `dangerouslySetInnerHTML` (15.3, 15.4).

- [x] 1. Design-system foundation (Tailwind v4 + shadcn/ui)
- [x] 1.1 Introduce Tailwind v4 build pipeline and the reference token system
  - Add the Tailwind v4 toolchain (PostCSS plugin) and wire it into the Next.js build.
  - Replace the prototype stylesheet with the Tailwind import plus the reference design tokens (color, typography, radii, spacing, motion) for the light theme, and a dark-theme override, sourced from the captured design reference.
  - Confirm the build, typecheck, and existing tests still pass after the framework lands.
  - _Requirements: 9.1, 9.4, 15.3_

- [x] 1.2 Establish UI primitives, theming, and focus treatment
  - Scaffold the shared UI primitive set (button, card, badge, tabs, progress, dropdown menu, dialog, input, textarea, label, select, avatar) from the token system.
  - Provide light/dark theming that follows the operating-system color-scheme preference by default, with a consistent visible focus-visible treatment applied from shared tokens.
  - Ensure all surfaces will draw from the shared token system rather than ad-hoc per-component values.
  - _Requirements: 9.2, 9.3, 13.3_

- [x] 2. Additive database schema and migration
- [x] 2.1 Extend existing tables for metadata and progress
  - Add nullable type-specific metadata and a total-units field to media items, and a nullable consumption-progress field to library entries, all without altering existing columns or the open media-type field.
  - Guard progress with a non-negative constraint; confirm existing e-book rows remain valid with empty/absent new fields.
  - _Requirements: 1.1, 1.4, 3.1, 14.1, 14.5_

- [x] 2.2 Add new tables for tags, goals, and achievements
  - Create a user-scoped tags table associated with a library entry (unique per entry+tag, cascading), a per-user periodic goals table (one active goal per user/period/period-key with a positive target), and a per-user achievements table recording the first-unlock date (unique per user+achievement).
  - Generate the versioned migration and confirm it applies cleanly on top of the current schema.
  - _Requirements: 2.1, 2.4, 4.3, 6.4, 14.1, 14.5_

- [x] 3. Domain types and pure computation helpers
- [x] 3.1 (P) Type-specific media metadata model and labels
  - Represent each media type's metadata as a discriminated model validated at the boundary, and derive a human-readable label per type with a sensible fallback for unknown types.
  - _Requirements: 1.1, 1.4, 1.5_

- [x] 3.2 (P) Per-user stats aggregation
  - Compute the signed-in user's aggregate stats — counts by shelf/status, total pages read from progress, and items in progress — purely from that user's own entries.
  - _Requirements: 3.2, 3.4_

- [x] 3.3 (P) Reading-goal progress computation
  - Compute progress toward a goal (completed vs. target with a non-negative remaining count), and yield a sensible default/prompt when no goal is set.
  - _Requirements: 4.2, 4.4_

- [x] 3.4 (P) Activity-streak computation
  - Derive current and longest streaks from the user's recorded activity dates, with the reference "today" injected for deterministic testing.
  - _Requirements: 5.1, 5.3_

- [x] 3.5 (P) Achievements catalog and evaluator
  - Define the achievement set with unlock conditions, evaluate them against a user's stats/streaks/goal context, and expose unlocked vs. in-progress state plus an unlocked count; identify newly satisfied achievements idempotently.
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 3.6 (P) Tag normalization
  - Normalize free-form tags (trim, lowercase, de-duplicate) and enforce count/length caps for safe persistence.
  - _Requirements: 2.1_

- [x] 4. Data-access layer extensions
  - Note: these sub-tasks extend the shared data-access module; treat as same-file work (not parallel-safe with each other), each scoped strictly to the acting user's records.
- [x] 4.1 Tags persistence access
  - Read tags aggregated per library entry, and replace an entry's tag set only when the entry belongs to the acting user.
  - _Requirements: 2.2, 2.4, 14.2_
- [x] 4.2 Progress persistence access
  - Record/update consumption progress on a user's own library entry.
  - _Requirements: 3.1, 14.2_
- [x] 4.3 Goals persistence access
  - Read the active goal and upsert it idempotently per user/period/period-key.
  - _Requirements: 4.1, 4.3, 14.2_
- [x] 4.4 Achievement-unlock persistence access
  - Insert first-unlock records idempotently and list a user's unlocked achievements with their achieved dates.
  - _Requirements: 6.2, 6.4, 14.2_
- [x] 4.5 Media metadata read/write access
  - Persist and read type-specific media metadata and total-units alongside existing media fields.
  - _Requirements: 1.1, 1.2, 14.2_

- [x] 5. Backend API route handlers
- [x] 5.1 Request validators for new write flows
  - Add boundary validators for tags, progress, goal targets, and custom media that includes a media type plus type-specific fields and tags; reject malformed input with field-level errors.
  - _Requirements: 1.2, 2.3, 3.1, 4.1_
- [x] 5.2 (P) Tags endpoint
  - Expose an authenticated endpoint to replace a library entry's tags, deriving the user from the session and restricting writes to that user's entry.
  - _Requirements: 2.3, 14.2, 14.3_
- [x] 5.3 (P) Progress endpoint
  - Expose an authenticated endpoint to record consumption progress for the user's own entry.
  - _Requirements: 3.1, 14.2, 14.3_
- [x] 5.4 (P) Goals endpoints
  - Expose authenticated read and set endpoints for the active goal, returning the goal and its computed progress; derive the user from the session only.
  - _Requirements: 4.1, 4.2, 4.3, 14.2, 14.3_
- [x] 5.5 Extend add-media and review flows with types, tags, and unlocks
  - Accept media type, type-specific metadata, and tags when adding an item; after qualifying mutations (e.g. finishing/reviewing) evaluate and persist newly unlocked achievements without failing the primary action.
  - _Requirements: 1.2, 2.3, 6.2, 14.2, 14.3_
- [x] 5.6 Preserve existing endpoint contracts
  - Verify all pre-existing endpoints keep their request/response contracts and access gating; new fields are optional and backward-compatible.
  - _Requirements: 14.5, 15.1_

- [x] 6. Seed representative multi-type data
  - Populate a multi-type catalog (books, music, podcasts, TV/movies) with type-specific metadata, sample tags on demo entries, a demo reading goal, and demo achievement unlocks so the redesigned UI is demonstrable after setup.
  - _Requirements: 14.4_

- [x] 7. Restyled app shell and navigation
- [x] 7.1 Brand bar, primary add action, and horizontal tab navigation
  - Build the top brand bar (logo + product name/tagline) with a primary add-item action and account/profile access, and a horizontal tab navigation using the reference labels Home, Library, Wishlist, Reviews, kept data-driven and extensible to additional destinations, preserving the sign-out control.
  - _Requirements: 10.1, 10.4_
- [x] 7.2 Active-state, responsive shell, and accessible labeling
  - Indicate the active route accessibly, keep the shell and navigation usable at mobile widths without horizontal overflow, and preserve element roles and accessible names.
  - _Requirements: 10.2, 10.3, 12.2, 13.1_

- [x] 8. Enriched media card and media-type filter
- [x] 8.1 (P) Media card anatomy
  - Render media items as cards showing a per-type indicator, status indicator, title, creator, a type-appropriate meta line, a star rating where rated, an optional review snippet, and tags, with item actions (move/add shelf, review) in an accessible control set, conveying status/rating by text and icon rather than color alone.
  - _Requirements: 8.1, 8.3, 1.3, 13.5_
- [x] 8.2 (P) Media-type filter with counts
  - Provide a media-type filter with an "All" option plus one option per present type, each with a count, defaulting to "All", driven by the data without per-type branching.
  - _Requirements: 8.2, 8.4_

- [x] 9. Redesigned Home dashboard
- [x] 9.1 (P) Header and live stat cards
  - Present a greeting header and a row of stat cards for the reading goal, total pages read, current streak, and items in progress, matching the reference composition, with progress bars and captions on the goal and pages-read cards, fed by live data.
  - _Requirements: 7.1, 7.3, 3.3, 4.2, 5.2_
- [x] 9.2 (P) Achievements section
  - Present unlocked and in-progress achievements with the unlocked count, in the new design.
  - _Requirements: 7.2, 6.3_
- [x] 9.3 Retain the community feed within the new dashboard
  - Keep the existing community feed on Home, restyled, wired to live data alongside the stats and achievements (no placeholder values).
  - _Requirements: 7.4, 7.5_

- [x] 10. Section pages, add-item flow, and auth surface
- [x] 10.1 (P) Library page
  - Present the signed-in user's collection across all media types with the media-type filter, type/status indicators, and per-item actions, preserving existing shelf/status behavior.
  - _Requirements: 11.1_
- [x] 10.2 (P) Wishlist page
  - Present the user's wishlist items with actions to move them along their shelves.
  - _Requirements: 11.2_
- [x] 10.3 (P) Reviews page
  - Present the user's reviewed items with ratings and review text, and allow editing a review.
  - _Requirements: 11.3_
- [x] 10.4 Add-item flow and route reorganization
  - Provide an add-item flow reachable from the primary action that supports both custom items of any type (capturing type-specific fields and tags) and items discovered from the seeded catalog; reorganize the prior Catalog/Shelves capability into the new IA via redirects so no destination or capability is lost.
  - _Requirements: 11.4, 11.7, 1.2, 2.3_
- [x] 10.5 (P) Profile surface
  - Restyle the profile surface (editable profile fields and media preferences), reachable from the brand bar, to the new design.
  - _Requirements: 11.5_
- [x] 10.6 (P) Auth pages
  - Restyle the login and registration pages without the signed-in shell, presenting validation and request errors accessibly.
  - _Requirements: 11.6_

- [x] 11. Cross-cutting responsiveness and accessibility
- [x] 11.1 Responsive layout across surfaces
  - Ensure every surface is usable and correctly laid out from mobile to desktop, with navigation and card grids reflowing without horizontal scrolling or clipped controls and comfortably tappable targets at mobile widths.
  - _Requirements: 12.1, 12.2, 12.3_
- [x] 11.2 Accessibility conformance
  - Verify accessible semantics and active-navigation indication, WCAG 2.1 AA contrast in both themes, full keyboard operability with visible focus, honoring reduced-motion preferences, and conveying status/rating/achievement/progress by text/semantics rather than color alone.
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 12. Integration, isolation, and quality gate
- [x] 12.1 Integration tests for new data and endpoints
  - Cover tags/progress/goals/achievement-unlock behavior including per-user isolation (cross-user writes rejected), idempotent goal upsert and unlock insertion, and stats reflecting progress, against a migrated database.
  - _Requirements: 14.3, 15.1, 15.3_
- [x] 12.2 Regression and architecture/quality verification
  - Confirm existing routes, access gating, auth/session/middleware, per-user authorization, and server/client boundaries are preserved; existing e-book data and endpoint contracts still work; the project type-checks and builds, the suite passes, no `any` is introduced, and no unsafe HTML rendering is added.
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 14.5_
- [x]* 12.3 UI rendering tests for the redesign
  - Add deferrable UI tests asserting the shell active-state and mobile reflow, the media card anatomy and accessible actions, the typed filter with counts/default, and the Home dashboard rendering live stat cards, achievements count, and feed in both themes.
  - _Requirements: 7.1, 7.2, 8.1, 8.2, 10.2, 12.2, 13.5_
