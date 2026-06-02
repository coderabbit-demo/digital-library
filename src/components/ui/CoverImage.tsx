"use client";

import { useState } from "react";
import { CoverPlaceholder } from "./BookCover";

export interface CoverImageProps {
  src: string;
  title: string;
  theme?: string;
}

/**
 * Renders real cover art (cover-art DL-75): an https image loaded lazily and
 * without a referrer. If it fails to load, it falls back to the themed
 * placeholder so a dead URL never shows a broken image (Req 1.4, 1.5).
 */
export function CoverImage({ src, title, theme }: CoverImageProps): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  if (failed) return <CoverPlaceholder title={title} theme={theme} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- external cover hosts (Open Library / iTunes); next/image would need broad remotePatterns
    <img
      src={src}
      alt={`Cover of ${title}`}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="book-cover h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}
