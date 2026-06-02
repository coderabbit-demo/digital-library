/**
 * Normalize a Next.js search-param value (media-type-filters DL-73).
 *
 * App Router `searchParams` values are `string | string[] | undefined` — a key
 * repeated in the query string (e.g. `?type=a&type=b`) arrives as an array. Our
 * filters are single-valued, so take the first entry.
 */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
