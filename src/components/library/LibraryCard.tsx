"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendJson } from "@/lib/api/client";
import { normalizeTags } from "@/lib/tags";
import type { LibraryEntry, LibraryStatus, MediaItem } from "@/lib/types";
import { MediaCard } from "./MediaCard";

const MOVES: { status: LibraryStatus; label: string }[] = [
  { status: "wishlist", label: "Move to Wishlist" },
  { status: "current", label: "Mark as in progress" },
  { status: "finished", label: "Mark as completed" },
];

const selectClass =
  "h-9 w-full rounded-md border border-border bg-input-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export interface LibraryCardProps {
  item: MediaItem;
  entry: LibraryEntry;
  tags: string[];
}

/**
 * Owned-item card (DL-49): the enriched MediaCard plus an actions menu to move
 * shelves and an edit dialog for the review and tags. All writes go through the
 * authenticated API and refresh the server-rendered view.
 */
export function LibraryCard({ item, entry, tags }: LibraryCardProps): React.JSX.Element {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function move(status: LibraryStatus): Promise<void> {
    const result = await sendJson("/api/library", { mediaItemId: item.id, status });
    if (result.ok) router.refresh();
  }

  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    try {
      const tagsResult = await sendJson("/api/library/tags", {
        entryId: entry.id,
        tags: normalizeTags(String(data.get("tags") ?? "")),
      });
      let ok = tagsResult.ok;
      let message = tagsResult.message;
      if (entry.status === "finished") {
        const reviewResult = await sendJson("/api/library/review", {
          entryId: entry.id,
          rating: Number(data.get("rating")),
          review: data.get("review"),
        });
        ok = ok && reviewResult.ok;
        message = reviewResult.message ?? message;
      }
      if (ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(message ?? "Could not save changes.");
      }
    } catch {
      setError("Could not save changes.");
    } finally {
      setPending(false);
    }
  }

  const actions = (
    <>
      {MOVES.filter((m) => m.status !== entry.status).map((m) => (
        <DropdownMenuItem key={m.status} onSelect={() => void move(m.status)}>
          {m.label}
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => setEditing(true)}>Edit details</DropdownMenuItem>
    </>
  );

  return (
    <>
      <MediaCard
        item={item}
        status={entry.status}
        rating={entry.rating}
        review={entry.review || null}
        tags={tags}
        actions={actions}
      />
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {item.title}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void save(e)} className="flex flex-col gap-3">
            {entry.status === "finished" ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="rating">Rating</Label>
                  <select id="rating" name="rating" defaultValue={String(entry.rating ?? 5)} className={selectClass}>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <option key={v} value={v}>
                        {v} star{v === 1 ? "" : "s"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="review">Review</Label>
                  <Textarea id="review" name="review" rows={3} defaultValue={entry.review} />
                </div>
              </>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input id="tags" name="tags" defaultValue={tags.join(", ")} />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
