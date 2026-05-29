"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { sendJson } from "@/lib/api/client";
import { joinList, splitList } from "@/lib/preferences-format";
import type { Preferences, User } from "@/lib/types";

export interface ProfileFormProps {
  user: User;
  preferences: Preferences;
}

function field(data: FormData, name: string): string[] {
  return splitList(String(data.get(name) ?? ""));
}

/** Edit profile + media preferences via the profile API (DL-34). */
export function ProfileForm({ user, preferences }: ProfileFormProps): React.JSX.Element {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    const data = new FormData(event.currentTarget);
    const nextPreferences: Preferences = {
      books: {
        favoriteAuthors: field(data, "bookAuthors"),
        favoriteGenres: field(data, "bookGenres"),
        languages: field(data, "bookLanguages"),
      },
      music: {
        favoriteArtists: field(data, "musicArtists"),
        favoriteGenres: field(data, "musicGenres"),
      },
      podcasts: { topics: field(data, "podcastTopics") },
      streaming: { favoriteGenres: field(data, "streamingGenres") },
    };
    try {
      const result = await sendJson(
        "/api/profile",
        {
          name: data.get("name"),
          email: data.get("email"),
          bio: data.get("bio"),
          preferences: nextPreferences,
        },
        "PUT",
      );
      if (result.ok) {
        setMessage("Profile saved.");
        router.refresh();
      } else {
        setError(result.message ?? "Could not save profile.");
      }
    } catch {
      setError("Could not save profile.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="profile-form" onSubmit={onSubmit}>
      <label>
        Name
        <input name="name" type="text" required defaultValue={user.name} autoComplete="name" />
      </label>
      <label>
        Email
        <input name="email" type="email" required defaultValue={user.email ?? ""} autoComplete="email" />
      </label>
      <label>
        Bio
        <textarea name="bio" rows={3} defaultValue={user.bio} />
      </label>

      <fieldset>
        <legend>Books</legend>
        <label>
          Favorite authors
          <input name="bookAuthors" type="text" defaultValue={joinList(preferences.books.favoriteAuthors)} />
        </label>
        <label>
          Favorite genres
          <input name="bookGenres" type="text" defaultValue={joinList(preferences.books.favoriteGenres)} />
        </label>
        <label>
          Languages
          <input name="bookLanguages" type="text" defaultValue={joinList(preferences.books.languages)} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Music</legend>
        <label>
          Favorite artists
          <input name="musicArtists" type="text" defaultValue={joinList(preferences.music.favoriteArtists)} />
        </label>
        <label>
          Favorite genres
          <input name="musicGenres" type="text" defaultValue={joinList(preferences.music.favoriteGenres)} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Podcasts</legend>
        <label>
          Topics
          <input name="podcastTopics" type="text" defaultValue={joinList(preferences.podcasts.topics)} />
        </label>
      </fieldset>

      <fieldset>
        <legend>TV and movies</legend>
        <label>
          Favorite genres
          <input name="streamingGenres" type="text" defaultValue={joinList(preferences.streaming.favoriteGenres)} />
        </label>
      </fieldset>

      {error ? (
        <span role="alert" className="form-error">
          {error}
        </span>
      ) : null}
      {message ? <span className="form-message">{message}</span> : null}
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
