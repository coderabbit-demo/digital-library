/**
 * iTunes Search cover client for music, podcasts, and TV/movies (cover-art
 * DL-75). Keyless. Tries each given entity in order (e.g. movie then tvSeason)
 * and returns the first candidate that passes the match rule, upscaling the
 * 100×100 artwork to 600×600 and validating https.
 */
import { coverMatches } from "./match";
import { type CoverDeps, fetchJson, httpsOrNull, isRecord } from "./http";

const SEARCH_URL = "https://itunes.apple.com/search";

export async function resolveItunesCover(
  title: string,
  creator: string,
  entities: readonly string[],
  deps: CoverDeps = {},
): Promise<string | null> {
  const term = `${title} ${creator}`.trim();
  for (const entity of entities) {
    const url = `${SEARCH_URL}?term=${encodeURIComponent(term)}&entity=${entity}&limit=5&country=US`;
    const data = await fetchJson(url, deps);
    const results = isRecord(data) && Array.isArray(data.results) ? data.results : [];
    const requireCreator = entity !== "podcast";

    for (const r of results) {
      if (!isRecord(r)) continue;
      const candTitle =
        typeof r.collectionName === "string"
          ? r.collectionName
          : typeof r.trackName === "string"
            ? r.trackName
            : "";
      const candCreator = typeof r.artistName === "string" ? r.artistName : null;
      if (!coverMatches({ title, creator }, { title: candTitle, creator: candCreator }, { requireCreator })) continue;

      const art =
        typeof r.artworkUrl100 === "string"
          ? r.artworkUrl100
          : typeof r.artworkUrl60 === "string"
            ? r.artworkUrl60
            : null;
      const https = httpsOrNull(art?.replace(/100x100bb/, "600x600bb").replace(/60x60bb/, "600x600bb"));
      if (https) return https;
    }
  }
  return null;
}
