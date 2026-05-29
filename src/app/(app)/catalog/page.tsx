import { redirect } from "next/navigation";
import { CustomBookForm } from "@/components/catalog/CustomBookForm";
import { ShelfStatusButtons } from "@/components/library/ShelfStatusButtons";
import { BookCover } from "@/components/ui/BookCover";
import { Pill } from "@/components/ui/Pill";
import { SegmentedLinks } from "@/components/ui/SegmentedLinks";
import { getDb } from "@/db/client";
import { listEntriesForUser, listMedia } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/current-user";
import { distinctGenres, filterByGenre, genreHref, resolveGenre } from "@/lib/catalog-view";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>;
}): Promise<React.JSX.Element> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { genre: genreParam } = await searchParams;
  const db = getDb();
  const [media, entries] = await Promise.all([listMedia(db), listEntriesForUser(db, user.id)]);
  const ownedIds = new Set(entries.map((e) => e.mediaItemId));
  const genres = distinctGenres(media);
  const genre = resolveGenre(genreParam, genres);
  const visible = filterByGenre(media, genre);
  const options = [
    { value: "all", label: "All genres", href: genreHref("all") },
    ...genres.map((g) => ({ value: g, label: g, href: genreHref(g) })),
  ];

  return (
    <section aria-labelledby="catalog-title">
      <h1 id="catalog-title">Catalog</h1>
      <SegmentedLinks options={options} activeValue={genre} ariaLabel="Filter catalog by genre" />
      <ul className="catalog-grid">
        {visible.map((item) => (
          <li key={item.id} className="media-card">
            <BookCover title={item.title} theme={item.coverTheme} />
            <div className="card-body">
              <Pill>{item.genre}</Pill>
              <h3>{item.title}</h3>
              <p className="creator">
                {item.creator} · {item.language}
              </p>
              {ownedIds.has(item.id) ? <p className="owned-note">In your library</p> : null}
              <ShelfStatusButtons mediaItemId={item.id} />
            </div>
          </li>
        ))}
      </ul>
      <CustomBookForm />
    </section>
  );
}
