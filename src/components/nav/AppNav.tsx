"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BookMarked, Heart, Home, LogOut, Search, Star, TrendingUp, type LucideIcon } from "lucide-react";
import { AddItemDialog } from "@/components/library/AddItemDialog";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { appConfig } from "@/lib/app-config";
import { cn } from "@/lib/utils";
import { isNavItemActive, NAV_ITEMS, type NavIcon } from "./nav-items";

export interface AppNavProps {
  userName: string;
  avatarColor: string;
  /** Profile picture URL (https) when known; falls back to the initial avatar. */
  avatarUrl?: string | null;
}

const NAV_ICONS: Record<NavIcon, LucideIcon> = {
  home: Home,
  library: BookMarked,
  wishlist: Heart,
  reviews: Star,
  trending: TrendingUp,
};

/**
 * Persistent app shell header (DL-46): a top brand bar with the product mark,
 * a primary "Add item" action, and account access, above a horizontal tab
 * navigation using the reference IA. Client-routed; the active tab is marked
 * with aria-current; sign-out posts to the logout endpoint.
 */
export function AppNav({ userName, avatarColor, avatarUrl }: AppNavProps): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut(): Promise<void> {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <header className="border-b border-border bg-background">
      {/* Brand bar */}
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-md bg-primary font-semibold text-primary-foreground"
          >
            {appConfig.name.charAt(0)}
          </span>
          <span className="leading-tight">
            <span className="block font-medium">{appConfig.name}</span>
            <span className="block text-xs text-muted-foreground">{appConfig.tagline}</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <form action="/search" role="search" className="hidden items-center gap-2 sm:flex">
            <label htmlFor="global-search" className="sr-only">
              Search media
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                id="global-search"
                name="q"
                type="search"
                placeholder="Search media…"
                className="h-9 w-44 rounded-md border border-border bg-input-background pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-56"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
          <AddItemDialog />
          <Link
            href="/profile"
            aria-label={`${userName} — profile and account`}
            className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <UserAvatar name={userName} color={avatarColor} src={avatarUrl} />
            <span className="hidden text-sm font-medium sm:inline">{userName}</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={signOut} disabled={signingOut} aria-label="Sign out">
            <LogOut aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Tab navigation */}
      <nav aria-label="Sections" className="mx-auto w-full max-w-6xl px-2 sm:px-4">
        <ul className="flex gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const active = isNavItemActive(pathname, item.href);
            const Icon = NAV_ICONS[item.icon];
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
