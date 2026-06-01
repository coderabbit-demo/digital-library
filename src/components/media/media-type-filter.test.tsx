/**
 * Component test (media-type-filters DL-73) for the shared, relocated media-type
 * filter: data-driven options with counts, an accessible active marker, and
 * navigable links — the control reused across every media-list surface.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MediaTypeFilter } from "./MediaTypeFilter";
import { countMediaTypes, typeFilterHrefFactory } from "@/lib/media-type";

describe("MediaTypeFilter (relocated, DL-73)", () => {
  it("renders an option per type with counts and marks the active one", () => {
    const options = countMediaTypes(["podcast", "music"]);
    render(
      <MediaTypeFilter
        options={options}
        activeValue="all"
        hrefFor={typeFilterHrefFactory({ basePath: "/library" })}
      />,
    );

    const all = screen.getByRole("link", { name: /All/ });
    expect(all).toHaveAttribute("aria-current", "true");
    expect(all).toHaveAttribute("href", "/library");
    expect(screen.getByRole("link", { name: /Podcasts/ })).toHaveAttribute(
      "href",
      "/library?type=podcast",
    );
    expect(screen.getByRole("link", { name: /Music/ })).not.toHaveAttribute("aria-current");
  });

  it("uses the provided aria-label for the filter nav", () => {
    render(
      <MediaTypeFilter
        options={countMediaTypes(["ebook"])}
        activeValue="all"
        hrefFor={typeFilterHrefFactory({ basePath: "/wishlist" })}
        ariaLabel="Filter wishlist by media type"
      />,
    );
    expect(screen.getByRole("navigation", { name: "Filter wishlist by media type" })).toBeInTheDocument();
  });
});
