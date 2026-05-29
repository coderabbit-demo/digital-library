import Link from "next/link";

export interface HeroProps {
  userName: string;
}

/**
 * Home hero (DL-29). The backdrop is a CSS gradient (`.home-hero`) rather than
 * an <img>, so there is no broken-image state if an asset is unavailable
 * (Req 3.3, 3.4). Includes a name-aware greeting and a CTA to the catalog.
 */
export function Hero({ userName }: HeroProps): React.JSX.Element {
  return (
    <section className="home-hero" aria-labelledby="hero-title">
      <p className="eyebrow">Welcome back</p>
      <h1 id="hero-title">Hello, {userName}</h1>
      <p>Track what you’re reading and see what the community is into.</p>
      <Link className="primary-button" href="/catalog">
        Browse the catalog
      </Link>
    </section>
  );
}
