import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { TrendingItem, TrendingResponse } from "@/lib/types";
import { typeFilterHrefFactory } from "@/lib/media-type";

// Render next/link as a plain anchor; stub the router used by TrendingCard.
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

const fetchMock = vi.fn();
vi.mock("@/lib/trending/feed", () => ({ fetchTrendingFeed: (args: unknown) => fetchMock(args) }));

// Imported after the mocks are registered.
const { TrendingSection } = await import("./TrendingSection");

function mkItem(mediaType: TrendingItem["mediaType"], title: string): TrendingItem {
  return {
    source: "src",
    sourceLabel: "Src",
    mediaType,
    title,
    creator: "c",
    listLabel: "list",
    rank: null,
    genre: null,
    artworkUrl: null,
    externalUrl: null,
    externalId: title,
  };
}

function feed(): TrendingResponse {
  return {
    sources: [
      { source: "nyt", mediaType: "ebook", label: "NYT", status: "ok", items: [mkItem("ebook", "Circe"), mkItem("ebook", "Babel")] },
      { source: "spotify", mediaType: "music", label: "Spotify", status: "ok", items: [mkItem("music", "Blue")] },
    ],
  };
}

const sectionHref = (activeType: string) =>
  typeFilterHrefFactory({ basePath: "/", param: "trending", preserve: { type: activeType } });

describe("TrendingSection filter (DL-73)", () => {
  it("renders the filter and links 'See all' to the plain trending page in the all view", async () => {
    fetchMock.mockResolvedValue(feed());
    render(await TrendingSection({ owned: new Set(), activeType: "all", hrefFor: sectionHref("all") }));

    const nav = screen.getByRole("navigation", { name: "Filter trending by media type" });
    expect(within(nav).getByRole("link", { name: /All/ })).toHaveAttribute("aria-current", "true");
    expect(within(nav).getByRole("link", { name: /Music/ })).toHaveAttribute("href", "/?trending=music");
    expect(screen.getByRole("link", { name: "See all" })).toHaveAttribute("href", "/trending");
    // all items shown
    expect(screen.getByText("Circe")).toBeInTheDocument();
    expect(screen.getByText("Blue")).toBeInTheDocument();
  });

  it("narrows the preview and carries the selection into 'See all'", async () => {
    fetchMock.mockResolvedValue(feed());
    render(await TrendingSection({ owned: new Set(), activeType: "music", hrefFor: sectionHref("all") }));

    const nav = screen.getByRole("navigation", { name: "Filter trending by media type" });
    expect(within(nav).getByRole("link", { name: /Music/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "See all" })).toHaveAttribute("href", "/trending?type=music");
    expect(screen.getByText("Blue")).toBeInTheDocument();
    expect(screen.queryByText("Circe")).not.toBeInTheDocument();
  });

  it("renders nothing when no sources have items", async () => {
    fetchMock.mockResolvedValue({ sources: [{ source: "x", mediaType: "ebook", label: "X", status: "error", items: [] }] });
    const result = await TrendingSection({ owned: new Set(), activeType: "all", hrefFor: sectionHref("all") });
    expect(result).toBeNull();
  });
});
