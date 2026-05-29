/**
 * Server-side environment configuration (DL-18).
 *
 * Required configuration is read only from environment variables (never
 * hard-coded) and validated with fail-fast behavior: if anything required is
 * missing, a single error lists every missing variable so misconfiguration is
 * caught immediately rather than surfacing as an undefined runtime state.
 */

/** Variables the server requires to run. */
export const REQUIRED_SERVER_ENV = ["DATABASE_URL", "AUTH_SECRET"] as const;
type RequiredServerEnv = (typeof REQUIRED_SERVER_ENV)[number];

export type ServerEnv = Record<RequiredServerEnv, string>;

/** Pure validator: returns the typed config or throws listing all missing keys. */
export function readServerEnv(env: Record<string, string | undefined>): ServerEnv {
  const missing = REQUIRED_SERVER_ENV.filter((key) => {
    const value = env[key];
    return value === undefined || value.trim() === "";
  });
  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(", ")}`);
  }
  // Safe: every required key is present and non-empty per the check above.
  return Object.fromEntries(REQUIRED_SERVER_ENV.map((key) => [key, env[key]])) as ServerEnv;
}

let cached: ServerEnv | undefined;

/** Validated server configuration for the running app (memoized). */
export function serverEnv(): ServerEnv {
  cached ??= readServerEnv(process.env);
  return cached;
}
