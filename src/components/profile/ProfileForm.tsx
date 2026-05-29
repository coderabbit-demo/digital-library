"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

function TextField({
  name,
  label,
  defaultValue,
  ...rest
}: {
  name: string;
  label: string;
  defaultValue?: string;
} & React.ComponentProps<typeof Input>): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} {...rest} />
    </div>
  );
}

/** Edit profile + media preferences via the profile API (DL-34; restyled DL-49). */
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
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <TextField name="name" label="Name" defaultValue={user.name} required autoComplete="name" />
          <TextField
            name="email"
            label="Email"
            type="email"
            defaultValue={user.email ?? ""}
            required
            autoComplete="email"
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" name="bio" rows={3} defaultValue={user.bio} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField name="bookAuthors" label="Favorite authors" defaultValue={joinList(preferences.books.favoriteAuthors)} />
          <TextField name="bookGenres" label="Favorite book genres" defaultValue={joinList(preferences.books.favoriteGenres)} />
          <TextField name="bookLanguages" label="Languages" defaultValue={joinList(preferences.books.languages)} />
          <TextField name="musicArtists" label="Favorite artists" defaultValue={joinList(preferences.music.favoriteArtists)} />
          <TextField name="musicGenres" label="Favorite music genres" defaultValue={joinList(preferences.music.favoriteGenres)} />
          <TextField name="podcastTopics" label="Podcast topics" defaultValue={joinList(preferences.podcasts.topics)} />
          <TextField name="streamingGenres" label="TV & movie genres" defaultValue={joinList(preferences.streaming.favoriteGenres)} />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
        {error ? (
          <span role="alert" className="text-sm text-destructive">
            {error}
          </span>
        ) : null}
        {message ? <span className="text-sm text-muted-foreground">{message}</span> : null}
      </div>
    </form>
  );
}
