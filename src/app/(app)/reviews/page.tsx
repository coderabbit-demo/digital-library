import { redirect } from "next/navigation";
import { LibraryCard } from "@/components/library/LibraryCard";
import { getDb } from "@/db/client";
import { listEntriesForUser, listMedia, listTagsByEntryIds } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/current-user";
import { composeShelfItems } from "@/lib/library-view";

/** Reviews (DL-49): the user's reviewed items showing ratings and review text,
 * with the ability to edit a review via the card's actions (Req 11.3). */
export default async function ReviewsPage(): Promise<React.JSX.Element> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const db = getDb();
  const [entries, media] = await Promise.all([listEntriesForUser(db, user.id), listMedia(db)]);
  const reviewed = composeShelfItems(entries, media).filter(({ entry }) => entry.rating !== null);
  const tagsByEntry = await listTagsByEntryIds(db, reviewed.map(({ entry }) => entry.id));

  return (
    <section aria-labelledby="reviews-title" className="flex flex-col gap-4">
      <h1 id="reviews-title" className="text-2xl font-medium">
        Reviews
      </h1>
      {reviewed.length === 0 ? (
        <p className="py-4 text-muted-foreground">You haven’t reviewed anything yet.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviewed.map(({ entry, item }) => (
            <li key={entry.id}>
              <LibraryCard item={item} entry={entry} tags={tagsByEntry.get(entry.id) ?? []} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
