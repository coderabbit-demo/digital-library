/**
 * Catalog view helpers (DL-33): derive genre filter options and filter media.
 */
import type { MediaItem } from "@/lib/types";

export function distinctGenres(media: MediaItem[]): string[] {
  return Array.from(new Set(media.map((m) => m.genre))).sort();
}

export function filterByGenre(media: MediaItem[], genre: string): MediaItem[] {
  return genre === "all" ? media : media.filter((m) => m.genre === genre);
}

export function resolveGenre(raw: string | undefined, genres: string[]): string {
  return raw && genres.includes(raw) ? raw : "all";
}

export function genreHref(value: string): string {
  return value === "all" ? "/catalog" : `/catalog?genre=${encodeURIComponent(value)}`;
}
