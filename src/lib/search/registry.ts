/**
 * Static search-provider registry (media-search DL-82). One provider per media
 * type, mirroring the trending registry; searchMedia iterates it.
 */
import { itunesMusicProvider, itunesPodcastsProvider } from "./itunes";
import { openLibraryBooksProvider } from "./openlibrary";
import { tmdbMoviesSearchProvider, tmdbTvSearchProvider } from "./tmdb";
import type { SearchProvider } from "./provider";

export const SEARCH_PROVIDERS: readonly SearchProvider[] = [
  openLibraryBooksProvider, // ebook (keyless)
  itunesMusicProvider, // music (keyless)
  itunesPodcastsProvider, // podcast (keyless)
  tmdbMoviesSearchProvider, // tv_movie (keyed)
  tmdbTvSearchProvider, // tv_movie (keyed)
];
