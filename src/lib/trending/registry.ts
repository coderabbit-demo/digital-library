/**
 * Static trending-provider registry (trending-now DL-53).
 *
 * The fan-out endpoint (DL-56) iterates this list, runs each configured
 * provider, and isolates failures. Concrete providers are added here in their
 * own stories: NYT books (DL-54) and Spotify music (DL-55).
 */
import type { TrendingProvider } from "./provider";

export const TRENDING_PROVIDERS: readonly TrendingProvider[] = [
  // nytBooksProvider,      // DL-54
  // spotifyMusicProvider,  // DL-55
];
