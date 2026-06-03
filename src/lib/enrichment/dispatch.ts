/**
 * Per-type enrichment dispatch (media-detail-enrichment Req 1.6, 3.3, 3.4).
 *
 * Routes a media item to the providers for its type, runs them concurrently
 * (providers never throw, so one source failing or returning nothing never
 * suppresses another), and composes their partials into one typed enrichment.
 * An unknown type yields null. Only the agreed providers are used — no OMDb,
 * Last.fm, or Podcast Index.
 */
import type { MediaEnrichment } from "@/lib/types";
import { enrichFromGoogleBooks } from "./googlebooks";
import { enrichMusicFromItunes, enrichPodcastFromItunes } from "./itunes";
import { enrichMusicFromMusicBrainz } from "./musicbrainz";
import { enrichFromOpenLibrary } from "./openlibrary";
import { compactEnrichment, type EnrichmentFetchDeps, type EnrichmentOf, textList } from "./provider";
import { enrichFromTmdb } from "./tmdb";

type ItemRef = { type: string; title: string; creator: string };

async function enrichEbook(item: ItemRef, deps: EnrichmentFetchDeps): Promise<EnrichmentOf<"ebook"> | null> {
  const [google, openLibrary] = await Promise.all([
    enrichFromGoogleBooks(item, deps),
    enrichFromOpenLibrary(item, deps),
  ]);
  // Categories come from both sources; merge and cap rather than overwrite.
  const categories = textList([...(google?.categories ?? []), ...(openLibrary?.categories ?? [])]);
  return compactEnrichment("ebook", {
    pageCount: google?.pageCount,
    publisher: google?.publisher,
    publishedDate: google?.publishedDate,
    categories,
    isbn10: google?.isbn10,
    isbn13: google?.isbn13,
    averageRating: google?.averageRating,
    ratingsCount: google?.ratingsCount,
    openLibraryRating: openLibrary?.openLibraryRating,
    openLibraryRatingsCount: openLibrary?.openLibraryRatingsCount,
  });
}

async function enrichMusic(item: ItemRef, deps: EnrichmentFetchDeps): Promise<EnrichmentOf<"music"> | null> {
  const [itunes, musicBrainz] = await Promise.all([
    enrichMusicFromItunes(item, deps),
    enrichMusicFromMusicBrainz(item, deps),
  ]);
  return compactEnrichment("music", {
    genre: itunes?.genre,
    releaseDate: itunes?.releaseDate ?? musicBrainz?.releaseDate,
    trackCount: itunes?.trackCount ?? musicBrainz?.trackCount,
    discCount: musicBrainz?.discCount,
    label: musicBrainz?.label,
  });
}

/** Resolve enrichment for an item by its media type, or null when unavailable. */
export async function enrichItem(
  item: ItemRef,
  deps: EnrichmentFetchDeps = {},
): Promise<MediaEnrichment | null> {
  switch (item.type) {
    case "tv_movie":
      return enrichFromTmdb(item, deps);
    case "ebook":
      return enrichEbook(item, deps);
    case "music":
      return enrichMusic(item, deps);
    case "podcast":
      return enrichPodcastFromItunes(item, deps);
    default:
      return null;
  }
}
