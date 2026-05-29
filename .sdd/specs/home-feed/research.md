# Research & Design Decisions

## Summary
- **Feature**: `home-feed`
- **Discovery Scope**: Complex Integration (re-platform: vanilla-JS client → full-stack TypeScript Next.js + Postgres + Docker, plus the routed Home/Shelves/Catalog/Profile UI)
- **Key Findings**:
  - The prototype ([src/app.js](../../../src/app.js)) is the **behavioral and data-model reference**: accounts, media items (`type`, title, creator, genre, language, coverTheme), library entries (status/rating/review), activities (action/detail/createdAt), community users, and nested preferences. These map cleanly onto a normalized Postgres schema and typed API.
  - **Next.js App Router** subsumes the previously hand-rolled History-API router: file-based routes give clean URLs, deep-linking, and back/forward natively; Route Handlers under `app/api/**` provide the backend in the same project, which is the canonical Vercel full-stack shape.
  - **Vercel + serverless Postgres** has a connection-pooling pitfall: classic TCP Postgres clients exhaust connections under serverless concurrency. The supported pattern is a serverless/HTTP Postgres driver (Vercel Postgres / Neon serverless driver) with **Drizzle ORM**, or pooling (PgBouncer). This is the dominant architectural risk and is addressed explicitly.

## Research Log

### Existing prototype as behavioral reference
- **Context**: Re-implement, not line-migrate, the prototype in TS/React while preserving behavior.
- **Sources Consulted**: [src/app.js](../../../src/app.js), [src/styles.css](../../../src/styles.css), [docs/specs/ebooks-mvp.md](../../../docs/specs/ebooks-mvp.md).
- **Findings**: Entities and flows are well-defined; recommendation scoring is **out of scope** (owned by `nyt-recommendations`); the feed already orders desc and skips unresolved entries; preferences are nested per media type. Visual language (brand, avatars, pills, cover themes, color tokens) lives in `styles.css` and can be ported as global CSS to bootstrap the UI before the later re-skin.
- **Implications**: Define a shared domain types module, a normalized schema, and a seed routine derived from `starterState`. UI is React components mirroring the existing sections.

### Framework selection (Next.js App Router)
- **Context**: User chose "pick the framework now"; stack is Vercel + Postgres + full-stack TS.
- **Findings**: Next.js is built/maintained by Vercel; App Router gives RSC for initial data fetch, `<Link>`/router for client nav, file-based routes (`app/(app)/shelves/page.tsx`), `not-found.tsx`, `middleware.ts` for auth gating, and Route Handlers (`app/api/**/route.ts`) for the backend — satisfying Requirements 2, 7, 8 without a separate server. React 19 + Next 15 are the current line.
- **Implications**: The manual `pushState`/`popstate` router from the prior design is removed; routing requirements are met natively. Auth gating is centralized in `middleware.ts` plus per-handler checks.

### Data access on serverless: Drizzle + serverless Postgres driver
- **Context**: Choose ORM/driver that is TS-first and safe under Vercel serverless concurrency.
- **Sources Consulted**: Vercel Postgres / Neon serverless driver guidance; Drizzle ORM docs (knowledge); connection-pooling best practices for serverless.
- **Findings**:
  - **Drizzle ORM**: TS-native, schema-as-code with inferred types (no codegen runtime), SQL-like queries, `drizzle-kit` for versioned migrations. Pairs with the Neon/Vercel HTTP driver for serverless and with `node-postgres` for local Docker Postgres.
  - Long-lived TCP pools per function instance can exhaust Postgres connections; mitigate with the HTTP/serverless driver in production (no persistent socket) and a small pool locally.
- **Implications**: Schema in `db/schema.ts`; types inferred via `InferSelectModel`/`InferInsertModel`; migrations in `db/migrations`; driver chosen per environment via env config. Alternative considered: Prisma (mature, but adds a generate step and a heavier client; Drizzle is lighter and more directly typed).

### Authentication approach
- **Context**: Replace plaintext/localStorage with real auth (Req 9), and stay ready for a **Google SSO release** announced for a later iteration.
- **Findings**: Two viable paths — (a) **Auth.js (NextAuth v5)** Credentials + Drizzle adapter; (b) a **custom DB-backed session**: `bcrypt` password hashing + an opaque random session token stored (hashed) in a `sessions` table, delivered via an `HttpOnly; Secure; SameSite=Lax` cookie, validated in `middleware.ts` and Route Handlers. A stateless `jose` JWT was initially considered but cannot be truly revoked on sign-out (the token stays valid until expiry), conflicting with Req 9.5.
- **Implications**: Selected the **custom DB-backed session**. Hash passwords with bcrypt (cost ≥ 12) stored in a separate `auth_identities` table; create a `sessions` row on login and delete it on logout for genuine revocation. Per-user authorization derives `userId` from the verified session only, never the request body. This is smaller and more transparent than Auth.js while satisfying revocation.

### Schema integrity and SSO-readiness (design-review follow-up)
- **Context**: Design review flagged (1) a polymorphic `activities.user_id` that referenced both accounts and a separate `community_users` table (no valid FK), and (2) the stateless-JWT revocation gap. The user also directed the schema be redone with Google SSO coming in a later release.
- **Findings**:
  - **Unify actors**: collapse accounts and community users into one `users` table with a `kind` discriminator (`member` | `community`). `library_entries`/`activities` then carry real FKs to `users`; community seed activity resolves via a normal join with full referential integrity. `email` is nullable-unique (community actors have none; Postgres allows multiple NULLs under UNIQUE).
  - **Separate credentials for SSO**: move password hashes out of `users` into an `auth_identities` table (`user_id`, `provider`, `provider_account_id`, `password_hash`), unique on `(provider, provider_account_id)`. Password login = `provider="password"`; the future Google login = `provider="google"` with the Google `sub`, NULL hash. Community users have zero identities. Adding Google requires **no `users` change** — only a new identity row + a callback route, reusing the existing `sessions` machinery.
  - **Revocable sessions**: `sessions` table keyed by a SHA-256 hash of an opaque cookie token; logout deletes the row.
