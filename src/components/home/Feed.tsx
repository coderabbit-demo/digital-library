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

/** Community activity feed (DL-30). Entries arrive newest-first and resolved. */
export function Feed({ entries }: FeedProps): React.JSX.Element {
  if (entries.length === 0) {
    return <p className="empty-state">No community activity yet.</p>;
  }
  return (
    <ul className="feed-list">
      {entries.map((entry) => (
        <li key={entry.id} className="feed-item">
          <Avatar name={entry.actorName} color={entry.avatarColor} />
          <div>
            <p>
              <strong>{entry.actorName}</strong> {entry.detail}{" "}
              <strong>{entry.itemTitle}</strong>.
            </p>
            <time dateTime={entry.createdAt}>{formatTime(entry.createdAt)}</time>
          </div>
        </li>
      ))}
    </ul>
  );
}
