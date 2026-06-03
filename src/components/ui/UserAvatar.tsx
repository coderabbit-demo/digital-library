"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface UserAvatarProps {
  /** Display name; its first letter is the fallback initial. */
  name: string;
  /** Avatar background color for the initial fallback. */
  color: string;
  /** Profile picture URL (https) when known; otherwise the initial is shown. */
  src?: string | null;
  className?: string;
}

/**
 * The signed-in user's avatar (google-auth DL-80): the stored profile picture
 * when present — loaded lazily and without a referrer — falling back to the
 * initial-and-color avatar when absent or on image load error.
 */
export function UserAvatar({ name, color, src, className }: UserAvatarProps): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external avatar host (Google); next/image would need broad remotePatterns
      <img
        src={src}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        className={cn("size-8 rounded-full object-cover", className)}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn("grid size-8 place-items-center rounded-full text-sm font-semibold text-white", className)}
      style={{ backgroundColor: color }}
    >
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}
