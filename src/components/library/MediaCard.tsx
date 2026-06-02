"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Disc3,
  Film,
  Heart,
  Mic,
  MoreVertical,
  Music,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CoverThumb } from "@/components/ui/CoverThumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StarRating } from "@/components/ui/StarRating";
import { formatMetaLine } from "@/lib/media-metadata";
import { mediaTypeLabel } from "@/lib/media-type";
import type { LibraryStatus, MediaItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface MediaCardProps {
  item: MediaItem;
  status?: LibraryStatus | null;
  rating?: number | null;
  review?: string | null;
  tags?: readonly string[];
  /** Items for the overflow (⋮) actions menu; the menu is hidden when absent. */
  actions?: ReactNode;
}

const TYPE_STYLE: Record<string, { icon: LucideIcon; className: string }> = {
  ebook: { icon: BookOpen, className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  music: { icon: Music, className: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300" },
  podcast: { icon: Mic, className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
  tv_movie: { icon: Film, className: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
};

const STATUS_META: Record<LibraryStatus, { label: string; icon: LucideIcon }> = {
  wishlist: { label: "Wishlist", icon: Heart },
  current: { label: "In progress", icon: Clock },
  finished: { label: "Completed", icon: CheckCircle2 },
};

/**
 * Enriched media card (DL-47): type + status indicators, title, creator, a
 * type-appropriate meta line, star rating, optional review snippet, tags, and
 * an accessible overflow actions menu — matching the reference card anatomy
 * (Req 8.1, 8.3). Status/rating are conveyed by text + icon, not color alone
 * (Req 13.5). Works for any media type without per-type branches (Req 8.4).
 */
export function MediaCard({
  item,
  status,
  rating,
  review,
  tags,
  actions,
}: MediaCardProps): React.JSX.Element {
  const typeStyle = TYPE_STYLE[item.type] ?? { icon: Disc3, className: "bg-muted text-muted-foreground" };
  const TypeIcon = typeStyle.icon;
  const statusMeta = status ? STATUS_META[status] : null;
  const StatusIcon = statusMeta?.icon;

  return (
    <Card>
      <CardContent className="flex gap-3 p-4">
        <CoverThumb src={item.artworkUrl} Icon={TypeIcon} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={cn("gap-1", typeStyle.className)}>
              <TypeIcon aria-hidden="true" />
              {mediaTypeLabel(item.type)}
            </Badge>
            {statusMeta && StatusIcon ? (
              <Badge variant="outline" className="gap-1">
                <StatusIcon aria-hidden="true" />
                {statusMeta.label}
              </Badge>
            ) : null}
            {actions ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="ml-auto size-8" aria-label={`Actions for ${item.title}`}>
                    <MoreVertical aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">{actions}</DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>

          <div>
            <h3 className="font-medium leading-tight">
              <Link
                href={`/item/${item.id}`}
                className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {item.title}
              </Link>
            </h3>
            <p className="text-sm text-muted-foreground">{item.creator}</p>
          </div>

          <p className="text-sm text-muted-foreground">{formatMetaLine(item)}</p>

          {typeof rating === "number" ? <StarRating rating={rating} /> : null}

          {review ? (
            <blockquote className="border-l-2 border-border pl-3 text-sm italic text-muted-foreground">
              {review}
            </blockquote>
          ) : null}

          {tags && tags.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5 pt-1">
              {tags.map((tag) => (
                <li key={tag}>
                  <Badge variant="muted">{tag}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
