import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CoverResolver } from "@/components/item/CoverResolver";
import { EnrichmentDetails } from "@/components/item/EnrichmentDetails";
import { EnrichmentResolver } from "@/components/item/EnrichmentResolver";
import { ItemActions } from "@/components/item/ItemActions";
import { ReviewsSection } from "@/components/item/ReviewsSection";
import { Badge } from "@/components/ui/badge";
import { BookCover } from "@/components/ui/BookCover";
import { StarRating } from "@/components/ui/StarRating";
import { getDb } from "@/db/client";
import { findEntry, findMediaById, listTagsByEntryIds } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/current-user";
import { isSupportedCoverType } from "@/lib/covers/resolve";
import { itemBackTarget } from "@/lib/item-nav";
import { statusLabel } from "@/lib/library-view";
import { formatMetaLine } from "@/lib/media-metadata";
import { mediaTypeLabel } from "@/lib/media-type";
import { firstParam } from "@/lib/search-params";

/**
 * Media item detail page (media-detail DL-68): full metadata/description for one
 * item plus the user's status/rating/review/tags, with shelf + review actions.
 * Authenticated; unknown ids render the not-found boundary.
 */
export default async function ItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string | string[]; q?: string | string[]; type?: string | string[] }>;
}): Promise<React.JSX.Element> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const { from, q, type } = await searchParams;
  // Preserve the origin's query/type so "Back to …" returns to the same results.
  const back = itemBackTarget(firstParam(from), { q: firstParam(q), type: firstParam(type) });
  const db = getDb();
  const item = await findMediaById(db, id);
  if (!item) notFound();

  const entry = await findEntry(db, user.id, id);
  const tags = entry ? ((await listTagsByEntryIds(db, [entry.id])).get(entry.id) ?? []) : [];

  // First view of an art-less, never-checked, supported item: resolve its cover
  // on demand (the placeholder shows until it lands). Cached thereafter.
  const needsCover = !item.artworkUrl && !item.artworkCheckedAt && isSupportedCoverType(item.type);
  // First view of a never-enriched item: resolve enrichment on demand and cache
  // it (media-detail-enrichment Req 2). The sections fill in once it lands.
  const needsEnrichment = !item.enrichmentCheckedAt;

  return (
    <section aria-labelledby="item-title" className="flex flex-col gap-6">
      <Link
        href={back.href}
        className="inline-flex w-fit items-center gap-1 rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to {back.label}
      </Link>

      <div className="grid gap-6 sm:grid-cols-[8rem_minmax(0,1fr)]">
        <BookCover title={item.title} theme={item.coverTheme} imageUrl={item.artworkUrl} />
        {needsCover ? <CoverResolver mediaItemId={item.id} /> : null}
        {needsEnrichment ? <EnrichmentResolver mediaItemId={item.id} /> : null}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{mediaTypeLabel(item.type)}</Badge>
            {entry ? <Badge variant="outline">{statusLabel(entry.status)}</Badge> : null}
          </div>
          <h1 id="item-title" className="text-2xl font-medium">
            {item.title}
          </h1>
          <p className="text-muted-foreground">{item.creator}</p>
          <p className="text-sm text-muted-foreground">{formatMetaLine(item)}</p>
          {typeof entry?.rating === "number" ? <StarRating rating={entry.rating} /> : null}
          {item.description ? <p className="leading-relaxed">{item.description}</p> : null}
          {tags.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <li key={tag}>
                  <Badge variant="muted">{tag}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <EnrichmentDetails enrichment={item.enrichment} />

      <ReviewsSection item={item} />

      <ItemActions
        mediaItemId={item.id}
        entry={
          entry
            ? { id: entry.id, status: entry.status, rating: entry.rating, review: entry.review }
            : null
        }
        tags={tags}
      />
    </section>
  );
}
