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

export function itemBackTarget(from: string | undefined): BackTarget {
  // Object.hasOwn guards against prototype keys (e.g. "constructor") resolving
  // to non-BackTarget values.
  if (from && Object.hasOwn(BACK_TARGETS, from)) return BACK_TARGETS[from] ?? LIBRARY;
  return LIBRARY;
}
