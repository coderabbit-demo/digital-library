import type { CSSProperties } from "react";

export interface AvatarProps {
  /** Display name; the first letter is shown as the initial. */
  name: string;
  /** CSS color used as the avatar background. */
  color: string;
}

function initial(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}

/** Circular initial avatar tinted by the actor's color (DL-13). */
export function Avatar({ name, color }: AvatarProps): React.JSX.Element {
  const style = { "--avatar-color": color } as CSSProperties;
  return (
    <span className="avatar" style={style} aria-hidden="true">
      {initial(name)}
    </span>
  );
}
