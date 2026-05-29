export interface BookCoverProps {
  /** Title used to derive the cover initials. */
  title: string;
  /** Cover theme key (e.g. "teal", "gold"); falls back to "teal". */
  theme?: string;
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

/** Gradient media cover tile with derived initials (DL-13). */
export function BookCover({ title, theme = "teal" }: BookCoverProps): React.JSX.Element {
  return (
    <div className={`book-cover cover-${theme}`} aria-hidden="true">
      <span>{coverInitials(title)}</span>
    </div>
  );
}
