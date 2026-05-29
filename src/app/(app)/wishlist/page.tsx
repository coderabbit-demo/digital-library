import { redirect } from "next/navigation";
import { ShelfStatusButtons } from "@/components/library/ShelfStatusButtons";
import { BookCover } from "@/components/ui/BookCover";
import { Pill } from "@/components/ui/Pill";
import { getDb } from "@/db/client";
import { listEntriesForUser, listMedia } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/current-user";
import { composeShelfItems, filterShelfItems } from "@/lib/library-view";

/**
 * Wishlist (DL-46): the user's wishlist-status items, with shelf actions.
 * Interim presentation; DL-49 brings the enriched design.
 */
export default async function WishlistPage(): Promise<React.JSX.Element> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const db = getDb();
  const [entries, media] = await Promise.all([listEntriesForUser(db, user.id), listMedia(db)]);
  const items = filterShelfItems(composeShelfItems(entries, media), "wishlist");

  return (
    <section aria-labelledby="wishlist-title">
      <h1 id="wishlist-title">Wishlist</h1>
      {items.length === 0 ? (
        <p className="empty-state">Nothing on your wishlist yet.</p>
      ) : (
        <ul className="shelf-grid">
          {items.map(({ entry, item }) => (
            <li key={entry.id} className="media-card">
              <BookCover title={item.title} theme={item.coverTheme} />
              <div className="card-body">
                <Pill>Wishlist</Pill>
                <h3>{item.title}</h3>
                <p className="creator">
                  {item.creator} · {item.genre}
                </p>
                <ShelfStatusButtons mediaItemId={item.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
