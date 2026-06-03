import { redirect } from "next/navigation";
import { LibraryCard } from "@/components/library/LibraryCard";
import { MediaSearchBox } from "@/components/media/MediaSearchBox";
import { MediaTypeFilter } from "@/components/media/MediaTypeFilter";
import { getDb } from "@/db/client";
import { listEntriesForUser, listMedia, listTagsByEntryIds } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/current-user";
import { composeShelfItems, filterShelfItemsByQuery, filterShelfItemsByType } from "@/lib/library-view";
import { mediaTypeCounts, resolveActiveType, typeFilterHrefFactory } from "@/lib/media-type";
import { firstParam } from "@/lib/search-params";

/** Reviews (DL-49): the user's reviewed items showing ratings and review text,
 * with review editing, a media-type filter, and a scoped search (media-search DL-82). */
export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[]; q?: string | string[] }>;
}): Promise<React.JSX.Element> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { type, q } = await searchParams;
  const query = firstParam(q) ?? "";
  const db = getDb();
  const [entries, media] = await Promise.all([listEntriesForUser(db, user.id), listMedia(db)]);
  const reviewed = composeShelfItems(entries, media).filter(({ entry }) => entry.rating !== null);

  const options = mediaTypeCounts(reviewed.map(({ item }) => item));
  const activeType = resolveActiveType(firstParam(type), options);
  const visible = filterShelfItemsByQuery(filterShelfItemsByType(reviewed, activeType), query);
  const hrefFor = typeFilterHrefFactory({ basePath: "/reviews", preserve: { q: query } });
  const tagsByEntry = await listTagsByEntryIds(db, visible.map(({ entry }) => entry.id));

  return (
    <section aria-labelledby="reviews-title" className="flex flex-col gap-4">
      <h1 id="reviews-title" className="text-2xl font-medium">
        Reviews
      </h1>
      {/* Scoped search stays available even with no reviews yet so it returns a
          graceful "no matches" rather than the global provider search. */}
      <div className="flex flex-col gap-3">
        <MediaSearchBox
          action="/reviews"
          query={query}
          ariaLabel="Search your reviews"
          hidden={activeType === "all" ? {} : { type: activeType }}
        />
        {reviewed.length > 0 ? (
          <MediaTypeFilter
            options={options}
            activeValue={activeType}
            hrefFor={hrefFor}
            ariaLabel="Filter reviews by media type"
          />
        ) : null}
      </div>
      {visible.length === 0 ? (
        reviewed.length === 0 && !query ? (
          <p className="py-4 text-muted-foreground">You haven’t reviewed anything yet.</p>
        ) : (
          <p className="py-4 text-muted-foreground">No reviews match your search.</p>
        )
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(({ entry, item }) => (
            <li key={entry.id}>
              <LibraryCard item={item} entry={entry} tags={tagsByEntry.get(entry.id) ?? []} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
