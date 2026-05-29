"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { sendJson } from "@/lib/api/client";
import type { LibraryStatus } from "@/lib/types";

const ACTIONS: { status: LibraryStatus; label: string }[] = [
  { status: "wishlist", label: "Wishlist" },
  { status: "current", label: "Reading" },
  { status: "finished", label: "Finished" },
];

export interface ShelfStatusButtonsProps {
  mediaItemId: string;
}

/** Move an item to a shelf via the library API, then refresh the page (DL-32/33). */
export function ShelfStatusButtons({ mediaItemId }: ShelfStatusButtonsProps): React.JSX.Element {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function move(status: LibraryStatus): Promise<void> {
    setPending(true);
    setError(null);
    try {
      const result = await sendJson("/api/library", { mediaItemId, status });
      if (result.ok) router.refresh();
      else setError(result.message ?? "Could not update shelf.");
    } catch {
      setError("Could not update shelf.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="status-actions" role="group" aria-label="Move to shelf">
      {ACTIONS.map((a) => (
        <button key={a.status} type="button" disabled={pending} onClick={() => void move(a.status)}>
          {a.label}
        </button>
      ))}
      {error ? (
        <span role="alert" className="form-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}
