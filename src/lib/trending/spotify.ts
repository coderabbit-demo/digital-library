/**
 * Spotify New Releases — the music provider for Trending Now (DL-55).
 *
 * Uses the client-credentials OAuth flow (no user login): an app token is
 * obtained server-side from the credentials and memoized in module scope until
 * shortly before expiry, then used to fetch New Releases (cached via the Next
 * Data Cache). Credentials and the token never reach the client.
 * `normalizeNewReleases` is pure and unit-tested.
 */
import type { TrendingItem } from "@/lib/types";
import type { TrendingFetchOptions, TrendingProvider } from "./provider";

const TOKEN_URL = "https://accounts.spotify.com/api/token";
// Spotify's Browse "new releases" endpoint (/v1/browse/new-releases) returns
// 403 for client-credentials (app) tokens, so we use Search with the `tag:new`
// filter — albums released in roughly the last two weeks — which works with the
// app token (no user OAuth) and returns the same { albums: { items } } shape.
const SEARCH_URL = "https://api.spotify.com/v1/search";
const REVALIDATE_SECONDS = 3600;
const EXPIRY_MARGIN_MS = 60_000;
// Spotify's Search endpoint rejects a `limit` above 10 for the `tag:new` album
// query ("Invalid limit", 400) — lower than the documented 50 — so cap here.
const MAX_LIMIT = 10;
const REQUEST_TIMEOUT_MS = 8000;

interface CachedToken {
  token: string;
  expiresAt: number;
}
let cachedToken: CachedToken | null = null;
/** In-flight refresh, so concurrent misses don't stampede the token endpoint. */
let pendingToken: Promise<string> | null = null;

/** Test seam: clear the memoized app token and any in-flight refresh. */
export function __resetSpotifyToken(): void {
  cachedToken = null;
  pendingToken = null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
function httpsOrNull(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("https://") ? value : null;
}

/** Obtain (or reuse) a client-credentials app token. `now` is injected for tests. */
export async function getAppToken(now: number, fetchImpl: typeof fetch): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > now) return cachedToken.token;
  // Coalesce concurrent refreshes into a single request.
  if (pendingToken) return pendingToken;

  pendingToken = (async () => {
    const id = text(process.env.SPOTIFY_CLIENT_ID);
    const secret = text(process.env.SPOTIFY_CLIENT_SECRET);
    if (!id || !secret) throw new Error("Spotify credentials are not configured");

    const basic = Buffer.from(`${id}:${secret}`).toString("base64");
    const res = await fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Spotify token request failed: ${res.status}`);
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    const token = text(json.access_token);
    if (!token) throw new Error("Spotify token response missing access_token");
    const ttlSeconds = typeof json.expires_in === "number" ? json.expires_in : 3600;
    cachedToken = { token, expiresAt: now + ttlSeconds * 1000 - EXPIRY_MARGIN_MS };
    return token;
  })();

  try {
    return await pendingToken;
  } finally {
    pendingToken = null;
  }
}

interface SpotifyAlbum {
  id?: string;
  name?: string;
  artists?: { name?: string }[];
  images?: { url?: string }[];
  external_urls?: { spotify?: string };
}
interface NewReleasesPayload {
  albums?: { items?: SpotifyAlbum[] };
}

/** Pure: New Releases payload → de-duped, capped TrendingItems. */
export function normalizeNewReleases(payload: unknown, limit: number): TrendingItem[] {
  const rawItems = (payload as NewReleasesPayload | null)?.albums?.items;
  const albums = Array.isArray(rawItems) ? rawItems : [];
  const seen = new Set<string>();
  const items: TrendingItem[] = [];

  for (const album of albums) {
    const title = text(album.name);
    if (!title) continue;
    const id = text(album.id);
    const dedupKey = id || title.toLowerCase();
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    const creator =
      (album.artists ?? [])
        .map((a) => text(a.name))
        .filter((n) => n.length > 0)
        .join(", ") || "Unknown";
    items.push({
      source: "spotify",
      sourceLabel: "Spotify New Releases",
      mediaType: "music",
      title,
      creator,
      listLabel: "New Releases",
      rank: null,
      genre: null,
      artworkUrl: httpsOrNull(album.images?.[0]?.url),
      externalUrl: httpsOrNull(album.external_urls?.spotify),
      externalId: id || null,
    });
    if (items.length >= limit) return items;
  }
  return items;
}

export const spotifyMusicProvider: TrendingProvider = {
  id: "spotify",
  label: "Spotify New Releases",
  mediaType: "music",
  isConfigured: (env) =>
    text(env.SPOTIFY_CLIENT_ID).length > 0 && text(env.SPOTIFY_CLIENT_SECRET).length > 0,
  async fetchTrending({ limit, fetchImpl }: TrendingFetchOptions): Promise<TrendingItem[]> {
    const doFetch = fetchImpl ?? fetch;
    const token = await getAppToken(Date.now(), doFetch);
    const capped = Math.min(Math.max(limit, 1), MAX_LIMIT);
    const query = new URLSearchParams({ q: "tag:new", type: "album", limit: String(capped) });
    const res = await doFetch(`${SEARCH_URL}?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Spotify search request failed: ${res.status}`);
    return normalizeNewReleases(await res.json(), limit);
  },
};
