import { CoverImage } from "./CoverImage";

export interface BookCoverProps {
  /** Title used to derive the cover initials and the image's accessible label. */
  title: string;
  /** Cover theme key (e.g. "teal", "gold"); falls back to "teal". */
  theme?: string;
  /** Real cover art URL (https); when present, shown instead of the placeholder (cover-art DL-75). */
  imageUrl?: string | null;
}

/** Up to three leading initials, mirroring the prototype's cover treatment. */
export function coverInitials(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word[0] ?? "")
    .join("");
}

/** Themed gradient tile with derived initials — the fallback when there is no art. */
export function CoverPlaceholder({ title, theme = "teal" }: { title: string; theme?: string }): React.JSX.Element {
  return (
    <div className={`book-cover cover-${theme}`} aria-hidden="true">
      <span>{coverInitials(title)}</span>
    </div>
  );
}

/**
 * Media cover tile (DL-13; real art added in cover-art DL-75). Shows the cover
 * image when an https URL is provided (falling back to the themed placeholder on
 * load error), otherwise the themed initials.
 */
export function BookCover({ title, theme = "teal", imageUrl }: BookCoverProps): React.JSX.Element {
  if (imageUrl) return <CoverImage src={imageUrl} title={title} theme={theme} />;
  return <CoverPlaceholder title={title} theme={theme} />;
}
