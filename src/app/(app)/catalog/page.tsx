/**
 * Catalog route shell (DL-27). Genre filtering, add-to-shelf, and the custom
 * e-book form are built in Story DL-8 (DL-33).
 */
export default function CatalogPage(): React.JSX.Element {
  return (
    <section aria-labelledby="catalog-title">
      <h1 id="catalog-title">Catalog</h1>
      <p>Browse the catalog and add books to your shelves here.</p>
    </section>
  );
}
