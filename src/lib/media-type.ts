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
 * "All" plus one option per present media type, each with a count, for the
 * media-type filter (Req 8.2). Data-driven, no per-type branching.
 */
export function mediaTypeCounts(items: readonly MediaItem[]): MediaTypeCount[] {
  const byType = new Map<string, number>();
  for (const item of items) byType.set(item.type, (byType.get(item.type) ?? 0) + 1);
  const types = [...byType.keys()].sort();
  return [
    { value: "all", label: "All", count: items.length },
    ...types.map((type) => ({ value: type, label: mediaTypeLabel(type), count: byType.get(type) ?? 0 })),
  ];
}

/** Filter selection is carried in the URL query so it survives a refresh (Req 5.7). */
export function filterHref(value: string): string {
  return value === "all" ? "/" : `/?type=${encodeURIComponent(value)}`;
}

/** Normalize a raw query value to a known option, defaulting to "all" (Req 5.6). */
export function resolveActiveType(raw: string | undefined, options: MediaTypeOption[]): string {
  if (raw && options.some((option) => option.value === raw)) return raw;
  return "all";
}
