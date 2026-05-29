# Research & Design Decisions

## Summary
- **Feature**: `media-platform-v2`
- **Discovery Scope**: Extension (existing Next.js + Postgres/Drizzle app) with a sizeable additive surface — new domain features + a full design-system swap. Integration-focused (light) discovery, escalated for the styling-framework introduction.
- **Key Findings**:
  - The app has **no CSS framework today** — styling is hand-authored plain CSS classes in `src/app/globals.css` (ported from the prototype). Introducing Tailwind v4 + shadcn/ui is a net-new dependency + build-config change, not a migration off an existing framework.
  - shadcn/ui now ships **first-class Tailwind v4 + React 19 + Next.js 15** support with a **CSS-first** config (`@theme inline`, OKLCH tokens, `data-slot` styling, no `tailwind.config.js` required). The reference's tokens are already OKLCH/hex — they drop into `@theme` directly.
  - The data model was deliberately built to extend: `media_items.type` is an **open string set** (default `ebook`), the DAL takes a `DbExecutor` so new helpers compose inside transactions, and domain/API types are centralized in `src/lib/types`. New features attach **additively** (new tables + nullable columns) with **zero rewrite** of existing e-book rows or endpoints.

## Research Log

### Tailwind v4 + shadcn/ui on Next.js 15 / React 19
- **Context**: Requirement 9 mandates adopting Tailwind v4 + shadcn/ui with the reference's tokens (light + dark). The current app uses no utility framework, so we must confirm the toolchain integrates cleanly with our exact versions (Next 15.1.6, React 19.0, TS 5.7).
- **Sources Consulted**:
  - Tailwind CSS — Next.js install guide & v4 release notes (`tailwindcss.com/docs/guides/nextjs`, `/blog/tailwindcss-v4`).
  - shadcn/ui — Tailwind v4 and React 19 docs (`ui.shadcn.com/docs/tailwind-v4`, `/docs/react-19`).
- **Findings**:
  - v4 PostCSS plugin lives in a dedicated `@tailwindcss/postcss` package; install `tailwindcss @tailwindcss/postcss postcss`, add a `postcss.config.mjs`, and `@import "tailwindcss";` in the global stylesheet. `postcss-import`/`autoprefixer` are no longer needed.
  - v4 is **CSS-first**: design tokens are declared in CSS via `@theme`/`@theme inline` rather than a JS config. shadcn reads tokens as CSS variables and converts HSL→OKLCH; our reference tokens are already hex/OKLCH.
  - shadcn primitives are React 19-ready (forwardRef removed, `data-slot` attributes); the CLI (`components.json`) scaffolds primitives into `src/components/ui`. Components are copied into the repo (not a runtime dep), so they live under our existing TS/lint rules.
- **Implications**: Add Tailwind v4 + PostCSS config and a `components.json`; replace the hand-written rules in `globals.css` with `@import "tailwindcss";` + an `@theme inline` block carrying the reference tokens and a `.dark` override. shadcn primitives need Radix UI peer deps (`@radix-ui/*`) plus `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` for icons. All are MIT-licensed and React 19-compatible.

### Existing architecture & extension points
- **Context**: Requirements 14–15 require additive, non-breaking schema/DAL/API changes that preserve auth/session/middleware, server/client boundaries, and contracts.
- **Sources Consulted**: `src/db/schema.ts`, `src/db/queries.ts`, `src/db/seed.ts`, `src/lib/types/*`, `src/app/api/**`, `src/lib/auth/current-user.ts`, `src/components/**`, `src/app/(app)/**`.
- **Findings**:
  - **Schema**: `media_items.type` defaults `ebook` and is unconstrained; `library_entries` is the per-user join (status/rating/review) with a unique `(userId, mediaItemId)`. No tags/progress/goals/achievements tables exist yet.
  - **DAL**: every helper takes `DbExecutor` (works against `Db` or a `tx`); mappers convert rows→domain types. Adding helpers is purely additive.
  - **API**: Route Handlers follow a fixed shape — `getSessionUser()` gate → `request.json()` → pure validator (`validateX`) → DAL inside `db.transaction` when writing activity → typed `NextResponse<T | ApiError>`. `runtime = "nodejs"`.
  - **UI/shell**: `(app)/layout.tsx` is a server component that re-validates the session and renders `AppNav` + `<main>`; nav is data-driven via `NAV_ITEMS` + `isNavItemActive`. Pages are server components that read via the DAL and pass plain props to small client components for mutations.
  - **Computed views** already exist as pure, tested helpers: `home-stats` (currently mock), `media-type`, `library-view`, `catalog-view`. These are the natural seams to make live.
