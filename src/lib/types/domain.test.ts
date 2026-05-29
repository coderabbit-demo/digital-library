import { describe, expect, it } from "vitest";
import {
  isLibraryStatus,
  isUserKind,
  LIBRARY_STATUSES,
  type Activity,
  type LibraryEntry,
  type MediaItem,
  type User,
} from "./domain";

describe("domain types (DL-12)", () => {
  it("enumerates the three library statuses", () => {
    expect([...LIBRARY_STATUSES]).toEqual(["wishlist", "current", "finished"]);
  });

  it("guards library status values", () => {
    expect(isLibraryStatus("finished")).toBe(true);
    expect(isLibraryStatus("archived")).toBe(false);
    expect(isLibraryStatus(3)).toBe(false);
  });

  it("guards user kinds", () => {
    expect(isUserKind("member")).toBe(true);
    expect(isUserKind("community")).toBe(true);
    expect(isUserKind("admin")).toBe(false);
  });

  it("models a community actor with a null email", () => {
    const community = {
      id: "u-miles",
      kind: "community",
      name: "Miles Chen",
      email: null,
      avatarColor: "#8b4a62",
      bio: "",
    } satisfies User;
    expect(community.email).toBeNull();
    expect(isUserKind(community.kind)).toBe(true);
  });

  it("models a non-ebook media item without code changes (Req 6.2)", () => {
    const album = {
      id: "m-1",
      type: "album",
      title: "Spaces",
      creator: "Nils Frahm",
      genre: "Ambient",
      language: "Instrumental",
      description: "",
      coverTheme: "violet",
    } satisfies MediaItem;
    expect(album.type).toBe("album");
  });

  it("allows a nullable rating on a library entry", () => {
    const entry = {
      id: "le-1",
      userId: "u-ava",
      mediaItemId: "m-1",
      status: "wishlist",
      rating: null,
      review: "",
      updatedAt: "2026-05-28T00:00:00.000Z",
    } satisfies LibraryEntry;
    expect(entry.rating).toBeNull();
    expect(isLibraryStatus(entry.status)).toBe(true);
  });

  it("constrains activity actions", () => {
    const activity = {
      id: "a-1",
      userId: "u-ava",
      mediaItemId: "m-1",
      action: "reviewed",
      detail: "rated it 5 stars",
      createdAt: "2026-05-28T00:00:00.000Z",
    } satisfies Activity;
    expect(activity.action).toBe("reviewed");
  });
});
