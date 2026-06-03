"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * On-demand enrichment trigger (media-detail-enrichment Req 2.1, 2.4, 7.1).
 * Rendered only for an item whose enrichment has never been attempted. On mount
 * it asks the server to resolve+persist enrichment once; if any was found it
 * refreshes so the now-stored fields render. Failures are ignored (the section
 * shows its unavailable state), and the request fires at most once per mount.
 */
export function EnrichmentResolver({ mediaItemId }: { mediaItemId: string }): null {
  const router = useRouter();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    let active = true;
    void (async () => {
      try {
        const res = await fetch("/api/enrichment", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mediaItemId }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { enrichment: unknown };
        if (active && data.enrichment) router.refresh();
      } catch {
        // best-effort; the section's unavailable state remains
      }
    })();
    return () => {
      active = false;
    };
  }, [mediaItemId, router]);

  return null;
}
