"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Check, Film, Mic, Music, Plus, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CoverThumb } from "@/components/ui/CoverThumb";
import { sendJson } from "@/lib/api/client";
import { mediaTypeLabel } from "@/lib/media-type";
import type { TrendingItem } from "@/lib/types";

const TYPE_ICON: Record<string, LucideIcon> = {
  ebook: BookOpen,
  music: Music,
  podcast: Mic,
  tv_movie: Film,
};

type AddState = "idle" | "adding" | "added" | "error";

export interface TrendingCardProps {
  item: TrendingItem;
  /** True when the user already has this item in their library. */
  alreadyInLibrary?: boolean;
}

/**
 * A trending item on the design system (DL-58): artwork (https) or a themed
 * fallback, a source/rank indicator and media-type badge, title, creator, and
 * an add-to-library control that calls the add endpoint and reflects state.
 * Conveys state by text + icon (not color alone); keyboard-operable.
 */
export function TrendingCard({ item, alreadyInLibrary = false }: TrendingCardProps): React.JSX.Element {
  const router = useRouter();
  const [state, setState] = useState<AddState>(alreadyInLibrary ? "added" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const Icon = TYPE_ICON[item.mediaType] ?? BookOpen;

  // Resolve this external item to a catalog id, then open its detail page.
  async function openDetails(): Promise<void> {
    setOpening(true);
    setError(null);
    try {
      const res = await fetch("/api/trending/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: item.mediaType,
          title: item.title,
          creator: item.creator,
          genre: item.genre ?? "",
          artworkUrl: item.artworkUrl,
        }),
      });
      if (!res.ok) {
        setError("Could not open details.");
        return;
      }
      const data = (await res.json()) as { id?: string };
      if (data.id) router.push(`/item/${data.id}`);
      else setError("Could not open details.");
    } catch {
      setError("Could not open details.");
    } finally {
      setOpening(false);
    }
  }

  async function add(): Promise<void> {
    setState("adding");
    setError(null);
    const result = await sendJson("/api/trending/add", {
      type: item.mediaType,
      title: item.title,
      creator: item.creator,
      genre: item.genre ?? "",
      status: "wishlist",
      artworkUrl: item.artworkUrl,
    });
    if (result.ok) {
      setState("added");
      router.refresh();
    } else {
      setState("error");
      setError(result.message ?? "Could not add this item.");
    }
  }

  return (
    <Card>
      <CardContent className="flex gap-3 p-4">
        <CoverThumb src={item.artworkUrl} Icon={Icon} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Icon className="size-3" aria-hidden="true" />
              {mediaTypeLabel(item.mediaType)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {item.sourceLabel}
              {item.rank ? ` · #${item.rank}` : ""}
            </span>
          </div>
          <p className="truncate font-medium" title={item.title}>
            {item.title}
          </p>
          <p className="truncate text-sm text-muted-foreground">{item.creator}</p>
          <div className="mt-1 flex items-center gap-2">
            {state === "added" ? (
              <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Check className="size-4" aria-hidden="true" />
                In your library
              </span>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={state === "adding"}
                onClick={() => void add()}
                aria-label={`Add ${item.title} to your library`}
              >
                <Plus aria-hidden="true" />
                {state === "adding" ? "Adding…" : "Add"}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              disabled={opening}
              onClick={() => void openDetails()}
              aria-label={`View details for ${item.title}`}
            >
              {opening ? "Opening…" : "Details"}
            </Button>
            {error ? (
              <span role="alert" className="text-sm text-destructive">
                {error}
              </span>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
