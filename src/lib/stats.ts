/**
 * Per-user reading stats (media-platform-v2 Req 3.2, 3.4). Pure aggregation
 * over the signed-in user's own library entries — the caller scopes the input
 * to that user, so these never read across users.
 */
import type { LibraryEntry } from "@/lib/types";

export interface UserStats {
  counts: { wishlist: number; current: number; finished: number; reviewed: number };
  /** Sum of recorded consumption progress (e.g. pages read). */
  totalPagesRead: number;
  /** Items on the "current" shelf. */
  inProgress: number;
}

export function computeUserStats(entries: readonly LibraryEntry[]): UserStats {
  const counts = { wishlist: 0, current: 0, finished: 0, reviewed: 0 };
  let totalPagesRead = 0;

  for (const entry of entries) {
    if (entry.status === "wishlist") counts.wishlist += 1;
    else if (entry.status === "current") counts.current += 1;
    else if (entry.status === "finished") counts.finished += 1;

    if (entry.rating != null) counts.reviewed += 1;
    totalPagesRead += entry.progress ?? 0;
  }

  return { counts, totalPagesRead, inProgress: counts.current };
}
