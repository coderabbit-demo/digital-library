/**
 * Externally-sourced media enrichment (media-detail-enrichment Req 1, 2.6).
 *
 * Parses an untrusted jsonb value into the discriminated {@link MediaEnrichment}
 * union at the boundary so it is never consumed as `any`. Every field is
 * optional; malformed or absent fields are dropped rather than throwing, so a
 * partially-populated or legacy row still reads cleanly. Numeric scores are
 * persisted here; transient review excerpt text is fetched per view, not stored.
 */
import type { MediaEnrichment } from "@/lib/types";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asNonNegInt(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}

/** A finite number within [min, max]; used for ratings/scores (floats allowed). */
function asNumberInRange(value: unknown, min: number, max: number): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
    ? value
    : undefined;
}

/** A bounded list of non-empty trimmed strings, de-duplicated, capped. */
function asTextList(value: unknown, cap: number): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: string[] = [];
  for (const entry of value) {
    const text = asText(entry);
    if (text && !out.includes(text)) out.push(text);
    if (out.length >= cap) break;
  }
  return out.length > 0 ? out : undefined;
}

/** Spread helper: include `key: value` only when value is defined. */
function opt<T>(key: string, value: T | undefined): Record<string, T> {
  return value !== undefined ? { [key]: value } : {};
}

const LIST_CAP = 12;

/** Validate an untrusted value into the enrichment union for the given type. */
export function parseMediaEnrichment(type: string, raw: unknown): MediaEnrichment | null {
  const r = asRecord(raw);
  switch (type) {
    case "tv_movie":
      return {
        kind: "tv_movie",
        ...opt("tmdbId", asNonNegInt(r.tmdbId)),
        ...opt("tmdbType", r.tmdbType === "movie" || r.tmdbType === "tv" ? r.tmdbType : undefined),
        ...opt("runtimeMinutes", asNonNegInt(r.runtimeMinutes)),
        ...opt("genres", asTextList(r.genres, LIST_CAP)),
        ...opt("releaseDate", asText(r.releaseDate)),
        ...opt("tagline", asText(r.tagline)),
        ...opt("cast", asTextList(r.cast, LIST_CAP)),
        ...opt("voteAverage", asNumberInRange(r.voteAverage, 0, 10)),
        ...opt("voteCount", asNonNegInt(r.voteCount)),
      };
    case "ebook":
      return {
        kind: "ebook",
        ...opt("pageCount", asNonNegInt(r.pageCount)),
        ...opt("publisher", asText(r.publisher)),
        ...opt("publishedDate", asText(r.publishedDate)),
        ...opt("categories", asTextList(r.categories, LIST_CAP)),
        ...opt("isbn10", asText(r.isbn10)),
        ...opt("isbn13", asText(r.isbn13)),
        ...opt("averageRating", asNumberInRange(r.averageRating, 0, 5)),
        ...opt("ratingsCount", asNonNegInt(r.ratingsCount)),
        ...opt("openLibraryRating", asNumberInRange(r.openLibraryRating, 0, 5)),
        ...opt("openLibraryRatingsCount", asNonNegInt(r.openLibraryRatingsCount)),
      };
    case "music":
      return {
        kind: "music",
        ...opt("genre", asText(r.genre)),
        ...opt("releaseDate", asText(r.releaseDate)),
        ...opt("trackCount", asNonNegInt(r.trackCount)),
        ...opt("discCount", asNonNegInt(r.discCount)),
        ...opt("label", asText(r.label)),
      };
    case "podcast":
      return {
        kind: "podcast",
        ...opt("publisher", asText(r.publisher)),
        ...opt("episodeCount", asNonNegInt(r.episodeCount)),
        ...opt("genre", asText(r.genre)),
      };
    default:
      return null;
  }
}
