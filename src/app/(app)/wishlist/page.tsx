import { redirect } from "next/navigation";
import { LibraryCard } from "@/components/library/LibraryCard";
import { MediaTypeFilter } from "@/components/media/MediaTypeFilter";
import { getDb } from "@/db/client";
import { listEntriesForUser, listMedia, listTagsByEntryIds } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/current-user";
import { composeShelfItems, filterShelfItems, filterShelfItemsByType } from "@/lib/library-view";
import { mediaTypeCounts, resolveActiveType, typeFilterHrefFactory } from "@/lib/media-type";

/** Wishlist (DL-49): the user's wishlist-status items, with shelf actions
 * (Req 11.2) and a media-type filter (media-type-filters Req 4). */
export default async function WishlistPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}): Promise<React.JSX.Element> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { type } = await searchParams;
  const db = getDb();
  const [entries, media] = await Promise.all([listEntriesForUser(db, user.id), listMedia(db)]);
  const items = filterShelfItems(composeShelfItems(entries, media), "wishlist");

  const options = mediaTypeCounts(items.map(({ item }) => item));
  const activeType = resolveActiveType(type, options);
  const visible = filterShelfItemsByType(items, activeType);
  const hrefFor = typeFilterHrefFactory({ basePath: "/wishlist" });
  const tagsByEntry = await listTagsByEntryIds(db, visible.map(({ entry }) => entry.id));

  return (
    <section aria-labelledby="wishlist-title" className="flex flex-col gap-4">
      <h1 id="wishlist-title" className="text-2xl font-medium">
        Wishlist
      </h1>
      {items.length === 0 ? (
        <p className="py-4 text-muted-foreground">Nothing on your wishlist yet.</p>
      ) : (
        <>
          <MediaTypeFilter
            options={options}
            activeValue={activeType}
            hrefFor={hrefFor}
            ariaLabel="Filter wishlist by media type"
          />
          {visible.length === 0 ? (
            <p className="py-4 text-muted-foreground">No items of this type on your wishlist.</p>
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
