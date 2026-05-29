/**
 * Helpers to convert between comma-separated text inputs and string arrays for
 * the profile preferences form (DL-34).
 */
export function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinList(items: string[]): string {
  return items.join(", ");
}
