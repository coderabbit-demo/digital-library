import type { ReactNode } from "react";

export interface PillProps {
  children: ReactNode;
}

/** Rounded label chip used for genres, statuses, and tags (DL-13). */
export function Pill({ children }: PillProps): React.JSX.Element {
  return <span className="pill">{children}</span>;
}
