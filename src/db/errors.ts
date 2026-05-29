/**
 * PostgreSQL error helpers (DL-22+). Centralizes SQLSTATE checks so handlers
 * can translate constraint failures into the right HTTP status.
 */
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

function hasCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

export function isUniqueViolation(error: unknown): boolean {
  return hasCode(error, UNIQUE_VIOLATION);
}

export function isForeignKeyViolation(error: unknown): boolean {
  return hasCode(error, FOREIGN_KEY_VIOLATION);
}
