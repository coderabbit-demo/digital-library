# Project Structure

## Organization Philosophy

**Layered, server-first, with App Router route groups.** Code is grouped by architectural role (routes, components, domain logic, data) and, within components, by feature domain. Pure logic is separated from I/O so it's unit-testable without a database. New code that follows these patterns shouldn't require steering updates.

## Directory Patterns

### App routes
**Location**: `src/app/`
**Purpose**: Route-group `(app)/` holds the authenticated shell + pages (Home, Library, Wishlist, Reviews, Profile); `(auth)/` holds login/register (no signed-in shell). `app/api/*/route.ts` are the Route Handlers. `layout.tsx` composes the shell; `middleware.ts` gates routes.
**Pattern**: Pages are **async Server Components** that read via the DAL and pass plain props to small Client Components for interaction. Old routes that move are preserved with `redirect()` (e.g. `/shelves`→`/library`).

### Components
**Location**: `src/components/`
**Purpose**: `ui/` = design-system primitives (shadcn-style, no business logic); the rest are grouped by domain (`nav/`, `home/`, `library/`, `profile/`). A component is a Client Component (`"use client"`) only when it needs hooks/interactivity.

### Domain logic & data
**Location**: `src/lib/` and `src/db/`
**Purpose**: `src/lib/*` = pure helpers (stats, goals, streaks, achievements, media-metadata, tags, validation) + `auth/`, `api/`, `types/`. `src/db/*` = `schema.ts`, `queries.ts` (the DAL), `mappers.ts`, `client.ts` (`Db`/`DbExecutor`/`getDb`), `migrations/`, `seed*.ts`, `test-db.ts` (pglite).

## Naming Conventions

- **Design-system primitives** (`components/ui/`): lowercase files (`button.tsx`, `card.tsx`) exporting `PascalCase` components — shadcn convention.
- **Feature components**: `PascalCase` files and components (`MediaCard.tsx`, `AppNav.tsx`).
- **lib/db modules & helpers**: `kebab-case` files (`media-metadata.ts`), `camelCase` functions.
- **Tests**: co-located `*.test.ts(x)` next to the unit under test.
- **DB**: `snake_case` columns/tables in SQL; `camelCase` in Drizzle/TS; row types exported as `XRow`.

## Import Organization

```typescript
import { Button } from "@/components/ui/button";  // absolute via alias
import { toUser } from "./mappers";                // relative within a module group
```

**Path Aliases**:
- `@/` → `src/`

## Code Organization Principles

- **Server/Client boundary is explicit**: data fetching and session checks happen in Server Components / Route Handlers; client components receive props and call the API. Don't import server-only modules (db, auth) into client components.
- **DAL is the only path to the database**: components/handlers call `src/db/queries.ts` functions (each takes a `DbExecutor`); no Drizzle/SQL in route or component files beyond passing `getDb()`/`tx`.
- **Contracts centralized**: shared shapes come from `src/lib/types`; validators in `src/lib/api/validation.ts` normalize input; responses use the helpers in `src/lib/api/responses.ts`.
- **Pure helpers, injectable time**: domain computations (e.g. streaks) take inputs like "today" as parameters rather than calling `new Date()` internally, so they're deterministic and testable.
- **Legacy CSS is transitional**: a residual block in `globals.css` remains under the new design tokens until fully migrated; new surfaces use the token system + shadcn primitives, not legacy classes.

---
_Document patterns, not file trees. New files following these patterns shouldn't require updates._
_Last updated: 2026-05-29_
