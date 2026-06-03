import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EnrichmentDetails } from "./EnrichmentDetails";
import { ReviewsSection } from "./ReviewsSection";

describe("EnrichmentDetails (media-detail-enrichment)", () => {
  it("renders only present fields for a movie", () => {
    const { container } = render(
      <EnrichmentDetails enrichment={{ kind: "tv_movie", runtimeMinutes: 136, genres: ["Sci-Fi"], voteAverage: 8.2 }} />,
    );
    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("Runtime")).toBeInTheDocument();
    expect(screen.getByText("136 mins")).toBeInTheDocument();
    expect(screen.getByText("Genres")).toBeInTheDocument();
    // The audience score belongs to the reviews section, not the metadata list.
    expect(container.textContent).not.toContain("8.2");
  });

  it("renders nothing when there is no enrichment", () => {
    const { container } = render(<EnrichmentDetails enrichment={null} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("ReviewsSection (media-detail-enrichment)", () => {
  it("omits the section entirely for music", () => {
    const { container } = render(
      <ReviewsSection item={{ type: "music", enrichment: { kind: "music", genre: "Jazz" } }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("omits the section for podcasts", () => {
    const { container } = render(
      <ReviewsSection item={{ type: "podcast", enrichment: { kind: "podcast", publisher: "NPR" } }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows book rating scores from both sources with attribution", () => {
    render(
      <ReviewsSection
        item={{
          type: "ebook",
          enrichment: {
            kind: "ebook",
            averageRating: 4.3,
            ratingsCount: 1200,
            openLibraryRating: 4.1,
            openLibraryRatingsCount: 88,
          },
        }}
      />,
    );
    expect(screen.getByText("Ratings & reviews")).toBeInTheDocument();
    expect(screen.getByText("4.3 / 5")).toBeInTheDocument();
    expect(screen.getByText(/Google Books/)).toBeInTheDocument();
    expect(screen.getByText("4.1 / 5")).toBeInTheDocument();
    expect(screen.getByText(/Open Library/)).toBeInTheDocument();
  });

  it("shows an accessible empty state for a book with no scores", () => {
    render(<ReviewsSection item={{ type: "ebook", enrichment: { kind: "ebook", pageCount: 100 } }} />);
    expect(screen.getByText("No ratings available yet.")).toBeInTheDocument();
  });
});
