/**
 * Application-wide constants for LibraryLoop.
 *
 * This is the first typed module of the re-platformed app (DL-11). Shared
 * domain and API types arrive in DL-12; this only holds presentation-level
 * constants used by the initial scaffold.
 */
export interface AppConfig {
  readonly name: string;
  readonly tagline: string;
}

export const appConfig: AppConfig = {
  name: "LibraryLoop",
  tagline: "Digital media journal",
};
