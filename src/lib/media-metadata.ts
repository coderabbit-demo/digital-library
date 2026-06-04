/**
 * Type-specific media metadata (media-platform-v2 Req 1.1, 1.4, 1.5).
 *
 * Parses an untrusted jsonb/body value into the discriminated
 * `MediaItemMetadata` union at the boundary so it is never consumed as `any`,
 * and derives a type-appropriate meta line for cards. Unknown media types carry
 * no metadata (null) and fall back to a humanized label elsewhere.
 */
import type { MediaItem, MediaItemMetadata, MediaKind } from "@/lib/types";
import { MEDIA_KINDS } from "@/lib/types";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asPositiveInt(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export function isMediaKind(type: string): type is MediaKind {
  return (MEDIA_KINDS as readonly string[]).includes(type);
}

/**
 * Map an open media type to its closed metadata/enrichment kind. Films and TV
 * shows (`movie`, `tv`) and the legacy combined `tv_movie` all share the `video`
 * shape; other types map to themselves. Unknown types have no shape (null).
 * This is the single source of truth for the type→kind relationship, so the
 * stored `kind` is always derived from the type at the boundary (movie-tv-types).
 */
export function mediaTypeToMetadataKind(type: string): MediaKind | null {
  switch (type) {
    case "ebook":
    case "music":
    case "podcast":
      return type;
    case "movie":
    case "tv":
    case "tv_movie":
      return "video";
    default:
      return null;
  }
}

/** Validate an untrusted value into the metadata union for the given type. */
export function parseMediaMetadata(type: string, raw: unknown): MediaItemMetadata | null {
  const kind = mediaTypeToMetadataKind(type);
  if (!kind) return null;
  const r = asRecord(raw);
  switch (kind) {
    case "ebook": {
      const pages = asPositiveInt(r.pages);
      return pages !== undefined ? { kind: "ebook", pages } : { kind: "ebook" };
    }
    case "music": {
      const album = asText(r.album);
      return album !== undefined ? { kind: "music", album } : { kind: "music" };
    }
    case "podcast": {
      const show = asText(r.show);
      const episodeCount = asPositiveInt(r.episodeCount);
      return {
        kind: "podcast",
        ...(show !== undefined ? { show } : {}),
        ...(episodeCount !== undefined ? { episodeCount } : {}),
      };
    }
    case "video": {
      const runtimeMinutes = asPositiveInt(r.runtimeMinutes);
      const seasons = asPositiveInt(r.seasons);
      return {
        kind: "video",
        ...(runtimeMinutes !== undefined ? { runtimeMinutes } : {}),
        ...(seasons !== undefined ? { seasons } : {}),
      };
    }
  }
}

function pluralize(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

/** A type-appropriate secondary meta line for a media card (Req 8.1). */
export function formatMetaLine(item: MediaItem): string {
  const meta = item.metadata ?? null;
  switch (meta?.kind) {
    case "music":
      return meta.album ?? item.genre;
    case "podcast": {
      const parts = [meta.show ?? item.genre];
      if (meta.episodeCount !== undefined) parts.push(pluralize(meta.episodeCount, "episode"));
      return parts.join(" · ");
    }
    case "video": {
      const parts = [item.genre];
      if (meta.seasons !== undefined) parts.push(pluralize(meta.seasons, "season"));
      return parts.join(" · ");
    }
    case "ebook":
    default:
      return item.genre;
  }
}
