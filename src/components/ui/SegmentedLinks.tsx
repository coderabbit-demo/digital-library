import Link from "next/link";

export interface SegmentedOption {
  value: string;
  label: string;
  href: string;
}

export interface SegmentedLinksProps {
  options: SegmentedOption[];
  activeValue: string;
  ariaLabel: string;
}

/** Reusable link-based segmented control for URL-query filters (DL-32/33). */
export function SegmentedLinks({
  options,
  activeValue,
  ariaLabel,
}: SegmentedLinksProps): React.JSX.Element {
  return (
    <div className="segmented-control" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = option.value === activeValue;
        return (
          <Link
            key={option.value}
            href={option.href}
            aria-current={active ? "true" : undefined}
            className={active ? "is-active" : undefined}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
