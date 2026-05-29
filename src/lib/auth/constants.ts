/**
 * Auth constants with no Node/DB imports, so the edge middleware can import
 * them without pulling server-only modules into the edge bundle.
 */
export const SESSION_COOKIE_NAME = "ll_session";

/** Session lifetime: 7 days. */
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