- **Implications**: New tables/columns added via a new Drizzle migration; new DAL helpers added alongside existing ones; new Route Handlers mirror the existing shape; the nav model is relabeled and extended via `NAV_ITEMS`; `home-stats` becomes a live aggregation. No existing function signature changes.

### Type-specific media metadata representation
- **Context**: Requirement 1 needs per-type fields (music album, podcast episode count, etc.) without breaking e-book rows or rewriting the open `type` field (1.4).
- **Findings/Decision**: Keep the existing flat columns (`title`, `creator`, `genre`, `language`, `description`, `coverTheme`) as the **shared spine** — `creator` already generalizes to author/artist/show, `genre` to category. Add a single nullable `metadata jsonb` column for the **type-specific extras** (e.g. `{ album }`, `{ episodeCount }`, `{ runtimeMinutes }`), typed in TS via a discriminated union keyed on `type`. Add a nullable `totalUnits integer` (total pages/episodes/runtime) to support progress.
- **Rationale**: A jsonb side-channel keeps the change additive (existing rows get `NULL`/`{}`), avoids a wide sparse table, and the open `type` set is preserved. Type safety is recovered at the boundary by validating jsonb into the discriminated union.

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Additive extension of current layered app (chosen) | New tables/columns + new DAL helpers + new Route Handlers + shadcn UI layer, atop existing structure | Non-breaking, preserves all contracts/boundaries, smallest blast radius, matches steering of the existing code | Two visual systems coexist briefly during cutover | Aligns with Req 14–15 |
| Tag/progress on a new normalized side table vs columns | Tags as `library_entry_tags`; progress as nullable columns on `library_entries` | Tags become user-scoped + queryable; progress stays on the per-user row | One extra table | Chosen — see decisions |
| Achievements fully computed vs persisted | Compute unlock state on read vs store unlocked rows | Persisting captures the **achieved date** (Req 6.2) and is cheap to read | Need a write path when a condition is first met | Hybrid chosen: definitions in code, unlocks persisted |
| Rewrite to a UI kit / CSS-in-JS | Replace styling wholesale with a different system | — | Violates "adopt Tailwind v4 + shadcn" decision; larger risk | Rejected |

## Design Decisions

### Decision: Adopt Tailwind v4 + shadcn/ui with CSS-first tokens
- **Context**: Req 9 — encode the reference design system; the app has no framework today.
- **Alternatives Considered**: (1) Hand-extend the existing plain CSS; (2) Tailwind v3 + classic config; (3) Tailwind v4 + shadcn (CSS-first).
- **Selected Approach**: Tailwind v4 via `@tailwindcss/postcss`, tokens in `globals.css` under `@theme inline` + `.dark`, shadcn primitives scaffolded into `src/components/ui` via `components.json`.
- **Rationale**: Directly matches the confirmed decision and the reference (which is itself shadcn + Tailwind v4); CSS-first means our extracted OKLCH/hex tokens are the source of truth with no JS config drift.
- **Trade-offs**: Adds Radix/CVA/lucide deps and a build-config change; replaces the prototype CSS. Worth it for 1:1 fidelity and maintainability.
- **Follow-up**: Verify `next build` + `tsc` + `vitest` stay green after the framework lands; ensure `prefers-color-scheme` + a `.dark` toggle both work; keep `dangerouslySetInnerHTML` out (Req 15.4).

