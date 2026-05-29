import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { FeedEntryDTO } from "@/lib/types";
import { mockHomeStats } from "@/lib/home-stats";
import { mediaTypeOptions } from "@/lib/media-type";
import { Hero } from "./Hero";
import { StatsPanel } from "./StatsPanel";
import { Feed } from "./Feed";
import { FeedFilter } from "./FeedFilter";

// Render next/link as a plain anchor (no router context needed in unit tests).
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href: string; children: ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const entry = (over: Partial<FeedEntryDTO> = {}): FeedEntryDTO => ({
  id: "a-1",
  actorName: "Ava Patel",
  avatarColor: "#2f7d7e",
  detail: "rated it 5 stars",
  itemTitle: "Circe",
  mediaType: "ebook",
  createdAt: "2026-05-27T20:35:00.000Z",
  ...over,
});

describe("home components (DL-29/30/31)", () => {
  it("hero greets the user by name with a catalog CTA", () => {
    render(<Hero userName="Ava" />);
    expect(screen.getByRole("heading", { level: 1, name: /Hello, Ava/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /catalog/i })).toHaveAttribute("href", "/catalog");
  });

  it("stats panel shows counters and a goals placeholder", () => {
    render(<StatsPanel stats={mockHomeStats()} />);
    expect(screen.getByText("Wishlist")).toBeInTheDocument();
    expect(screen.getByText(/goals/i)).toBeInTheDocument();
  });

  it("feed renders an entry with actor, detail, and title", () => {
    render(<Feed entries={[entry()]} />);
    expect(screen.getByText("Ava Patel")).toBeInTheDocument();
    expect(screen.getByText("Circe")).toBeInTheDocument();
    expect(screen.getByText(/rated it 5 stars/)).toBeInTheDocument();
  });

  it("feed shows an empty state when there is no activity", () => {
    render(<Feed entries={[]} />);
    expect(screen.getByText(/no community activity/i)).toBeInTheDocument();
  });

  it("feed never renders 'Invalid Date' for a malformed timestamp", () => {
    render(<Feed entries={[entry({ createdAt: "not-a-date" })]} />);
    expect(screen.queryByText(/invalid date/i)).not.toBeInTheDocument();
  });

  it("filter marks the active option for assistive tech", () => {
    render(<FeedFilter options={mediaTypeOptions(["ebook"])} activeValue="all" />);
    const all = screen.getByRole("link", { name: "All" });
    expect(all).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Books" })).not.toHaveAttribute("aria-current");
  });
});
