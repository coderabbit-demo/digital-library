/** Accessible loading state while a search query runs (media-search DL-82). */
export default function SearchLoading(): React.JSX.Element {
  return (
    <p role="status" aria-live="polite" className="py-8 text-muted-foreground">
      Searching…
    </p>
  );
}
