/**
 * Pure display helpers for enrichment (media-detail-enrichment Req 1.6, 4.x).
 * Turn a typed {@link MediaEnrichment} into ordered label/value rows for the
 * metadata section and per-source score badges for the reviews section, omitting
 * absent fields so the UI never renders empty labels. No rendering here.
 */
import type { MediaEnrichment } from "@/lib/types";

export interface DisplayField {
  label: string;
  value: string;
}

export interface ScoreBadge {
  /** Source attribution, e.g. "TMDB", "Google Books", "Open Library". */
  source: string;
  /** Formatted score, e.g. "8.2 / 10". */
  value: string;
  /** Optional count suffix, e.g. "1,200 ratings". */
  count?: string;
}

const NUM = new Intl.NumberFormat("en-US");

function plural(count: number, singular: string): string {
  return `${NUM.format(count)} ${singular}${count === 1 ? "" : "s"}`;
}

function push(out: DisplayField[], label: string, value: string | undefined): void {
  if (value !== undefined && value.length > 0) out.push({ label, value });
}

/** Type-appropriate metadata rows for an item's enrichment (scores excluded). */
export function selectEnrichmentFields(enrichment: MediaEnrichment | null | undefined): DisplayField[] {
  if (!enrichment) return [];
  const out: DisplayField[] = [];
  switch (enrichment.kind) {
    case "video":
      if (enrichment.runtimeMinutes !== undefined) push(out, "Runtime", plural(enrichment.runtimeMinutes, "min"));
      // Seasons/episodes are present only for TV shows (movies never set them).
      if (enrichment.seasons !== undefined) push(out, "Seasons", plural(enrichment.seasons, "season"));
      if (enrichment.episodes !== undefined) push(out, "Episodes", plural(enrichment.episodes, "episode"));
      push(out, "Genres", enrichment.genres?.join(", "));
      push(out, "Released", enrichment.releaseDate);
      push(out, "Cast", enrichment.cast?.join(", "));
      push(out, "Tagline", enrichment.tagline);
      break;
    case "ebook":
      if (enrichment.pageCount !== undefined) push(out, "Pages", NUM.format(enrichment.pageCount));
      push(out, "Publisher", enrichment.publisher);
      push(out, "Published", enrichment.publishedDate);
      push(out, "Categories", enrichment.categories?.join(", "));
      push(out, "ISBN", enrichment.isbn13 ?? enrichment.isbn10);
      break;
    case "music":
      push(out, "Genre", enrichment.genre);
      push(out, "Released", enrichment.releaseDate);
      if (enrichment.trackCount !== undefined) push(out, "Tracks", plural(enrichment.trackCount, "track"));
      if (enrichment.discCount !== undefined && enrichment.discCount > 1)
        push(out, "Discs", plural(enrichment.discCount, "disc"));
      push(out, "Label", enrichment.label);
      break;
    case "podcast":
      push(out, "Publisher", enrichment.publisher);
      if (enrichment.episodeCount !== undefined) push(out, "Episodes", plural(enrichment.episodeCount, "episode"));
      push(out, "Genre", enrichment.genre);
      break;
  }
  return out;
}

/** Whether a media type can ever have a reviews/ratings section (Req 4.4). */
export function typeHasReviewsSection(type: string): boolean {
  return type === "movie" || type === "tv" || type === "tv_movie" || type === "ebook";
}

/** Per-source rating badges for the reviews section (scores only; no excerpts). */
export function selectScoreBadges(enrichment: MediaEnrichment | null | undefined): ScoreBadge[] {
  if (!enrichment) return [];
  const out: ScoreBadge[] = [];
  if (enrichment.kind === "video" && enrichment.voteAverage !== undefined) {
    out.push({
      source: "TMDB",
      value: `${enrichment.voteAverage.toFixed(1)} / 10`,
      ...(enrichment.voteCount !== undefined ? { count: plural(enrichment.voteCount, "vote") } : {}),
    });
  }
  if (enrichment.kind === "ebook") {
    if (enrichment.averageRating !== undefined) {
      out.push({
        source: "Google Books",
        value: `${enrichment.averageRating.toFixed(1)} / 5`,
        ...(enrichment.ratingsCount !== undefined ? { count: plural(enrichment.ratingsCount, "rating") } : {}),
      });
    }
    if (enrichment.openLibraryRating !== undefined) {
      out.push({
        source: "Open Library",
        value: `${enrichment.openLibraryRating.toFixed(1)} / 5`,
        ...(enrichment.openLibraryRatingsCount !== undefined
          ? { count: plural(enrichment.openLibraryRatingsCount, "rating") }
          : {}),
      });
    }
  }
  return out;
}
