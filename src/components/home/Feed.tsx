import { Avatar } from "@/components/ui/Avatar";
import type { FeedEntryDTO } from "@/lib/types";

export interface FeedProps {
  entries: FeedEntryDTO[];
}

/** Locale-aware, human-readable timestamp (Req 13.4); empty for invalid input. */
function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/** Community activity feed (DL-30; restyled DL-48). Entries arrive newest-first. */
export function Feed({ entries }: FeedProps): React.JSX.Element {
  if (entries.length === 0) {
    return <p className="py-4 text-muted-foreground">No community activity yet.</p>;
  }
  return (
    <ul className="mt-2 flex flex-col divide-y divide-border">
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-start gap-3 py-3">
          <Avatar name={entry.actorName} color={entry.avatarColor} />
          <div className="min-w-0">
            <p className="text-sm">
              <strong className="font-medium">{entry.actorName}</strong> {entry.detail}{" "}
              <strong className="font-medium">{entry.itemTitle}</strong>.
            </p>
            <time dateTime={entry.createdAt} className="text-xs text-muted-foreground">
              {formatTime(entry.createdAt)}
            </time>
          </div>
        </li>
      ))}
    </ul>
  );
}
