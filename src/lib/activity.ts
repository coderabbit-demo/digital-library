/**
 * Activity action/detail derivation (DL-24), ported from the prototype so feed
 * entries read naturally ("started reading", "marked it finished", …).
 */
import type { ActivityAction, LibraryStatus } from "@/lib/types";

export function actionForStatus(status: LibraryStatus): ActivityAction {
  if (status === "current") return "started";
  if (status === "finished") return "finished";
  return "added";
}

export function detailForStatus(status: LibraryStatus, hadEntry: boolean): string {
  if (status === "wishlist") {
    return hadEntry ? "moved it to their wishlist" : "added it to their wishlist";
  }
  if (status === "current") return "started reading";
  return "marked it finished";
}

export function reviewDetail(rating: number): string {
  return `rated it ${rating} star${rating === 1 ? "" : "s"}`;
}
