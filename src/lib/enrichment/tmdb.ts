/**
 * TMDB enrichment for movies and TV (movie-tv-types Req 1, 5, 6). Keyed by the
 * existing TMDB_API_KEY. Queries the endpoint matching the item's precise type
 * (movie or tv); a legacy combined item tries movie then TV. Fetches the detail
 * (with credits appended) and normalizes it — including the resolved `tmdbId`
 * and `tmdbType` (which drive the review-excerpt fetch), season/episode counts
 * for TV, and a synopsis from the overview. Never throws.
 */
import { fetchJson, isRecord } from "@/lib/covers/http";
import {
  compactEnrichment,
  coverDeps,
  type EnrichmentFetchDeps,
  type EnrichmentOf,
  enrichmentEnv,
  ENRICHMENT_LIST_CAP,
  nonNegInt,
  numberInRange,
  text,
  textList,
} from "./provider";

const SEARCH_BASE = "https://api.themoviedb.org/3/search";
const DETAIL_BASE = "https://api.themoviedb.org/3";

type TmdbKind = "movie" | "tv";

/** Pure: a TMDB detail payload (with appended credits) → a video partial. */
export function normalizeTmdbDetail(
  kind: TmdbKind,
  id: number,
  payload: unknown,
): EnrichmentOf<"video"> | null {
  if (!isRecord(payload)) return compactEnrichment("video", { tmdbId: id, tmdbType: kind });

  const runtime =
    kind === "movie"
      ? nonNegInt(payload.runtime)
      : Array.isArray(payload.episode_run_time)
        ? nonNegInt(payload.episode_run_time[0])
        : undefined;

  const genres = Array.isArray(payload.genres)
    ? textList(payload.genres.map((g) => (isRecord(g) ? g.name : undefined)))
    : undefined;

  const cast =
    isRecord(payload.credits) && Array.isArray(payload.credits.cast)
      ? textList(
          payload.credits.cast.map((c) => (isRecord(c) ? c.name : undefined)),
          ENRICHMENT_LIST_CAP,
        )
      : undefined;

  // Season/episode counts apply to TV only (movies never carry them).
  const seasons = kind === "tv" ? nonNegInt(payload.number_of_seasons) : undefined;
  const episodes = kind === "tv" ? nonNegInt(payload.number_of_episodes) : undefined;

  return compactEnrichment("video", {
    tmdbId: id,
    tmdbType: kind,
    runtimeMinutes: runtime,
    genres,
    releaseDate: text(payload.release_date) ?? text(payload.first_air_date),
    tagline: text(payload.tagline),
    cast,
    voteAverage: numberInRange(payload.vote_average, 0, 10),
    voteCount: nonNegInt(payload.vote_count),
    seasons,
    episodes,
    synopsis: text(payload.overview),
  });
}

function firstResultId(payload: unknown): number | null {
  if (!isRecord(payload) || !Array.isArray(payload.results)) return null;
  const first = payload.results[0];
  return isRecord(first) && typeof first.id === "number" ? first.id : null;
}

export function isTmdbConfigured(env: Record<string, string | undefined>): boolean {
  return (text(env.TMDB_API_KEY) ?? "").length > 0;
}

/** Endpoints to try for an item type: the precise one, or both for legacy. */
function tmdbKindsFor(type: string | undefined): readonly TmdbKind[] {
  if (type === "movie") return ["movie"];
  if (type === "tv") return ["tv"];
  return ["movie", "tv"]; // legacy "tv_movie" (or unspecified): try both
}

/** Resolve a movie/TV item via TMDB and return its enrichment, or null. */
export async function enrichFromTmdb(
  item: { type?: string; title: string; creator: string },
  deps: EnrichmentFetchDeps = {},
): Promise<EnrichmentOf<"video"> | null> {
  const env = enrichmentEnv(deps);
  const key = text(env.TMDB_API_KEY);
  if (!key) return null;
  const cd = coverDeps(deps);
  const query = encodeURIComponent(item.title.trim());

  for (const kind of tmdbKindsFor(item.type)) {
    const search = await fetchJson(
      `${SEARCH_BASE}/${kind}?query=${query}&include_adult=false&api_key=${encodeURIComponent(key)}`,
      cd,
    );
    const id = firstResultId(search);
    if (id === null) continue;
    const detail = await fetchJson(
      `${DETAIL_BASE}/${kind}/${id}?append_to_response=credits&api_key=${encodeURIComponent(key)}`,
      cd,
    );
    return normalizeTmdbDetail(kind, id, detail);
  }
  return null;
}
