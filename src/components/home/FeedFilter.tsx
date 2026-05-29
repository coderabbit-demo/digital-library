import Link from "next/link";
import { filterHref } from "@/lib/media-type";
import type { MediaTypeOption } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface FeedFilterProps {
  options: MediaTypeOption[];
  activeValue: string;
}

/**
 * Media-type filter (DL-31; restyled DL-48). Each option is a link that sets the
 * `type` query, so the selection persists across refresh and works without
 * client JS (Req 5.5, 5.7). The active option is marked for assistive tech.
 */
export function FeedFilter({ options, activeValue }: FeedFilterProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter feed by media type">
      {options.map((option) => {
        const active = option.value === activeValue;
        return (
          <Link
            key={option.value}
            href={filterHref(option.value)}
            aria-current={active ? "true" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
