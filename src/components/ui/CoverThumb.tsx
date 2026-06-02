"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";

export interface CoverThumbProps {
  /** Cover art URL (https) when known; otherwise the icon tile is shown. */
  src?: string | null;
  /** Decorative by default — the item's title is shown alongside the thumbnail. */
  alt?: string;
  /** Media-type icon used for the fallback tile. */
  Icon: LucideIcon;
}

/**
 * Square cover thumbnail for list cards (cover-art DL-75). Shows the artwork
 * when present — loaded lazily, without a referrer — and falls back to a
 * media-type icon tile when there is no art or the image fails to load. Shared
 * by the library/wishlist/reviews cards and the trending card so every card
 * renders covers identically.
 */
export function CoverThumb({ src, alt = "", Icon }: CoverThumbProps): React.JSX.Element {
  const [failed, setFailed] = useState(false);

  // Reset on src change so a reused card (e.g. after filtering) retries the new
  // image instead of keeping a previous item's failed-fallback.
  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external cover hosts; next/image would need broad remotePatterns
      <img
        src={src}
        alt={alt}
        width={64}
        height={64}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="size-16 shrink-0 rounded-md object-cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="grid size-16 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"
    >
      <Icon className="size-6" />
    </div>
  );
}
