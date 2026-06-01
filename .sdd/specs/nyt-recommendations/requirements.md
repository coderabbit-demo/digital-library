# Requirements Document

> **⚠️ Superseded by [`trending-now`](../trending-now/) (Epic DL-52).** This
> books-only "Recommendations" page was never built. Its substantive
> requirements — a plain, server-side NYT Best Seller pull with the key read
> from the environment, plus add-to-shelf — are delivered by the **NYT books
> provider** under the Trending Now multi-source feed. There is no separate
> `/recommendations` route or `/api/recommendations` endpoint; discovery lives
> at `/trending`.

## Project Description (Input)
Make the Recommendations page a live pull from the New York Times Best Seller Lists API across all genres (a plain "all lists" pull, with no profile- or history-based re-ranking for now). The page is its own route in the LibraryLoop app. Because the NYT API requires a secret key that must never be exposed to the browser, the live calls are made by a server-side endpoint that reads the key from an environment variable. The API key will be provided in an env file at implementation time. Build on the platform defined by the `home-feed` spec: a TypeScript Next.js (App Router) + React app, a backend of Next.js Route Handlers, PostgreSQL persistence via Drizzle ORM, real authentication, Docker for local development, and Vercel + managed Postgres for production.

## Introduction

This feature delivers the **Recommendations** page for LibraryLoop. Recommendations are sourced live from the **New York Times Best Seller Lists API across all genres (all lists)** rather than computed from the local catalog, profile preferences, or reading history. For this slice the pull is **plain**: best sellers are shown as returned, without re-ranking or filtering by the signed-in user's preferences.

Because the NYT API requires a secret API key that must never be shipped to the browser, all live calls are made by a **server-side Next.js Route Handler** (`/api/recommendations`) that reads the key from a server-side environment variable and returns a trimmed, typed response to the client. The browser never sees the key.

This spec **depends on** the `home-feed` spec, which establishes the TypeScript/Next.js (App Router)/React foundation, file-based routing and the persistent navigation, the authenticated route group and session middleware, the backend Route Handler conventions, the PostgreSQL schema and Drizzle data-access layer (accounts, media items, library entries, activities), the Docker-based local environment, and the Vercel + managed-Postgres deployment. This spec adds the `/recommendations` route and its navigation link, the `/api/recommendations` Route Handler, the typed NYT client, and the React page, reusing the existing LibraryLoop visual language. No additional front-end framework is introduced.

The NYT API key will be supplied in an environment file at implementation time; this spec only requires that the key be read from an environment variable and that an example env file (without the real key) be committed.

## Requirements

### Requirement 1: Recommendations route and navigation

**Objective:** As a signed-in reader, I want a dedicated Recommendations page with its own URL, so that I can browse current best sellers as a distinct section of the app.

#### Acceptance Criteria
1. The application shall define a route for Recommendations at the URL path `/recommendations`, using the Next.js App Router file-based routing established by the `home-feed` spec, within its authenticated route group.
2. The application shall add a Recommendations link to the persistent navigation introduced by the `home-feed` spec.
3. When the Recommendations route is active, the application shall render the Recommendations page as the sole primary content and shall visually indicate the Recommendations navigation link as active.
4. When the app is loaded directly at, or refreshed on, `/recommendations`, the application shall render the Recommendations page without a 404.
5. While a user is not authenticated, the application shall not render the Recommendations page or its navigation link, and shall direct the user to the authentication surface, consistent with the platform's route gating.

### Requirement 2: Live NYT Best Seller recommendations

**Objective:** As a signed-in reader, I want the Recommendations page to show current New York Times best sellers across all genres, so that recommendations are timely and authoritative rather than computed from a tiny local catalog.

#### Acceptance Criteria
1. When the Recommendations page is loaded, the application shall obtain live best-seller data sourced from the New York Times Best Seller Lists API across all genres (all lists).
2. The application shall present the best sellers as a plain pull, without re-ranking or filtering by the signed-in user's profile preferences or reading history.
3. The application shall display, for each recommended title, at least the title, author, and the best-seller list (genre) it appears on, reusing the existing LibraryLoop card visual language.
4. The Recommendations page shall group or label titles by their best-seller list (genre) so that the "all genres" breadth is visible to the reader.
5. If the same title appears on more than one best-seller list, the application shall avoid rendering it as a confusingly exact duplicate (for example, by de-duplicating or by clearly attributing each listing).
6. The browser shall obtain NYT best-seller data only through the application's own `/api/recommendations` endpoint and shall never call the NYT API directly or hold the NYT API key.

### Requirement 3: Loading, empty, and error states

**Objective:** As a signed-in reader, I want clear feedback while recommendations load or when they fail, so that the page never appears broken or frozen.

