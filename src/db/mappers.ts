/**
 * Pure mappers from database rows to the shared domain model (DL-15).
 * Centralizing conversion (e.g. Date -> ISO string, narrowing DB text to the
 * domain unions guarded by check constraints) keeps the query layer thin.
 */
import type {
  Activity,
  ActivityAction,
  FeedEntryDTO,
  LibraryEntry,
  LibraryStatus,
  MediaItem,
  Preferences,
  User,
  UserKind,
} from "@/lib/types";
import type {
  ActivityRow,
  LibraryEntryRow,
  MediaItemRow,
  PreferencesRow,
  UserRow,
} from "./schema";

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    kind: row.kind as UserKind,
    name: row.name,
    email: row.email,
    avatarColor: row.avatarColor,
    bio: row.bio,
  };
}

export function toMediaItem(row: MediaItemRow): MediaItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    creator: row.creator,
    genre: row.genre,
    language: row.language,
    description: row.description,
    coverTheme: row.coverTheme,
  };
}

export function toLibraryEntry(row: LibraryEntryRow): LibraryEntry {
  return {
    id: row.id,
    userId: row.userId,
    mediaItemId: row.mediaItemId,
    status: row.status as LibraryStatus,
    rating: row.rating,
    review: row.review,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toActivity(row: ActivityRow): Activity {
  return {
    id: row.id,
    userId: row.userId,
    mediaItemId: row.mediaItemId,
    action: row.action as ActivityAction,
    detail: row.detail,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toPreferences(row: PreferencesRow): Preferences {
  return {
    books: row.books,
    music: row.music,
    podcasts: row.podcasts,
    streaming: row.streaming,
  };
}

/** Assemble a feed row from an activity joined to its actor and media item. */
export function toFeedEntry(
  activity: ActivityRow,
  actor: UserRow,
  media: MediaItemRow,
): FeedEntryDTO {
  return {
    id: activity.id,
    actorName: actor.name,
    avatarColor: actor.avatarColor,
    detail: activity.detail,
    itemTitle: media.title,
    mediaType: media.type,
    createdAt: activity.createdAt.toISOString(),
  };
}
