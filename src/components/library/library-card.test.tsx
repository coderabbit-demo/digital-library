/**
 * UI test (DL-51, Req 8.1/8.3) for the owned-item card: renders the enriched
 * card with its details and exposes an accessible actions menu trigger.
 */
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { LibraryCard } from "./LibraryCard";
import type { LibraryEntry, MediaItem } from "@/lib/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

const item: MediaItem = {
  id: "m1",
  type: "music",
  title: "Blue",
  creator: "Joni Mitchell",
  genre: "Folk",
  language: "English",
  description: "",
  coverTheme: "indigo",
  metadata: { kind: "music", album: "Blue" },
  totalUnits: null,
};

const entry: LibraryEntry = {
  id: "e1",
  userId: "u1",
  mediaItemId: "m1",
  status: "finished",
  rating: 5,
  review: "A perfect record.",
  progress: null,
  updatedAt: "2026-05-20T00:00:00.000Z",
};

describe("LibraryCard (DL-51)", () => {
  it("renders the card details, rating, review, tags, and an actions trigger", () => {
    render(<LibraryCard item={item} entry={entry} tags={["folk", "calm"]} />);
    expect(screen.getByRole("heading", { name: "Blue" })).toBeInTheDocument();
    expect(screen.getByText("Joni Mitchell")).toBeInTheDocument();
    expect(screen.getByText("Blue", { selector: "p" })).toBeInTheDocument(); // album meta line
    expect(screen.getByLabelText("Rated 5 out of 5")).toBeInTheDocument();
    expect(screen.getByText("A perfect record.")).toBeInTheDocument();
    expect(screen.getByText("folk")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Actions for Blue" })).toBeInTheDocument();
  });
});
