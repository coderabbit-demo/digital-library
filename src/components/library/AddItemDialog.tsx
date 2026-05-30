"use client";

import { type FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { sendJson } from "@/lib/api/client";
import { normalizeTags } from "@/lib/tags";
import type { MediaItem, MediaListResponse } from "@/lib/types";

const selectClass =
  "h-9 w-full rounded-md border border-border bg-input-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const TYPES = [
  { value: "ebook", label: "Book" },
  { value: "music", label: "Music" },
  { value: "podcast", label: "Podcast" },
  { value: "tv_movie", label: "TV / Movie" },
];

/**
 * Add-item flow (DL-49, Req 11.4, 11.7): a dialog launched from the shell with
 * two paths — add a custom item of any type (with type-specific fields + tags)
 * or add an item discovered from the seeded catalog. Both go through the
 * authenticated API and refresh the view.
 */
export function AddItemDialog(): React.JSX.Element {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("ebook");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<MediaItem[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  function done(): void {
    setOpen(false);
    setError(null);
    router.refresh();
  }

  async function loadCatalog(): Promise<void> {
    if (catalog) return;
    setCatalogError(null);
    try {
      const res = await fetch("/api/media");
      if (!res.ok) {
        setCatalogError("Could not load the catalog. Please try again.");
        return;
      }
      const data = (await res.json()) as MediaListResponse;
      setCatalog(data.items);
    } catch {
      setCatalogError("Could not load the catalog. Please try again.");
    }
  }

  function metadataFor(data: FormData): Record<string, unknown> {
    if (type === "music") return { album: data.get("album") };
    if (type === "podcast") return { show: data.get("show"), episodeCount: Number(data.get("episodeCount")) };
    if (type === "tv_movie") return { seasons: Number(data.get("seasons")) };
    return { pages: Number(data.get("pages")) };
  }

  async function addCustom(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    try {
      const result = await sendJson("/api/media", {
        type,
        title: data.get("title"),
        creator: data.get("creator"),
        genre: data.get("genre"),
        language: data.get("language"),
        description: data.get("description"),
        status: data.get("status"),
        metadata: metadataFor(data),
        tags: normalizeTags(String(data.get("tags") ?? "")),
      });
      if (result.ok) done();
      else setError(result.message ?? "Could not add the item.");
    } catch {
      setError("Could not add the item.");
    } finally {
      setPending(false);
    }
  }

  async function addFromCatalog(mediaItemId: string): Promise<void> {
    setAddingId(mediaItemId);
    setCatalogError(null);
    try {
      const result = await sendJson("/api/library", { mediaItemId, status: "wishlist" });
      if (result.ok) done();
      else setCatalogError(result.message ?? "Could not add the item.");
    } catch {
      setCatalogError("Could not add the item.");
    } finally {
      setAddingId(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void loadCatalog();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus aria-hidden="true" />
          <span className="hidden sm:inline">Add item</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add to your library</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="custom">
          <TabsList>
            <TabsTrigger value="custom">Add custom</TabsTrigger>
            <TabsTrigger value="catalog">From catalog</TabsTrigger>
          </TabsList>

          <TabsContent value="custom">
            <form onSubmit={(e) => void addCustom(e)} className="flex flex-col gap-3 pt-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  name="type"
                  className={selectClass}
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="creator">{type === "music" ? "Artist" : type === "tv_movie" ? "Director" : "Creator"}</Label>
                <Input id="creator" name="creator" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="genre">Genre</Label>
                <Input id="genre" name="genre" required />
              </div>

              {type === "ebook" ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pages">Pages</Label>
                  <Input id="pages" name="pages" type="number" min="1" />
                </div>
              ) : null}
              {type === "music" ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="album">Album</Label>
                  <Input id="album" name="album" />
                </div>
              ) : null}
              {type === "podcast" ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="show">Show</Label>
                    <Input id="show" name="show" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="episodeCount">Episodes</Label>
                    <Input id="episodeCount" name="episodeCount" type="number" min="1" />
                  </div>
                </>
              ) : null}
              {type === "tv_movie" ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="seasons">Seasons</Label>
                  <Input id="seasons" name="seasons" type="number" min="1" />
                </div>
              ) : null}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="language">Language</Label>
                <Input id="language" name="language" defaultValue="English" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="status">Shelf</Label>
                <select id="status" name="status" className={selectClass} defaultValue="wishlist">
                  <option value="wishlist">Wishlist</option>
                  <option value="current">In progress</option>
                  <option value="finished">Completed</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input id="tags" name="tags" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" rows={2} />
              </div>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button type="submit" disabled={pending}>
                {pending ? "Adding…" : "Add item"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="catalog">
            <div className="flex flex-col gap-2 pt-2">
              {catalogError ? (
                <p role="alert" className="text-sm text-destructive">
                  {catalogError}
                </p>
              ) : null}
              {catalogError && catalog === null ? (
                <Button size="sm" variant="outline" onClick={() => void loadCatalog()}>
                  Retry
                </Button>
              ) : catalog === null ? (
                <p className="py-4 text-sm text-muted-foreground">Loading catalog…</p>
              ) : catalog.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">No catalog items available.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {catalog.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.creator}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={addingId !== null}
                        onClick={() => void addFromCatalog(item.id)}
                      >
                        {addingId === item.id ? "Adding…" : "Add"}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
