/**
 * Component tests (DL-47) for the enriched media card: card anatomy + accessible
 * rating and the actions menu. (The media-type filter moved to
 * components/media and is covered by media-type-filter.test.tsx — DL-73.)
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MediaCard } from "./MediaCard";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { MediaItem } from "@/lib/types";

const podcast: MediaItem = {
  id: "p1",
  type: "podcast",
  title: "99% Invisible",
  creator: "Roman Mars",
  genre: "Design",
  language: "English",
  description: "",
  coverTheme: "green",
  metadata: { kind: "podcast", show: "99% Invisible", episodeCount: 560 },
  totalUnits: 560,
};

describe("MediaCard (DL-47)", () => {
  it("renders type, status, title, creator, meta, rating, review, and tags", () => {
    render(
      <MediaCard
        item={podcast}
        status="finished"
        rating={4}
        review="A delight."
        tags={["design", "audio"]}
      />,
    );
    expect(screen.getByRole("heading", { name: "99% Invisible" })).toBeInTheDocument();
    expect(screen.getByText("Roman Mars")).toBeInTheDocument();
    expect(screen.getByText("Podcasts")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("99% Invisible · 560 episodes")).toBeInTheDocument();
    expect(screen.getByLabelText("Rated 4 out of 5")).toBeInTheDocument();
    expect(screen.getByText("A delight.")).toBeInTheDocument();
    expect(screen.getByText("design")).toBeInTheDocument();
  });

  it("shows real cover art when the item has artwork, else a type-icon tile (cover-art DL-75)", () => {
    // Decorative cover (the title is shown alongside) → queried via the DOM, not a11y role.
    const { container, rerender } = render(<MediaCard item={{ ...podcast, artworkUrl: "https://art/p.jpg" }} />);
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "https://art/p.jpg");
    expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(img).toHaveAttribute("loading", "lazy");

    rerender(<MediaCard item={podcast} />); // no artworkUrl
    expect(container.querySelector("img")).toBeNull();
  });

  it("shows an accessible actions menu only when actions are provided", () => {
    const { rerender } = render(<MediaCard item={podcast} />);
    expect(screen.queryByRole("button", { name: /actions for/i })).not.toBeInTheDocument();

    rerender(
      <MediaCard item={podcast} actions={<DropdownMenuItem>Move to Library</DropdownMenuItem>} />,
    );
    expect(
      screen.getByRole("button", { name: "Actions for 99% Invisible" }),
    ).toBeInTheDocument();
  });
});
