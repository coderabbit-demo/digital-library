import { redirect } from "next/navigation";
import { LibraryCard } from "@/components/library/LibraryCard";
import { MediaTypeFilter } from "@/components/media/MediaTypeFilter";
import { getDb } from "@/db/client";
import { listEntriesForUser, listMedia, listTagsByEntryIds } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/current-user";
import { composeShelfItems, filterShelfItemsByType } from "@/lib/library-view";
import { mediaTypeCounts, resolveActiveType, typeFilterHrefFactory } from "@/lib/media-type";

/** Reviews (DL-49): the user's reviewed items showing ratings and review text,
 * with the ability to edit a review via the card's actions (Req 11.3) and a
 * media-type filter (media-type-filters Req 5). */
export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}): Promise<React.JSX.Element> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { type } = await searchParams;
  const db = getDb();
  const [entries, media] = await Promise.all([listEntriesForUser(db, user.id), listMedia(db)]);
  const reviewed = composeShelfItems(entries, media).filter(({ entry }) => entry.rating !== null);

  const options = mediaTypeCounts(reviewed.map(({ item }) => item));
  const activeType = resolveActiveType(type, options);
  const visible = filterShelfItemsByType(reviewed, activeType);
  const hrefFor = typeFilterHrefFactory({ basePath: "/reviews" });
  const tagsByEntry = await listTagsByEntryIds(db, visible.map(({ entry }) => entry.id));

  return (
    <section aria-labelledby="reviews-title" className="flex flex-col gap-4">
      <h1 id="reviews-title" className="text-2xl font-medium">
        Reviews
      </h1>
      {reviewed.length === 0 ? (
        <p className="py-4 text-muted-foreground">You haven’t reviewed anything yet.</p>
      ) : (
        <>
          <MediaTypeFilter
            options={options}
            activeValue={activeType}
            hrefFor={hrefFor}
            ariaLabel="Filter reviews by media type"
          />
          {visible.length === 0 ? (
            <p className="py-4 text-muted-foreground">No reviews for this type yet.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map(({ entry, item }) => (
                <li key={entry.id}>
                  <LibraryCard item={item} entry={entry} tags={tagsByEntry.get(entry.id) ?? []} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
