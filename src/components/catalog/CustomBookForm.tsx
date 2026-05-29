"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { sendJson } from "@/lib/api/client";

/** Add a custom e-book to the catalog + a shelf via the media API (DL-33). */
export function CustomBookForm(): React.JSX.Element {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    const result = await sendJson("/api/media", {
      title: data.get("title"),
      creator: data.get("creator"),
      genre: data.get("genre"),
      language: data.get("language"),
      description: data.get("description"),
      status: data.get("status"),
    });
    setPending(false);
    if (result.ok) {
      form.reset();
      router.refresh();
    } else {
      setError(result.message ?? "Could not add the book.");
    }
  }

  return (
    <form className="custom-book-form" onSubmit={onSubmit} aria-labelledby="custom-book-title">
      <h2 id="custom-book-title">Add a custom e-book</h2>
      <label>
        Title
        <input name="title" type="text" required />
      </label>
      <label>
        Author
        <input name="creator" type="text" required />
      </label>
      <label>
        Genre
        <input name="genre" type="text" required />
      </label>
      <label>
        Language
        <input name="language" type="text" defaultValue="English" />
      </label>
      <label>
        Shelf
        <select name="status" defaultValue="wishlist">
          <option value="wishlist">Wishlist</option>
          <option value="current">Currently reading</option>
          <option value="finished">Finished</option>
        </select>
      </label>
      <label>
        Description
        <textarea name="description" rows={3} />
      </label>
      {error ? (
        <span role="alert" className="form-error">
          {error}
        </span>
      ) : null}
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add e-book"}
      </button>
    </form>
  );
}
