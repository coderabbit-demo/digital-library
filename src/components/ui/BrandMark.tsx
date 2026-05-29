import { appConfig } from "@/lib/app-config";

/**
 * LibraryLoop brand lockup: the "LL" mark plus name and tagline.
 * Presentational only; styling lives in globals.css (DL-13).
 */
export function BrandMark(): React.JSX.Element {
  return (
    <div className="brand">
      <div className="brand-mark" aria-hidden="true">
        LL
      </div>
      <div>
        <strong>{appConfig.name}</strong>
        <span>{appConfig.tagline}</span>
      </div>
    </div>
  );
}
