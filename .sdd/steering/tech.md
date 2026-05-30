# Technology Stack

## Architecture

Server-first **Next.js App Router** monolith. Server Components read data through a typed **data-access layer (DAL)**; Client Components mutate via **Route Handlers** (`/api/*`). A thin edge **middleware** gates routes by session cookie; the server is the authority via `getSessionUser()`. Persistence is **PostgreSQL via Drizzle ORM**. The layers are: UI (server/client components + shadcn primitives) → domain helpers (pure) → DAL (Drizzle) → Postgres.

## Core Technologies

- **Language**: TypeScript 5.7 (strict).
- **Framework**: Next.js 15 (App Router) + React 19.
- **Runtime**: Node.js (Route Handlers run with `runtime = "nodejs"`).
- **Database**: PostgreSQL + Drizzle ORM (`drizzle-kit` migrations, `postgres.js` driver, lazy `getDb()`).
- **Styling**: Tailwind CSS v4 (CSS-first `@theme`) + shadcn/ui primitives + Radix UI + lucide-react.
- **Auth**: bcryptjs password hashing; opaque, revocable session tokens (SHA-256 hashed at rest) in an HttpOnly/SameSite=Lax/Secure cookie.

## Key Libraries

Only the ones that shape patterns: `drizzle-orm` + `drizzle-kit`, `postgres`, `bcryptjs`, `class-variance-authority` / `clsx` / `tailwind-merge` (the `cn()` helper), `@radix-ui/*`, `lucide-react`, `dotenv` (db scripts only). Tests: `vitest`, `@testing-library/react`, `@electric-sql/pglite`.

## Development Standards

### Type Safety
- `strict` + `noUncheckedIndexedAccess` + `noImplicitOverride`. **Never use `any`** (incl. `as any`); prefer precise types, generics, and discriminated unions. Validate untrusted input into typed shapes at the boundary.
- Domain & API contracts live in `src/lib/types` and are the single source of truth for server and client.

### Data Access
- **Drizzle query builder only** — no string-concatenated SQL. Every DAL function takes a `DbExecutor` so it composes inside `db.transaction(...)`.
- Schema changes are **additive and non-breaking** (new tables / nullable columns), shipped as checked-in versioned migrations that apply on deploy.

### Security
- Every endpoint and server read derives the user from the **session only** and scopes reads/writes to that user's rows. Secrets stay in env. No `dangerouslySetInnerHTML`; user content is rendered as text.

### Code Quality & Testing
- Gates (all must stay green): `npm run typecheck`, `npm test`, `npm run build`.
- **Vitest** with jsdom; integration tests run against **pglite** (in-process Postgres) with the committed migrations applied — no Docker needed in CI. Add tests for new behavior; never weaken assertions.

## Development Environment

### Common Commands
```bash
# Local DB:   docker compose up -d  (Postgres on :5433)
npm run db:migrate   # apply migrations  (drizzle-kit)
npm run db:seed      # demo data; login ava@example.com / readmore
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit
npm test             # vitest run
npm run build        # next build
```

### Gotchas
- `drizzle-kit`/`tsx` don't auto-load `.env*`; the db scripts import `src/db/load-env.ts` (dotenv) for this. `db:generate` needs `DATABASE_URL` set even though it runs offline.
- npm cache can be root-owned — install with `--cache /tmp/dl-npm-cache` if you hit `EACCES`.
- After moving files, re-run typecheck/build so `.next/types` regenerate.

## Key Technical Decisions

- **Open media-type set**: `media_items.type` is an unconstrained string (default `ebook`) so new types need no schema change; type-specific extras live in a validated `metadata` jsonb + the `MediaItemMetadata` union.
- **SSO-ready auth**: credentials are split into `auth_identities` (provider `password` now, `google` later) separate from `users`.
- **CSS-first design system**: reference tokens (light + dark, OKLCH) declared via Tailwind v4 `@theme inline`; dark mode follows OS preference. Components draw only from the shared token system.
- **Deploy**: Vercel; build runs `npm run db:migrate && npm run build` so migrations apply on release.

---
_Document standards and patterns, not every dependency._
_Last updated: 2026-05-29_
