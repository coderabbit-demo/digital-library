import Link from "next/link";

/** Rendered for any path that does not match a defined route (DL-27, Req 2.7). */
export default function NotFound(): React.JSX.Element {
  return (
    <main>
      <h1>Page not found</h1>
      <p>The page you’re looking for doesn’t exist.</p>
      <Link href="/">Go to Home</Link>
    </main>
  );
}
