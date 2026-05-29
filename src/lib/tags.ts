/**
 * Tag normalization (media-platform-v2 Req 2.1). Pure: trims, lowercases,
 * de-duplicates, and caps tag count/length for safe persistence. Accepts either
 * an array of strings or a comma-separated string.
 */
export const MAX_TAGS = 20;
export const MAX_TAG_LENGTH = 32;

export function normalizeTags(raw: unknown): string[] {
  const list: string[] = Array.isArray(raw)
    ? raw.filter((t): t is string => typeof t === "string")
    : typeof raw === "string"
      ? raw.split(",")
      : [];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const tag = item.trim().toLowerCase().slice(0, MAX_TAG_LENGTH).trim();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}
