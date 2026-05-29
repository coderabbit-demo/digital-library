import Link from "next/link";
import { filterHref } from "@/lib/media-type";
import type { MediaTypeOption } from "@/lib/types";

export interface FeedFilterProps {
  options: MediaTypeOption[];
  activeValue: string;
}

/**
 * Media-type filter (DL-31). Each option is a link that sets the `type` query,
 * so the selection persists across refresh and works without client JS
 * (Req 5.5, 5.7). The active option is marked for assistive tech (Req 13.3).
 */
export function FeedFilter({ options, activeValue }: FeedFilterProps): React.JSX.Element {
  return (
    <div className="segmented-control" role="group" aria-label="Filter feed by media type">
      {options.map((option) => {
        const active = option.value === activeValue;
        return (
          <Link
            key={option.value}
            href={filterHref(option.value)}
            aria-current={active ? "true" : undefined}
            className={active ? "is-active" : undefined}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
