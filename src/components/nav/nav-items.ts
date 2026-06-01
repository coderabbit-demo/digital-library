/**
 * Persistent navigation model (DL-28; relabeled for media-platform-v2 DL-46).
 * Data-driven so additional routes (e.g. Recommendations) slot in without
 * touching the nav component. Uses the reference IA labels.
 */
export type NavIcon = "home" | "library" | "wishlist" | "reviews" | "trending";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/library", label: "Library", icon: "library" },
  { href: "/wishlist", label: "Wishlist", icon: "wishlist" },
  { href: "/reviews", label: "Reviews", icon: "reviews" },
  { href: "/trending", label: "Trending", icon: "trending" },
];

/** Active when the path matches the item (Home only on exact "/"). */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
