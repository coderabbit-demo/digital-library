"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { sendJson } from "@/lib/api/client";

export interface ReviewFormProps {
  entryId: string;
  rating: number;
  review: string;
}

/** Save a 1–5 rating + review for a finished entry via the API (DL-32). */
export function ReviewForm({ entryId, rating, review }: ReviewFormProps): React.JSX.Element {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    try {
      const result = await sendJson("/api/library/review", {
        entryId,
        rating: Number(data.get("rating")),
        review: data.get("review"),
      });
      if (result.ok) router.refresh();
      else setError(result.message ?? "Could not save review.");
    } catch {
      setError("Could not save review.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="review-form" onSubmit={onSubmit}>
      <label>
        Rating
        <select name="rating" defaultValue={String(rating || 5)}>
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value} star{value === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </label>
      <label>
        Review
        <textarea name="review" rows={3} defaultValue={review} placeholder="What should friends know?" />
      </label>
      {error ? (
        <span role="alert" className="form-error">
          {error}
        </span>
      ) : null}
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save review"}
      </button>
    </form>
  );
}