- **Implications**: Fixes both review issues and front-loads the SSO data model so the later release is additive. Drizzle schema gains `users`, `auth_identities`, `sessions`, `preferences`, `media_items`, `library_entries`, `activities`.

### Docker for local development; Vercel for production
- **Context**: Req 11/12 — Docker local, Vercel + managed Postgres prod.
- **Findings**: `docker-compose.yml` with a `postgres:16` service and a named volume gives consistent local DB; an optional `app` service can run `next dev`. Production does not run the app container on Vercel (Vercel builds the Next app); production Postgres is managed (Vercel Postgres/Neon). Migrations run via `drizzle-kit migrate` locally and as a deploy/build step in CI/Vercel.
- **Implications**: Two DB targets via `DATABASE_URL`; local driver = `node-postgres`, prod driver = serverless/HTTP. `.env.example` documents `DATABASE_URL` and `AUTH_SECRET`. README documents `docker compose up`, migrate, seed, and Vercel env setup.

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Next.js full-stack on Vercel (selected) | App Router UI + Route Handlers API + Drizzle/Postgres | One project, native routing, RSC data fetch, canonical Vercel shape | Serverless DB connection management; learning curve vs prototype | Matches all four user decisions |
| SPA (React/Vite) + separate API server | Decoupled front/back | Clear separation | Two deploys, more infra, not what Vercel optimizes; contradicts "fold into home-feed" | Rejected |
| Keep vanilla TS + History router + thin API | Minimal change | Smallest diff | User chose "pick framework now" and full backend; would be throwaway | Rejected |
| Prisma instead of Drizzle | Mature ORM | Great DX, ecosystem | Codegen step, heavier client on serverless | Viable alternative; Drizzle preferred for TS-first + lightness |

## Design Decisions

### Decision: Next.js App Router replaces the hand-rolled router
- **Context**: Requirement 2 (routing/nav/deep-link/back-forward).
- **Selected Approach**: File-based routes under an authenticated route group; `<Link>` for nav; `middleware.ts` redirects unauthenticated users to `/login`; `not-found.tsx` for unknown paths.
- **Rationale**: Eliminates custom routing code and satisfies deep-link/refresh/back-forward natively; no SPA fallback config needed (the prior `vercel.json` rewrite is obsolete).
- **Trade-offs**: Adopts framework conventions/build step (intended).
- **Follow-up**: Confirm active-link styling via `usePathname`.

### Decision: Server-fetched data via RSC, mutations via Route Handlers
- **Context**: Requirements 4, 7, 8 — feed/pages read data; actions write data.
- **Selected Approach**: Page-level data (feed, shelves, catalog, profile) fetched in Server Components calling the typed data layer directly; interactive mutations (add-to-shelf, save review, profile save, filter) call Route Handlers (`/api/**`) from client components, then refresh/revalidate.
- **Rationale**: Fast first paint, secure (DB access server-side), shared types across boundary (8.5).
- **Trade-offs**: Mixing server/client components requires care about the boundary.
- **Follow-up**: Decide revalidation strategy (router refresh vs `revalidatePath`).

### Decision: Custom session auth (bcrypt + jose cookie)
- See "Authentication approach" above. Per-user authorization derives `userId` from the verified session only.

### Decision: Stats panel remains mock, structured for Goals
- **Context**: Requirement 3.7/3.8 — counters/stats/Goals are explicitly mock this slice.
- **Selected Approach**: A typed `HomeStats` shape with placeholder values and a reserved Goals slot, rendered by a `StatsPanel` component; real aggregation deferred.
- **Rationale**: Avoids premature DB aggregation work; keeps layout stable for later build-out.

## Risks & Mitigations
- **Serverless Postgres connection exhaustion** — use the HTTP/serverless driver (Vercel Postgres/Neon) in production; small pool locally; never open a pool per request.
- **Secrets leakage** — `AUTH_SECRET`/`DATABASE_URL` only in env; `.env*` gitignored; `.env.example` committed; fail-fast validation at startup (12.5).
- **Auth bypass via client-supplied IDs** — always derive `userId` from the verified session; validate ownership in every handler (8.4, 9.7).
- **Migration drift between local and prod** — single migrations source run in both via drizzle-kit; deploy step applies migrations (12.4).
- **Scope creep / throwaway UI over-investment** — port existing CSS as-is; keep components thin; defer re-skin (per user).
- **`nyt-recommendations` spec references the old stack** — that spec must be realigned to a Next.js route + `/api/recommendations` Route Handler reading `NYT_API_KEY`; flagged as follow-up (out of scope here).

## References
- [Next.js App Router documentation](https://nextjs.org/docs/app) — routing, Route Handlers, middleware, RSC.
- [Vercel Postgres / storage](https://vercel.com/docs/storage/vercel-postgres) — managed Postgres + serverless driver.
- [Drizzle ORM documentation](https://orm.drizzle.team/docs/overview) — schema, type inference, drizzle-kit migrations.
- [Vercel vercel.json configuration](https://vercel.com/docs/project-configuration/vercel-json) — prior SPA-rewrite approach, now obsolete under Next.js.
