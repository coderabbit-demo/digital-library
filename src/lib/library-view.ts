/**
 * Shelves view helpers (DL-32): compose library entries with their media items
 * and filter by shelf. Pure so they're unit-testable without a database.
 */
import type { LibraryEntry, LibraryStatus, MediaItem } from "@/lib/types";

export interface ShelfItem {
  entry: LibraryEntry;
  item: MediaItem;
}

export const SHELF_FILTERS = [
  { value: "all", label: "All" },
  { value: "wishlist", label: "Wishlist" },
  { value: "current", label: "Currently reading" },
  { value: "finished", label: "Finished" },
] as const;

export function composeShelfItems(entries: LibraryEntry[], media: MediaItem[]): ShelfItem[] {
  const byId = new Map(media.map((m) => [m.id, m]));
  const items: ShelfItem[] = [];
  for (const entry of entries) {
    const item = byId.get(entry.mediaItemId);
    if (item) items.push({ entry, item });
  }
  return items;
}

export function filterShelfItems(items: ShelfItem[], shelf: string): ShelfItem[] {
  if (shelf === "all") return items;
  return items.filter((i) => i.entry.status === shelf);
}

/** Filter shelf items by media type, passing everything through for "all"
 *  (media-type-filters Req 4.2, 5.2). Shared by the Wishlist and Reviews pages. */
export function filterShelfItemsByType(items: ShelfItem[], activeType: string): ShelfItem[] {
  if (activeType === "all") return items;
  return items.filter((i) => i.item.type === activeType);
}

/** Scoped text search over a page's items by title or creator, case-insensitively
 *  (media-search Req 5.2); an empty query passes everything through. */
export function filterShelfItemsByQuery(items: ShelfItem[], query: string): ShelfItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (i) => i.item.title.toLowerCase().includes(q) || i.item.creator.toLowerCase().includes(q),
  );
}

export function resolveShelf(raw: string | undefined): string {
  return SHELF_FILTERS.some((f) => f.value === raw) ? (raw as string) : "all";
}

export function shelfHref(value: string): string {
  return value === "all" ? "/shelves" : `/shelves?shelf=${value}`;
}

export function statusLabel(status: LibraryStatus): string {
  const labels: Record<LibraryStatus, string> = {
    wishlist: "Wishlist",
    current: "Currently reading",
    finished: "Finished",
  };
  return labels[status];
}
