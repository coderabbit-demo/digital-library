# LibraryLoop

Full-stack app for tracking digital media consumption. The first implemented slice focuses on e-books: a Home page with a community activity feed, plus Shelves, Catalog, and Profile.

Built with **Next.js (App Router) + React + TypeScript**, **PostgreSQL** via **Drizzle ORM**, and real authentication. Deploys on **Vercel** with managed Postgres.

## Prerequisites

- Node.js 20+ and npm
- Docker (for the local PostgreSQL database)

## Local development

1. **Install dependencies**

   ```sh
   npm install
   ```

2. **Configure environment** — copy the example and fill in values:

   ```sh
   cp .env.example .env.local
   ```

   Required variables — validated at startup; the app fails fast if missing:

   | Variable | Purpose |
   |----------|---------|
   | `DATABASE_URL` | PostgreSQL connection string |
   | `AUTH_SECRET` | Secret for signing session cookies (`openssl rand -base64 32`) |

   Optional / feature-specific (not validated at startup):

   | Variable | Purpose |
   |----------|---------|
   | `NYT_API_KEY` | NYT Best Seller API key; required only by the recommendations feature, which validates it on use |

   `POSTGRES_*` values are read by Docker Compose for the local database.

3. **Start the database** (data persists in a Docker volume):

   ```sh
   docker compose up -d
   ```

4. **Apply migrations and seed starter data**:

   ```sh
   npm run db:migrate
   npm run db:seed
   ```

5. **Run the app**:

   ```sh
   npm run dev
   ```

   Open `http://localhost:3000`. The seeded demo account is `ava@example.com` / `readmore`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Run the app in development |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | Type-check (build also fails on type errors) |
| `npm test` | Run the test suite (Vitest) |
| `npm run db:generate` | Generate a Drizzle migration from the schema |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Load starter catalog and demo data |

## Deployment (Vercel)

Set `DATABASE_URL` (managed Postgres, e.g. Vercel Postgres / Neon) and `AUTH_SECRET` as project environment variables.

Database migrations are applied automatically on every deploy: [`vercel.json`](vercel.json) sets the build command to `npm run db:migrate && npm run build`, so the schema is brought up to date (against the build-time `DATABASE_URL`) before the app is built.

## Specs

Spec-driven development docs live under [.sdd/specs/](.sdd/specs/). The original prototype is preserved in [legacy/](legacy/) for reference.
