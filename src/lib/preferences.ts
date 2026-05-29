/**
 * Media preferences helpers (DL-22). Defensive normalization of client-supplied
 * preferences into the typed shape, coercing non-arrays to empty arrays.
 */
import type { Preferences } from "@/lib/types";

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function emptyPreferences(): Preferences {
  return {
    books: { favoriteAuthors: [], favoriteGenres: [], languages: [] },
    music: { favoriteArtists: [], favoriteGenres: [] },
    podcasts: { topics: [] },
    streaming: { favoriteGenres: [] },
  };
}

export function normalizePreferences(raw: unknown): Preferences {
  const root = asObject(raw);
  const books = asObject(root.books);
  const music = asObject(root.music);
  const podcasts = asObject(root.podcasts);
  const streaming = asObject(root.streaming);
  return {
    books: {
      favoriteAuthors: stringArray(books.favoriteAuthors),
      favoriteGenres: stringArray(books.favoriteGenres),
      languages: stringArray(books.languages),
    },
    music: {
      favoriteArtists: stringArray(music.favoriteArtists),
      favoriteGenres: stringArray(music.favoriteGenres),
    },
    podcasts: { topics: stringArray(podcasts.topics) },
    streaming: { favoriteGenres: stringArray(streaming.favoriteGenres) },
  };
}
