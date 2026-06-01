/**
 * Shared media-type filter (DL-47; relocated for reuse in DL-73): a segmented
 * pill group with per-type counts and an "All" default, driven entirely by the
 * data. Link-based so it works in server components; the active option is marked
 * with aria-current. Reused across the Library, Wishlist, Reviews, Trending
 * page, and Home Trending section.
 */
import Link from "next/link";
import type { MediaTypeCount } from "@/lib/media-type";
import { cn } from "@/lib/utils";

export interface MediaTypeFilterProps {
  options: readonly MediaTypeCount[];
  activeValue: string;
  hrefFor: (value: string) => string;
  ariaLabel?: string;
}

export function MediaTypeFilter({
  options,
  activeValue,
  hrefFor,
  ariaLabel = "Filter by media type",
}: MediaTypeFilterProps): React.JSX.Element {
  return (
    <nav aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === activeValue;
        return (
          <Link
            key={option.value}
            href={hrefFor(option.value)}
            aria-current={active ? "true" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-xs",
                active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
              )}
            >
              {option.count}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
