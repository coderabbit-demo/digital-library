import { redirect } from "next/navigation";
import { ReviewForm } from "@/components/library/ReviewForm";
import { ShelfStatusButtons } from "@/components/library/ShelfStatusButtons";
import { BookCover } from "@/components/ui/BookCover";
import { Pill } from "@/components/ui/Pill";
import { SegmentedLinks } from "@/components/ui/SegmentedLinks";
import { getDb } from "@/db/client";
import { listEntriesForUser, listMedia } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/current-user";
import {
  composeShelfItems,
  filterShelfItems,
  resolveShelf,
  SHELF_FILTERS,
  shelfHref,
  statusLabel,
} from "@/lib/library-view";

export default async function ShelvesPage({
  searchParams,
}: {
  searchParams: Promise<{ shelf?: string }>;
}): Promise<React.JSX.Element> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { shelf: shelfParam } = await searchParams;
  const db = getDb();
  const [entries, media] = await Promise.all([listEntriesForUser(db, user.id), listMedia(db)]);
  const items = composeShelfItems(entries, media);
  const shelf = resolveShelf(shelfParam);
  const visible = filterShelfItems(items, shelf);
  const options = SHELF_FILTERS.map((f) => ({ value: f.value, label: f.label, href: shelfHref(f.value) }));

  return (
    <section aria-labelledby="shelves-title">
      <h1 id="shelves-title">Shelves</h1>
      <SegmentedLinks options={options} activeValue={shelf} ariaLabel="Filter shelves" />
      {visible.length === 0 ? (
        <p className="empty-state">No books on this shelf yet.</p>
      ) : (
        <ul className="shelf-grid">
          {visible.map(({ entry, item }) => (
            <li key={entry.id} className="media-card">
              <BookCover title={item.title} theme={item.coverTheme} />
              <div className="card-body">
                <Pill>{statusLabel(entry.status)}</Pill>
                <h3>{item.title}</h3>
                <p className="creator">
                  {item.creator} · {item.genre} · {item.language}
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
