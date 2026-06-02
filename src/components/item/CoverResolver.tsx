"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * On-demand cover resolution trigger (cover-art DL-75). Rendered only for an
 * item that has no artwork, has never been checked, and is of a supported type.
 * On mount it asks the server to resolve+persist the cover once; if one is
 * found it refreshes so the now-stored image renders. Failures are ignored (the
 * placeholder stays), and the request fires at most once per mount.
 */
export function CoverResolver({ mediaItemId }: { mediaItemId: string }): null {
  const router = useRouter();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    let active = true;
    void (async () => {
      try {
        const res = await fetch("/api/cover", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mediaItemId }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { artworkUrl: string | null };
        if (active && data.artworkUrl) router.refresh();
      } catch {
        // best-effort; the themed placeholder remains
      }
    })();
    return () => {
      active = false;
    };
  }, [mediaItemId, router]);

  return null;
}
