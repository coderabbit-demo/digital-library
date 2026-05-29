/**
 * Shelves route shell (DL-27). The library UI — shelf filtering, status
 * actions, and reviews — is built in Story DL-8 (DL-32).
 */
export default function ShelvesPage(): React.JSX.Element {
  return (
    <section aria-labelledby="shelves-title">
      <h1 id="shelves-title">Shelves</h1>
      <p>Your wishlist, currently reading, and finished books will appear here.</p>
    </section>
  );
}
