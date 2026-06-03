import { Search } from "lucide-react";

export interface MediaSearchBoxProps {
  /** Page path the form submits to (GET), e.g. "/library". */
  action: string;
  /** Current query, used to pre-fill the input. */
  query: string;
  /** Accessible label for the input. */
  ariaLabel: string;
  /** Sibling params to preserve across the search (e.g. the active media type). */
  hidden?: Record<string, string>;
}

/**
 * Scoped page search (media-search DL-82): a submit-based GET form that filters
 * the current page by query. Preserves sibling filter params (e.g. the active
 * media type) via hidden fields, and works without client JS.
 */
export function MediaSearchBox({ action, query, ariaLabel, hidden }: MediaSearchBoxProps): React.JSX.Element {
  return (
    <form action={action} role="search" className="relative max-w-sm">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        name="q"
        type="search"
        defaultValue={query}
        aria-label={ariaLabel}
        placeholder="Search…"
        className="h-9 w-full rounded-md border border-border bg-input-background pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </form>
  );
}
