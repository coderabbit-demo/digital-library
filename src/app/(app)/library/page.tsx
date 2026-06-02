import { redirect } from "next/navigation";
import { LibraryCard } from "@/components/library/LibraryCard";
import { MediaTypeFilter } from "@/components/media/MediaTypeFilter";
import { getDb } from "@/db/client";
import { listEntriesForUser, listMedia, listTagsByEntryIds } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/current-user";
import { composeShelfItems } from "@/lib/library-view";
import { mediaTypeCounts, resolveActiveType, typeFilterHrefFactory } from "@/lib/media-type";
import { firstParam } from "@/lib/search-params";

/** Library (DL-49): the full collection across types, with a media-type filter
 * and per-item actions, preserving shelf behavior (Req 11.1, 8.x). */
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[] }>;
}): Promise<React.JSX.Element> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { type } = await searchParams;
  const db = getDb();
  const [entries, media] = await Promise.all([listEntriesForUser(db, user.id), listMedia(db)]);
  const items = composeShelfItems(entries, media);

  const options = mediaTypeCounts(items.map(({ item }) => item));
  const activeType = resolveActiveType(firstParam(type), options);
  const visible = activeType === "all" ? items : items.filter(({ item }) => item.type === activeType);
  const hrefFor = typeFilterHrefFactory({ basePath: "/library" });
  // Fetch tags only for the rows actually rendered (filtered subset).
  const tagsByEntry = await listTagsByEntryIds(db, visible.map(({ entry }) => entry.id));

  return (
    <section aria-labelledby="library-title" className="flex flex-col gap-4">
      <h1 id="library-title" className="text-2xl font-medium">
        My Library
      </h1>
      <MediaTypeFilter options={options} activeValue={activeType} hrefFor={hrefFor} />
      {visible.length === 0 ? (
        <p className="py-4 text-muted-foreground">Nothing here yet. Use “Add item” to get started.</p>
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
