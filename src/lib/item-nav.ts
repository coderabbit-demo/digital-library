/**
 * Back-navigation target for the item detail page (cover-art / trending).
 *
 * The detail page is reached from several surfaces; a `from` query param records
 * the origin so the "Back to …" link returns there. Unknown/absent values fall
 * back to the Library. The href comes from a fixed allow-list (no open redirect).
 */
export interface BackTarget {
  href: string;
  label: string;
}

const LIBRARY: BackTarget = { href: "/library", label: "Library" };

const BACK_TARGETS: Record<string, BackTarget> = {
  trending: { href: "/trending", label: "Trending" },
  search: { href: "/search", label: "Search" },
  wishlist: { href: "/wishlist", label: "Wishlist" },
  reviews: { href: "/reviews", label: "Reviews" },
  library: LIBRARY,
};

/** Encode the preserved params (e.g. the active search query/type) into a query
 *  string, dropping empty/blank values so the back href stays clean. */
function backQuery(preserve: Record<string, string | undefined> | undefined): string {
  if (!preserve) return "";
  const parts: string[] = [];
  for (const [key, value] of Object.entries(preserve)) {
    const trimmed = (value ?? "").trim();
    if (trimmed) parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(trimmed)}`);
  }
  return parts.join("&");
}

/**
 * Resolve the "Back to …" target for an item detail page. The base path comes
 * from a fixed allow-list (no open redirect); `preserve` re-appends the origin's
 * own query state (e.g. `q`, `type`) so returning to a search or filtered list
 * lands back on the same results instead of an empty page.
 */
export function itemBackTarget(
  from: string | undefined,
  preserve?: Record<string, string | undefined>,
): BackTarget {
  // Object.hasOwn guards against prototype keys (e.g. "constructor") resolving
  // to non-BackTarget values.
  const base = from && Object.hasOwn(BACK_TARGETS, from) ? (BACK_TARGETS[from] ?? LIBRARY) : LIBRARY;
  const query = backQuery(preserve);
  return query ? { href: `${base.href}?${query}`, label: base.label } : base;
}
