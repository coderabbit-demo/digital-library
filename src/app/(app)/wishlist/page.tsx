import { redirect } from "next/navigation";
import { LibraryCard } from "@/components/library/LibraryCard";
import { getDb } from "@/db/client";
import { listEntriesForUser, listMedia, listTagsByEntryIds } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/current-user";
import { composeShelfItems, filterShelfItems } from "@/lib/library-view";

/** Wishlist (DL-49): the user's wishlist-status items, with shelf actions
 * (Req 11.2). */
export default async function WishlistPage(): Promise<React.JSX.Element> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const db = getDb();
  const [entries, media] = await Promise.all([listEntriesForUser(db, user.id), listMedia(db)]);
  const items = filterShelfItems(composeShelfItems(entries, media), "wishlist");
  const tagsByEntry = await listTagsByEntryIds(db, items.map(({ entry }) => entry.id));

  return (
    <section aria-labelledby="wishlist-title" className="flex flex-col gap-4">
      <h1 id="wishlist-title" className="text-2xl font-medium">
        Wishlist
      </h1>
      {items.length === 0 ? (
        <p className="py-4 text-muted-foreground">Nothing on your wishlist yet.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ entry, item }) => (
            <li key={entry.id}>
              <LibraryCard item={item} entry={entry} tags={tagsByEntry.get(entry.id) ?? []} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
