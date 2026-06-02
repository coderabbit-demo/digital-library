/**
 * Match safety for cover resolution (cover-art DL-75, Req 5).
 *
 * Title/creator lookups against external catalogs can return the wrong item, so
 * a candidate cover is only accepted when it confidently corresponds to our
 * item. Comparison is on normalized text (case/diacritics/punctuation folded);
 * the default requires creator corroboration, relaxed to title-only for sources
 * with weak creator data (podcasts).
 */

/** Lowercase, strip diacritics, drop punctuation, collapse whitespace. */
export function normalizeForMatch(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Equal, or one strongly contains the other (guarded against trivial fragments). */
function textMatches(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  return a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a));
}

export interface CoverCandidate {
  title: string;
  creator?: string | null;
}

/**
 * True when `candidate` confidently matches `item`. Requires a title match
 * always, plus creator corroboration unless `requireCreator` is false.
 */
export function coverMatches(
  item: { title: string; creator: string },
  candidate: CoverCandidate,
  opts?: { requireCreator?: boolean },
): boolean {
  if (!textMatches(normalizeForMatch(item.title), normalizeForMatch(candidate.title))) return false;
  if (opts?.requireCreator === false) return true;
  return textMatches(normalizeForMatch(item.creator), normalizeForMatch(candidate.creator ?? ""));
}
