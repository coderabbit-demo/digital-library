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

## Deploy to Vercel

The app is built for Vercel: the database client detects the serverless runtime (single pooled connection, `prepare: false`), session/OAuth cookies become `secure` in production, and [`vercel.json`](vercel.json) sets the build command to `npm run db:migrate && npm run build` so **migrations apply automatically on every deploy** before the build.

1. **Provision Postgres.** Vercel doesn't include one (the bundled pglite is tests-only). Create a managed database — [Neon](https://neon.tech), [Supabase](https://supabase.com), or Vercel Postgres — and copy its connection string. Most providers' pooled URL works for both build-time migrations and runtime here; if `db:migrate` errors on the pooler, use the direct/session URL instead (pool size is 1 per instance, so connection count stays low).

2. **Generate secrets.** `AUTH_SECRET` via `openssl rand -base64 32`. Rotate any provider keys that have been shared outside the host.

3. **Import the repo** into Vercel (New Project → import the Git repo). The framework auto-detects as Next.js; leave the build command to `vercel.json`. Set the deployment **region** near your database.

4. **Set environment variables** (Project → Settings → Environment Variables, Production scope):

   | Variable | Required? | Purpose |
   |----------|-----------|---------|
   | `DATABASE_URL` | **Yes** (build + runtime) | Managed Postgres connection string |
   | `AUTH_SECRET` | **Yes** | Session/OAuth-state cookie signing |
   | `TMDB_API_KEY` | Movies/TV | TMDB — movie/TV trending, search, and detail enrichment |
   | `GOOGLE_BOOKS_API_KEY` | Books | Google Books — book metadata and ratings enrichment |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google sign-in | OAuth 2.0 Web client credentials |
   | `GOOGLE_REDIRECT_URI` | Google sign-in | `https://<your-domain>/auth/google/callback` |
   | `NYT_API_KEY` | Trending books | NYT Best Seller API |
   | `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Trending music | Spotify client-credentials OAuth |

   Only `DATABASE_URL` and `AUTH_SECRET` are validated at startup (the app fails fast without them); every provider key is optional and degrades independently if absent.

5. **Register the Google redirect URI.** In Google Cloud Console → Credentials → your OAuth client, add `https://<your-domain>/auth/google/callback` as an Authorized redirect URI — it must match `GOOGLE_REDIRECT_URI` exactly.

6. **Deploy.** The build runs `db:migrate` then `next build`; type and lint errors fail the build by design. The schema (including the movie/TV backfill) is applied against the build-time `DATABASE_URL`.

7. **Seed (optional, one-time).** `db:seed` loads demo data **and clears the seeded tables first**, so it is not part of the build. To populate the demo catalog/community feed once, run it manually against the production database: `DATABASE_URL=<prod-url> npm run db:seed`. Skip it for a clean production catalog.

> **Preview deployments:** a Preview build also runs `db:migrate`. To keep previews from mutating the production database, scope `DATABASE_URL` to Production only (or point Preview at a separate database).

## Specs & steering

Spec-driven development docs live under [.sdd/specs/](.sdd/specs/) — `home-feed` and `media-platform-v2` are shipped; `nyt-recommendations` is planned. Project-wide steering (product, tech, structure, workflow) lives under [.sdd/steering/](.sdd/steering/) and is loaded as project memory. The original browser-only prototype is preserved in [legacy/](legacy/) for reference.
