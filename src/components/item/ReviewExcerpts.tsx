import { Star } from "lucide-react";
import type { MediaEnrichment, MediaItem } from "@/lib/types";
import { fetchReviewExcerpts } from "@/lib/enrichment/reviews";

/**
 * Streamed TMDB review excerpts (media-detail-enrichment Req 4.2, 5). Async
 * server component rendered inside a Suspense boundary so it never blocks the
 * page. External text is rendered as plain text (no dangerouslySetInnerHTML);
 * outbound links are https-only and open with safe rel attributes. An empty
 * result renders an accessible "no written reviews" state.
 */
export async function ReviewExcerpts({
  item,
}: {
  item: Pick<MediaItem, "type"> & { enrichment?: MediaEnrichment | null };
}): Promise<React.JSX.Element> {
  const reviews = await fetchReviewExcerpts(item);

  if (reviews.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        No written reviews yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {reviews.map((review, i) => (
        <li key={`${review.author}-${i}`} className="rounded-md border border-border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{review.author}</span>
            {review.rating !== null ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="size-3" aria-hidden="true" />
                {review.rating.toFixed(1)} / 10
              </span>
            ) : null}
            <span className="text-xs text-muted-foreground">· via TMDB</span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{review.excerpt}</p>
          {review.url ? (
            <a
              href={review.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Read full review
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
