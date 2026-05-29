/**
 * Home (DL-27). The default signed-in landing page. The hero, reading-stats
 * panel, and community feed are added by Story DL-7; for now this is the
 * landing placeholder. Those regions live ONLY here, never on other pages.
 */
export default function HomePage(): React.JSX.Element {
  return (
    <section aria-labelledby="home-title">
      <h1 id="home-title">Home</h1>
      <p>Welcome to LibraryLoop. Your hero, reading stats, and community feed will appear here.</p>
    </section>
  );
}
