import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TrendingCard } from "./TrendingCard";
import type { TrendingItem } from "@/lib/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

const item: TrendingItem = {
  source: "nyt",
  sourceLabel: "NYT Best Sellers",
  mediaType: "ebook",
  title: "Circe",
  creator: "Madeline Miller",
  listLabel: "Hardcover Fiction",
  rank: 1,
  genre: "Fiction",
  artworkUrl: "https://images.nyt.com/circe.jpg",
  externalUrl: null,
  externalId: "isbn",
};

describe("TrendingCard (DL-58)", () => {
  it("shows the item details and an accessible Add control", () => {
    render(<TrendingCard item={item} />);
    expect(screen.getByText("Circe")).toBeInTheDocument();
    expect(screen.getByText("Madeline Miller")).toBeInTheDocument();
    expect(screen.getByText(/NYT Best Sellers · #1/)).toBeInTheDocument();
    expect(screen.getByText("Books")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Circe to your library" })).toBeInTheDocument();
  });

  it("reflects already-in-library state instead of an Add button", () => {
    render(<TrendingCard item={item} alreadyInLibrary />);
    expect(screen.getByText("In your library")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add/ })).not.toBeInTheDocument();
  });
});
