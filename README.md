# LibraryLoop

A consumer-focused **digital library** for tracking the media you consume — **e-books, music, podcasts, and TV/movies** — in one place. Organize items with shelves (Wishlist / In progress / Completed) and free-form tags, record consumption progress, rate and review, and stay motivated with reading **goals, activity streaks, and achievements**. The Home page is a live dashboard of your stats and achievements alongside a community activity feed; the app is organized as **Home · Library · Wishlist · Reviews** (plus Profile).

Built with **Next.js 15 (App Router) + React 19 + TypeScript** (strict), **PostgreSQL** via **Drizzle ORM**, real session-based auth, and a **Tailwind v4 + shadcn/ui** design system with light/dark themes. Deploys on **Vercel** with managed Postgres.

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
   cp .env.example .env
   ```

   Use `.env` (Docker Compose and the `db:*` scripts both read it; Next.js reads it too). Required variables — validated at startup; the app fails fast if missing:

   | Variable | Purpose |
   |----------|---------|
   | `DATABASE_URL` | PostgreSQL connection string |
   | `AUTH_SECRET` | Secret for signing session cookies (`openssl rand -base64 32`) |

   Optional / feature-specific (not validated at startup):

   | Variable | Purpose |
   |----------|---------|
   | `NYT_API_KEY` | NYT Best Seller API key — the **books** provider for Trending Now (server-side only) |
   | `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Spotify app credentials (client-credentials OAuth) — the **music** provider for Trending Now (server-side only) |

   Provider keys are read only on the server; the browser never receives them, and each provider degrades independently if its key is absent (Trending Now still renders the other sources). Both are **optional** — the app boots and runs without them; that source simply shows as not configured. Obtain them from the [NYT Developer portal](https://developer.nytimes.com/) (Books API) and the [Spotify Developer dashboard](https://developer.spotify.com/dashboard) (create an app for the client id/secret). Set them the same way locally (`.env`) and on the host (project environment variables).

   `POSTGRES_*` values are read by Docker Compose for the local database.

   > **Port conflict?** If you already run Postgres on `5432`, set `POSTGRES_PORT=5433` and point `DATABASE_URL` at `...@localhost:5433/...` (both are read from `.env`).

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
| `npm run db:seed` | Load the multi-type catalog, demo goal/achievements, and demo account |

## Deployment (Vercel)

Set `DATABASE_URL` (managed Postgres, e.g. Vercel Postgres / Neon) and `AUTH_SECRET` as project environment variables.

Database migrations are applied automatically on every deploy: [`vercel.json`](vercel.json) sets the build command to `npm run db:migrate && npm run build`, so the schema is brought up to date (against the build-time `DATABASE_URL`) before the app is built.

## Specs & steering

Spec-driven development docs live under [.sdd/specs/](.sdd/specs/) — `home-feed` and `media-platform-v2` are shipped; `nyt-recommendations` is planned. Project-wide steering (product, tech, structure, workflow) lives under [.sdd/steering/](.sdd/steering/) and is loaded as project memory. The original browser-only prototype is preserved in [legacy/](legacy/) for reference.
