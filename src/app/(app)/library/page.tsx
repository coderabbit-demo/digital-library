import { redirect } from "next/navigation";
import { ReviewForm } from "@/components/library/ReviewForm";
import { ShelfStatusButtons } from "@/components/library/ShelfStatusButtons";
import { BookCover } from "@/components/ui/BookCover";
import { Pill } from "@/components/ui/Pill";
import { getDb } from "@/db/client";
import { listEntriesForUser, listMedia } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/current-user";
import { composeShelfItems, statusLabel } from "@/lib/library-view";

/**
 * Library (DL-46): the signed-in user's full collection across all media types.
 * Interim presentation reuses the existing card components; DL-47/DL-49 bring
 * the media-type filter and the enriched card design.
 */
export default async function LibraryPage(): Promise<React.JSX.Element> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const db = getDb();
  const [entries, media] = await Promise.all([listEntriesForUser(db, user.id), listMedia(db)]);
  const items = composeShelfItems(entries, media);

  return (
    <section aria-labelledby="library-title">
      <h1 id="library-title">My Library</h1>
      {items.length === 0 ? (
        <p className="empty-state">Your library is empty. Use “Add item” to get started.</p>
      ) : (
        <ul className="shelf-grid">
          {items.map(({ entry, item }) => (
            <li key={entry.id} className="media-card">
              <BookCover title={item.title} theme={item.coverTheme} />
              <div className="card-body">
                <Pill>{statusLabel(entry.status)}</Pill>
                <h3>{item.title}</h3>
                <p className="creator">
                  {item.creator} · {item.genre}
                </p>
                {entry.review ? <blockquote>{entry.review}</blockquote> : null}
                <ShelfStatusButtons mediaItemId={item.id} />
                {entry.status === "finished" ? (
                  <ReviewForm entryId={entry.id} rating={entry.rating ?? 5} review={entry.review} />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
