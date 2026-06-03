import { Suspense } from "react";
import type { MediaEnrichment, MediaItem } from "@/lib/types";
import { selectScoreBadges, typeHasReviewsSection } from "@/lib/enrichment/display";
import { ReviewExcerpts } from "./ReviewExcerpts";

/**
 * Reviews & ratings for the item detail page (media-detail-enrichment Req 4).
 * Coverage degrades by type: movies/TV show the audience score then stream
 * review excerpts; books show rating scores (no review text exists); music and
 * podcasts have no free source, so the section is omitted entirely. Scores are
 * conveyed by text, not color.
 */
export function ReviewsSection({
  item,
}: {
  item: Pick<MediaItem, "type"> & { enrichment?: MediaEnrichment | null };
}): React.JSX.Element | null {
  if (!typeHasReviewsSection(item.type)) return null;

  const badges = selectScoreBadges(item.enrichment);
  const isTvMovie = item.type === "tv_movie";

  return (
    <section aria-labelledby="reviews-heading" className="flex flex-col gap-3">
      <h2 id="reviews-heading" className="text-lg font-medium">
        Ratings &amp; reviews
      </h2>

      {badges.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <li
              key={badge.source}
              className="flex flex-col rounded-md border border-border px-3 py-2"
            >
              <span className="text-sm font-medium">{badge.value}</span>
              <span className="text-xs text-muted-foreground">
                {badge.source}
                {badge.count ? ` · ${badge.count}` : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {isTvMovie ? (
        <Suspense
          fallback={
            <p className="text-sm text-muted-foreground" role="status">
              Loading reviews…
            </p>
          }
        >
          <ReviewExcerpts item={item} />
        </Suspense>
      ) : badges.length === 0 ? (
        <p className="text-sm text-muted-foreground" role="status">
          No ratings available yet.
        </p>
      ) : null}
    </section>
  );
}