### Decision: User-scoped tags on the library entry
- **Context**: Req 2 — free-form tags shown on the user's cards; Req 14.3 — per-user authorization.
- **Selected Approach**: New `library_entry_tags(entry_id, tag)` table, unique on `(entry_id, tag)`, cascading from `library_entries`. Tags are read/written only for the acting user's own entries.
- **Rationale**: `media_items` are shared across users; putting tags on the **entry** keeps them private and per-user, and avoids cross-user leakage. Normalized table keeps tags queryable and cleanly typed (`string[]` in the DTO).
- **Trade-offs**: A join on read; mitigated by aggregating tags per entry in the DAL.
- **Follow-up**: Cap tag count/length at the validator; trim + de-dupe; lowercase for stable matching.

### Decision: Goals table; streaks & achievements computed from activity
- **Context**: Req 4 (goals), 5 (streaks), 6 (achievements), all per-user and live (Req 7.5).
- **Selected Approach**:
  - `goals(user_id, period, period_key, target_count, created_at)` — one active goal per user+period (`period` e.g. `year`, `period_key` e.g. `2026`); progress computed from finished entries.
  - **Streaks** derived purely from `activities.created_at` (distinct active days) — no new table.
  - **Achievements**: a **static definition catalog in code** (key, title, description, predicate over the user's stats), plus a persisted `user_achievements(user_id, achievement_key, achieved_at)` recording first unlock. Read path computes in-progress vs unlocked; a write path inserts a row the first time a predicate is satisfied.
- **Rationale**: Minimizes schema; captures the achieved date durably; keeps unlock rules versioned in code and testable as pure functions.
- **Trade-offs**: Unlock evaluation must run on the relevant write paths (e.g. after finishing/reviewing). Acceptable — evaluation is cheap and idempotent (`on conflict do nothing`).
- **Follow-up**: Decide trigger points (after library upsert/review/progress writes); ensure idempotent inserts.

### Decision: Reference IA via new routes; preserve old destinations by redirect
- **Context**: Req 10–11 — nav = Home / Library / Wishlist / Reviews (+ Profile from brand bar); Req 10.4 / 11.4 — preserve existing destinations and Catalog/Shelves capability.
- **Selected Approach**: New routes `/library`, `/wishlist`, `/reviews`; keep `/profile`. `/shelves` and `/catalog` become **redirects** (`/shelves → /library`); catalog **discovery** capability is preserved inside the "+ Add Item" dialog (search catalog + add custom), so no capability is lost. Nav stays data-driven via `NAV_ITEMS`.
- **Rationale**: Matches the reference IA while honoring "no lost destinations"; redirects keep any existing links/bookmarks working.
- **Trade-offs**: Slight indirection for catalog browsing (now a dialog/section rather than a top-level tab) — matches the reference which has no Catalog tab.
- **Follow-up**: Confirm middleware/route gating still covers the new paths; `aria-current` on the active tab.

## Risks & Mitigations
- **Framework swap regresses styling/build** — Land Tailwind/shadcn behind the same green-gate (build + typecheck + vitest) before restyling surfaces; restyle surface-by-surface.
- **Two design systems during cutover** — Keep the prototype CSS until each surface is migrated, then delete; avoid mixing class systems on one component.
- **jsonb metadata loses type safety** — Validate jsonb into a discriminated union at the DAL/validator boundary; never read raw `any`.
- **Achievement writes on read paths** — Restrict unlock persistence to write handlers (post-mutation), keep read paths pure; idempotent inserts.
- **Per-user data leakage in new endpoints** — Every new handler derives the user from the session and scopes reads/writes to that id (Req 14.3); add integration tests asserting cross-user isolation.
- **Dark-mode contrast (Req 13.2)** — Tokens come straight from the reference; verify AA contrast for status/rating/achievement text in both themes; never rely on color alone (Req 13.5).

## References
- [Tailwind CSS — Next.js install](https://tailwindcss.com/docs/guides/nextjs) — v4 PostCSS setup.
- [Tailwind CSS v4.0 release](https://tailwindcss.com/blog/tailwindcss-v4) — CSS-first `@theme`, OKLCH.
- [shadcn/ui — Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4) — token model, `data-slot`.
- [shadcn/ui — Next.js 15 + React 19](https://ui.shadcn.com/docs/react-19) — compatibility.
- `design-reference.md` (this spec) — extracted tokens + layout notes from the reference app.
