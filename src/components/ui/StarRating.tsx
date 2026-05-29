/** Star rating display (DL-47). Conveys the rating by text label + filled
 * icons, never by color alone (Req 13.5). */
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StarRatingProps {
  rating: number;
  className?: string;
}

export function StarRating({ rating, className }: StarRatingProps): React.JSX.Element {
  return (
    <span
      role="img"
      className={cn("inline-flex items-center gap-0.5 text-amber-500", className)}
      aria-label={`Rated ${rating} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={cn("size-4", n <= rating ? "fill-current" : "text-muted-foreground/40")}
        />
      ))}
    </span>
  );
}