#### Acceptance Criteria
1. While best-seller data is being fetched, the Recommendations page shall display a loading state.
2. If the request fails (network error, endpoint error, or upstream error), the Recommendations page shall display an error state with a retry action.
3. When the user selects the retry action, the application shall re-request the best-seller data.
4. If the request succeeds but returns no titles, the Recommendations page shall display an empty state rather than a blank page.
5. If the recommendations request fails, the application shall not crash and shall keep the other routes (Home, Shelves, Catalog, Profile) usable.

### Requirement 4: Add a recommended title to the library

**Objective:** As a signed-in reader, I want to add a recommended best seller to my shelves, so that recommendations connect to the rest of my library.

#### Acceptance Criteria
1. The Recommendations page shall provide an add-to-shelf action for each recommended title.
2. When the user adds a recommended title, the application shall create a media item of type `ebook` (when an equivalent one does not already exist) and a library entry for the authenticated user, reusing the platform's library and activity backend endpoints and persisting to PostgreSQL.
3. When the user adds a recommended title, the application shall record an activity such that it appears in the Home Feed.
4. When a recommended title already exists in the authenticated user's library, the Recommendations page shall indicate that and shall not create a duplicate library entry for it.
5. The application shall match a recommended title to an existing media item using stable identifying fields (for example, normalized title and author) so that the same best seller is not added twice, and this matching shall be performed server-side.

### Requirement 5: Server-side NYT endpoint and API key handling

**Objective:** As a maintainer, I want NYT API access mediated by a server-side endpoint that protects the key, so that the secret never reaches the browser and the integration is secure.

#### Acceptance Criteria
1. The application shall include a Next.js Route Handler at `/api/recommendations` that requests best-seller data from the New York Times Best Seller Lists API on the server.
2. The Route Handler shall read the NYT API key from a server-side environment variable (for example, `NYT_API_KEY`) and shall never return the key to the client or include it in any client-delivered code or response.
3. The Route Handler shall return only the fields the client needs to render recommendations, as a typed JSON response shape shared between server and client, rather than passing the raw upstream payload verbatim.
4. If the NYT API key environment variable is missing, the Route Handler shall respond with a server-error status and a generic message, without exposing key details or stack traces.
5. If the upstream NYT request fails or is rejected for authorization, the Route Handler shall respond with an appropriate error status that the client surfaces as a recommendations error state.
6. The Route Handler shall fetch only the NYT best-seller data needed for recommendations and shall not act as an open proxy to arbitrary NYT or third-party endpoints.
7. The Route Handler shall require an authenticated session, consistent with the platform's other data endpoints.

### Requirement 6: Rate limiting and caching

**Objective:** As a maintainer, I want NYT responses cached and throttled, so that repeated visits stay within the NYT API quota and the page stays responsive.

#### Acceptance Criteria
1. The application shall cache best-seller responses server-side for a defined period (for example, via the framework's data/route caching with a revalidation interval and/or cache-control headers) so that repeated Recommendations visits do not issue a new upstream NYT request each time.
2. While a cached best-seller response is valid, the application shall serve the cached data instead of calling the NYT API.
3. The application shall issue best-seller requests in a way that respects the NYT API rate limits (for example, by relying on the server-side cache and avoiding redundant concurrent upstream requests for the same data).
4. If the NYT API responds with a rate-limit status, the application shall surface a non-crashing error or serve cached data, and the client shall present the error state rather than failing silently.

### Requirement 7: Configuration, secrets, and local development

**Objective:** As a maintainer, I want clear, safe configuration for the NYT key, so that secrets are not committed and the integration can be run locally and on Vercel.

#### Acceptance Criteria
1. The repository's example environment file (for example, `.env.example`) shall document the required `NYT_API_KEY` variable without containing a real key, alongside the platform's other variables.
2. The repository's ignore configuration shall exclude the real environment files (for example, `.env`, `.env.local`) from version control.
3. The README shall document how to obtain and configure the NYT API key (locally via the env file and on Vercel via project environment variables) and how to exercise the endpoint in the Docker-based local environment.
4. The application shall obtain the NYT API key only from environment configuration and shall not hard-code the key in any source file.
5. When the NYT API key is not configured, the Recommendations page shall display the error state defined in Requirement 3 rather than appearing to load indefinitely.

### Requirement 8: Layout, accessibility, and consistency

**Objective:** As a reader on any device, I want the Recommendations page to be usable and consistent with the rest of the app, so that the experience feels cohesive ahead of the later re-skin.

#### Acceptance Criteria
1. The Recommendations page shall be usable and correctly laid out at both desktop and mobile widths.
2. The Recommendations page shall reuse the existing LibraryLoop visual language (cards, pills, avatars, typography, and color themes) ported into the React front-end, rather than introducing an unrelated style.
3. The loading, empty, and error states shall be conveyed accessibly (for example, with appropriate text and status semantics) rather than by visual styling alone.
4. The Recommendations page's interactive controls (add-to-shelf, retry) shall be implemented as accessible, semantic React components consistent with the platform's conventions.
