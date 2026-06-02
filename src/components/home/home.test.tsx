import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { FeedEntryDTO } from "@/lib/types";
import { mediaTypeOptions, typeFilterHrefFactory } from "@/lib/media-type";
import type { AchievementView } from "@/lib/achievements";
import { DashboardHeader } from "./DashboardHeader";
import { StatCards } from "./StatCards";
import { AchievementsSection } from "./AchievementsSection";
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

const stats = {
  counts: { wishlist: 1, current: 2, finished: 3, reviewed: 2 },
  totalPagesRead: 304,
  inProgress: 2,
};

describe("home dashboard (DL-48)", () => {
  it("greets the user by name", () => {
    render(<DashboardHeader userName="Ava" />);
    expect(screen.getByRole("heading", { level: 1, name: /Welcome back, Ava/ })).toBeInTheDocument();
  });

  it("renders live stat cards with goal progress and a streak", () => {
    render(
      <StatCards
        stats={stats}
        goalProgress={{ target: 24, completed: 1, remaining: 23, period: "year", periodKey: "2026" }}
        streaks={{ current: 5, longest: 7 }}
      />,
    );
    expect(screen.getByText("Pages Read")).toBeInTheDocument();
    expect(screen.getByText("304")).toBeInTheDocument();
    expect(screen.getByText("1 / 24")).toBeInTheDocument();
    expect(screen.getByText("23 to go")).toBeInTheDocument();
    expect(screen.getByText(/Longest: 7 days/)).toBeInTheDocument();
  });

  it("prompts to set a goal when none exists", () => {
    render(<StatCards stats={stats} goalProgress={null} streaks={{ current: 0, longest: 0 }} />);
    expect(screen.getByText(/Set a yearly goal/i)).toBeInTheDocument();
  });

  it("shows achievements with an unlocked count", () => {
    const achievements: AchievementView[] = [
      { key: "a", title: "First Finish", description: "d", unlocked: true, achievedAt: "x", progress: null },
      { key: "b", title: "Bookworm", description: "d", unlocked: false, achievedAt: null, progress: { current: 304, target: 1000 } },
    ];
    render(<AchievementsSection achievements={achievements} />);
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
    expect(screen.getByText("First Finish")).toBeInTheDocument();
    expect(screen.getByText("Bookworm")).toBeInTheDocument();
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

  it("defaults its links to the home type query (DL-31 behavior preserved)", () => {
    render(<FeedFilter options={mediaTypeOptions(["ebook"])} activeValue="all" />);
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Books" })).toHaveAttribute("href", "/?type=ebook");
  });

  it("uses a provided hrefFor that preserves the trending selection (DL-73)", () => {
    const hrefFor = typeFilterHrefFactory({ basePath: "/", param: "type", preserve: { trending: "music" } });
    render(<FeedFilter options={mediaTypeOptions(["ebook"])} activeValue="all" hrefFor={hrefFor} />);
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute("href", "/?trending=music");
    expect(screen.getByRole("link", { name: "Books" })).toHaveAttribute(
      "href",
      "/?trending=music&type=ebook",
    );
  });
});
