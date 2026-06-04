/**
 * Media-type labels and feed-filter options (DL-31).
 *
 * Options are derived from the media types actually present in the data, so
 * future types (music, podcasts, …) appear automatically with a humanized
 * label fallback — no code change needed (Req 5.2, 5.3, 6.2, 6.3).
 */
import type { MediaItem, MediaTypeOption } from "@/lib/types";

export const MEDIA_TYPE_LABELS: Record<string, string> = {
  ebook: "Books",
  music: "Music",
  podcast: "Podcasts",
  movie: "Movies",
  tv: "TV Shows",
  // Transitional: retained so any unmigrated legacy row still reads sensibly.
  tv_movie: "TV & Movies",
};

function humanize(value: string): string {
  if (!value) return "Other";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function mediaTypeLabel(type: string): string {
  return MEDIA_TYPE_LABELS[type] ?? humanize(type);
}

export function distinctMediaTypes(items: readonly MediaItem[]): string[] {
  return Array.from(new Set(items.map((item) => item.type)));
}

/** "All" plus one option per present media type, sorted for stable display. */
export function mediaTypeOptions(types: readonly string[]): MediaTypeOption[] {
  const distinct = Array.from(new Set(types)).sort();
  return [
    { value: "all", label: "All" },
    ...distinct.map((type) => ({ value: type, label: mediaTypeLabel(type) })),
  ];
}

export interface MediaTypeCount {
  value: string;
  label: string;
  count: number;
}

/**
 * "All" plus one option per present media type, each with a count, built from a
 * plain list of media-type strings. Works for any surface regardless of where
 * the type lives on its items (e.g. library `type`, trending `mediaType`);
 * data-driven, sorted, with the humanized label fallback (media-type-filters
 * Req 1.2, 1.6, 1.7).
 */
export function countMediaTypes(types: readonly string[]): MediaTypeCount[] {
  const byType = new Map<string, number>();
  for (const type of types) byType.set(type, (byType.get(type) ?? 0) + 1);
  const distinct = [...byType.keys()].sort();
  return [
    { value: "all", label: "All", count: types.length },
    ...distinct.map((type) => ({ value: type, label: mediaTypeLabel(type), count: byType.get(type) ?? 0 })),
  ];
}

/**
 * "All" plus one option per present media type, each with a count, for the
 * media-type filter (Req 8.2). Data-driven, no per-type branching.
 */
export function mediaTypeCounts(items: readonly MediaItem[]): MediaTypeCount[] {
  return countMediaTypes(items.map((item) => item.type));
}

/** Filter selection is carried in the URL query so it survives a refresh (Req 5.7). */
export function filterHref(value: string): string {
  return value === "all" ? "/" : `/?type=${encodeURIComponent(value)}`;
}

export interface TypeHrefConfig {
  /** App-relative route the filter lives on, e.g. "/", "/trending", "/wishlist". */
  basePath: string;
  /** Query key carrying the selection; defaults to "type". */
  param?: string;
  /** Sibling selections to keep on the URL (e.g. the feed's `type` while the
   *  Home Trending section uses `trending`). "all"/undefined entries are dropped. */
  preserve?: Record<string, string | undefined>;
}

/**
 * Build an `hrefFor(value)` for a surface's media-type filter (media-type-filters
 * Req 6.1): the key is omitted for "All", preserved sibling selections come
 * first (and are dropped when "All"/absent), and values are URL-encoded. One
 * implementation serves every surface, including the Home page's two
 * independent filters (Req 3.3).
 */
export function typeFilterHrefFactory(config: TypeHrefConfig): (value: string) => string {
  const param = config.param ?? "type";
  return (value: string): string => {
    const parts: string[] = [];
    for (const [key, raw] of Object.entries(config.preserve ?? {})) {
      if (raw && raw !== "all") parts.push(`${key}=${encodeURIComponent(raw)}`);
    }
    if (value !== "all") parts.push(`${param}=${encodeURIComponent(value)}`);
    return parts.length > 0 ? `${config.basePath}?${parts.join("&")}` : config.basePath;
  };
}

/** Normalize a raw query value to a known option, defaulting to "all" (Req 5.6).
 *  Accepts plain options or counted options (anything carrying a `value`). */
export function resolveActiveType(
  raw: string | undefined,
  options: readonly { value: string }[],
): string {
  if (raw && options.some((option) => option.value === raw)) return raw;
  return "all";
}
