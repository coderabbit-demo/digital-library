"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendJson } from "@/lib/api/client";
import { normalizeTags } from "@/lib/tags";
import type { LibraryStatus } from "@/lib/types";

const selectClass =
  "h-9 w-full max-w-[12rem] rounded-md border border-border bg-input-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const SHELVES: { status: LibraryStatus; label: string }[] = [
  { status: "wishlist", label: "Wishlist" },
  { status: "current", label: "Currently reading" },
  { status: "finished", label: "Read" },
];

export interface ItemActionsEntry {
  id: string;
  status: LibraryStatus;
  rating: number | null;
  review: string;
}

export interface ItemActionsProps {
  mediaItemId: string;
  entry: ItemActionsEntry | null;
  tags: string[];
}

/**
 * Detail-page actions (media-detail DL-69): set the shelf, add/edit a review,
 * and edit tags — all via the existing authenticated endpoints. Review/tags need
 * a library entry, so for a not-yet-added item the review save creates the entry
 * first (create-then-review). Errors are announced and don't lose input.
 */
export function ItemActions({ mediaItemId, entry, tags }: ItemActionsProps): React.JSX.Element {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  function reset(): void {
    setError(null);
    setSaved(null);
  }

  async function move(status: LibraryStatus): Promise<void> {
    setPending(true);
    reset();
    try {
      const result = await sendJson("/api/library", { mediaItemId, status });
      if (result.ok) router.refresh();
      else setError(result.message ?? "Could not update the shelf.");
    } finally {
      setPending(false);
    }
  }

  /** Return the entry id, creating the entry (as read) first if absent. */
  async function ensureEntryId(): Promise<string | null> {
    if (entry) return entry.id;
    try {
      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mediaItemId, status: "finished" }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { entry?: { id?: string } };
      return data.entry?.id ?? null;
    } catch {
      return null;
    }
  }

  async function saveReview(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    reset();
    const data = new FormData(event.currentTarget);
    try {
      const entryId = await ensureEntryId();
      if (!entryId) {
        setError("Could not save the review.");
        return;
      }
      const result = await sendJson("/api/library/review", {
        entryId,
        rating: Number(data.get("rating")),
        review: data.get("review"),
      });
      if (result.ok) {
        setSaved("Review saved.");
        router.refresh();
      } else {
        setError(result.message ?? "Could not save the review.");
      }
    } finally {
      setPending(false);
    }
  }

  async function saveTags(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!entry) return;
    setPending(true);
    reset();
    const data = new FormData(event.currentTarget);
    try {
      const result = await sendJson("/api/library/tags", {
        entryId: entry.id,
        tags: normalizeTags(String(data.get("tags") ?? "")),
      });
      if (result.ok) {
        setSaved("Tags saved.");
        router.refresh();
      } else {
        setError(result.message ?? "Could not save the tags.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Shelf</span>
          <div role="group" aria-label="Move to shelf" className="flex flex-wrap gap-2">
            {SHELVES.map((s) => (
              <Button
                key={s.status}
                type="button"
                size="sm"
                variant={entry?.status === s.status ? "default" : "outline"}
                aria-pressed={entry?.status === s.status}
                disabled={pending}
                onClick={() => void move(s.status)}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </div>

        <form onSubmit={(e) => void saveReview(e)} className="flex flex-col gap-2">
          <Label htmlFor="rating">Rating</Label>
          <select id="rating" name="rating" className={selectClass} defaultValue={String(entry?.rating ?? 5)}>
            {[1, 2, 3, 4, 5].map((v) => (
              <option key={v} value={v}>
                {v} star{v === 1 ? "" : "s"}
              </option>
            ))}
          </select>
          <Label htmlFor="review">Review</Label>
          <Textarea id="review" name="review" rows={3} defaultValue={entry?.review ?? ""} />
          {!entry ? (
            <p className="text-xs text-muted-foreground">
              Saving a review adds this item to your library as read.
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="w-fit">
            {pending ? "Saving…" : "Save review"}
          </Button>
        </form>

        {entry ? (
          <form onSubmit={(e) => void saveTags(e)} className="flex flex-col gap-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input id="tags" name="tags" defaultValue={tags.join(", ")} />
            <Button type="submit" variant="outline" disabled={pending} className="w-fit">
              Save tags
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">Add this item to a shelf to tag it.</p>
        )}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {saved ? <p className="text-sm text-muted-foreground">{saved}</p> : null}
      </CardContent>
    </Card>
  );
}
