/**
 * MusicBrainz enrichment for music (media-detail-enrichment Req 1.4). Keyless
 * but requires a descriptive User-Agent and is rate-limited (~1 req/sec), so a
 * single release-search request is made per item. Contributes release date,
 * label, track count, and disc count. Never throws.
 */
import { fetchJson, isRecord } from "@/lib/covers/http";
import {
  compactEnrichment,
  coverDeps,
  type EnrichmentFetchDeps,
  type EnrichmentOf,
  nonNegInt,
  text,
} from "./provider";

const RELEASE_URL = "https://musicbrainz.org/ws/2/release";
const USER_AGENT = "LibraryLoop/1.0 (https://github.com/coderabbit-demo/digital-library)";

/** Pure: a MusicBrainz release-search payload → a music partial. */
export function normalizeMusicBrainzRelease(payload: unknown): EnrichmentOf<"music"> | null {
  const releases = isRecord(payload) && Array.isArray(payload.releases) ? payload.releases : [];
  const release = releases[0];
  if (!isRecord(release)) return null;

  let label: string | undefined;
  if (Array.isArray(release["label-info"])) {
    for (const li of release["label-info"]) {
      if (isRecord(li) && isRecord(li.label)) {
        const name = text(li.label.name);
        if (name) {
          label = name;
          break;
        }
      }
    }
  }

  let trackCount: number | undefined;
  let discCount: number | undefined;
  if (Array.isArray(release.media)) {
    discCount = release.media.length;
    let sum = 0;
    let sawCount = false;
    for (const m of release.media) {
      const tc = isRecord(m) ? nonNegInt(m["track-count"]) : undefined;
      if (tc !== undefined) {
        sum += tc;
        sawCount = true;
      }
    }
    if (sawCount) trackCount = sum;
  }

  return compactEnrichment("music", {
    releaseDate: text(release.date),
    label,
    trackCount,
    discCount,
  });
}

/** Query MusicBrainz for a release; returns a partial or null. */
export async function enrichMusicFromMusicBrainz(
  item: { title: string; creator: string },
  deps: EnrichmentFetchDeps = {},
): Promise<EnrichmentOf<"music"> | null> {
  const title = item.title.trim().replace(/"/g, " ").trim();
  const creator = item.creator.trim().replace(/"/g, " ").trim();
  if (!title) return null;
  const query = creator ? `release:"${title}" AND artist:"${creator}"` : `release:"${title}"`;
  const url = `${RELEASE_URL}?query=${encodeURIComponent(query)}&fmt=json&limit=1`;
  const data = await fetchJson(url, coverDeps(deps), { "User-Agent": USER_AGENT });
  return normalizeMusicBrainzRelease(data);
}
