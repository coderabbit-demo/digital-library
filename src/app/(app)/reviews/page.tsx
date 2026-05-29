import { redirect } from "next/navigation";
import { ReviewForm } from "@/components/library/ReviewForm";
import { BookCover } from "@/components/ui/BookCover";
import { getDb } from "@/db/client";
import { listEntriesForUser, listMedia } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/current-user";
import { composeShelfItems } from "@/lib/library-view";

/**
 * Reviews (DL-46): the user's reviewed items with ratings and review text, and
 * the ability to edit a review. Interim presentation; DL-49 brings the design.
 */
export default async function ReviewsPage(): Promise<React.JSX.Element> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const db = getDb();
  const [entries, media] = await Promise.all([listEntriesForUser(db, user.id), listMedia(db)]);
  const reviewed = composeShelfItems(entries, media).filter(({ entry }) => entry.rating !== null);

  return (
    <section aria-labelledby="reviews-title">
      <h1 id="reviews-title">Reviews</h1>
      {reviewed.length === 0 ? (
        <p className="empty-state">You haven’t reviewed anything yet.</p>
      ) : (
        <ul className="shelf-grid">
          {reviewed.map(({ entry, item }) => (
            <li key={entry.id} className="media-card">
              <BookCover title={item.title} theme={item.coverTheme} />
              <div className="card-body">
                <h3>{item.title}</h3>
                <p className="creator">{item.creator}</p>
                <p aria-label={`Rated ${entry.rating} out of 5`}>{"★".repeat(entry.rating ?? 0)}</p>
                {entry.review ? <blockquote>{entry.review}</blockquote> : null}
                <ReviewForm entryId={entry.id} rating={entry.rating ?? 5} review={entry.review} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
