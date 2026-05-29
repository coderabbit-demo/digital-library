/**
 * Persistent navigation model (DL-28). Data-driven so additional routes (e.g.
 * Recommendations, added by the nyt-recommendations spec) slot in without
 * touching the nav component.
 */
export interface NavItem {
  href: string;
  label: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/shelves", label: "Shelves" },
  { href: "/catalog", label: "Catalog" },
  { href: "/profile", label: "Profile" },
];

/** Active when the path matches the item (Home only on exact "/"). */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
