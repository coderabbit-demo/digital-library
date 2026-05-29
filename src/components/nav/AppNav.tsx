"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/ui/BrandMark";
import { Avatar } from "@/components/ui/Avatar";
import { isNavItemActive, NAV_ITEMS } from "./nav-items";

export interface AppNavProps {
  userName: string;
  avatarColor: string;
}

/**
 * Persistent navigation shown on every signed-in page (DL-28). Uses client
 * routing (no full reload), marks the active link with aria-current, and signs
 * out via the logout endpoint.
 */
export function AppNav({ userName, avatarColor }: AppNavProps): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut(): Promise<void> {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      // Navigate regardless: the client session should end even if the request fails.
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <aside className="account-rail" aria-label="Primary">
      <BrandMark />
      <div className="signed-in-card">
        <Avatar name={userName} color={avatarColor} />
        <strong>{userName}</strong>
      </div>
      <nav aria-label="Sections">
        <ul className="rail-nav">
          {NAV_ITEMS.map((item) => {
            const active = isNavItemActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? "page" : undefined}>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <button type="button" className="subtle-button" onClick={signOut} disabled={signingOut}>
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </aside>
  );
}
