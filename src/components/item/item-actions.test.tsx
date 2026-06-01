/**
 * UI test (media-detail DL-69) for the detail-page actions: shelf buttons,
 * review form (pre-filled when an entry exists), and the add-to-shelf prompt for
 * tags when the item isn't in the library yet.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ItemActions } from "./ItemActions";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

describe("ItemActions (DL-69)", () => {
  it("renders shelf buttons, marks the current shelf, and pre-fills review + tags when in library", () => {
    render(
      <ItemActions
        mediaItemId="m1"
        entry={{ id: "e1", status: "current", rating: 4, review: "Lovely." }}
        tags={["folk", "calm"]}
      />,
    );
    expect(screen.getByRole("button", { name: "Wishlist" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Currently reading" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Read" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("Review")).toHaveValue("Lovely.");
    expect(screen.getByLabelText(/Tags/)).toHaveValue("folk, calm");
    expect(screen.getByRole("button", { name: "Save tags" })).toBeInTheDocument();
  });

  it("prompts to add-to-shelf for tags and notes review-creates-entry when not in library", () => {
    render(<ItemActions mediaItemId="m1" entry={null} tags={[]} />);
    expect(screen.getByText(/Add this item to a shelf to tag it/i)).toBeInTheDocument();
    expect(screen.getByText(/Saving a review adds this item to your library as read/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save tags" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save review" })).toBeInTheDocument();
  });
});
