import type { MediaEnrichment } from "@/lib/types";
import { selectEnrichmentFields } from "@/lib/enrichment/display";

/**
 * Enriched, type-appropriate metadata for the item detail page (media-detail-
 * enrichment Req 1). Presentational and server-rendered: it lists only the
 * fields actually present (absent fields are omitted) as an accessible
 * definition list. Renders nothing when there is no enrichment yet.
 */
export function EnrichmentDetails({
  enrichment,
}: {
  enrichment: MediaEnrichment | null | undefined;
}): React.JSX.Element | null {
  const fields = selectEnrichmentFields(enrichment);
  if (fields.length === 0) return null;

  return (
    <section aria-labelledby="details-heading" className="flex flex-col gap-3">
      <h2 id="details-heading" className="text-lg font-medium">
        Details
      </h2>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label} className="flex flex-col">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">{field.label}</dt>
            <dd className="text-sm">{field.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
