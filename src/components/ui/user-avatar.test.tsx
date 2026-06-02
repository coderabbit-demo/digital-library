import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UserAvatar } from "./UserAvatar";

describe("UserAvatar (google-auth DL-80)", () => {
  it("shows the profile picture (https, no-referrer, lazy) when a src is given", () => {
    // Decorative (alt="") → query via the DOM, not the img role.
    const { container } = render(
      <UserAvatar name="Ava Patel" color="#2f7d7e" src="https://lh3.googleusercontent.com/a/ava.jpg" />,
    );
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "https://lh3.googleusercontent.com/a/ava.jpg");
    expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(img).toHaveAttribute("loading", "lazy");
  });

  it("falls back to the initial when there is no picture", () => {
    const { container } = render(<UserAvatar name="Ava Patel" color="#2f7d7e" />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("falls back to the initial when the picture fails to load", () => {
    const { container } = render(<UserAvatar name="Ava Patel" color="#2f7d7e" src="https://x/dead.jpg" />);
    fireEvent.error(container.querySelector("img") as HTMLImageElement);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("A")).toBeInTheDocument();
  });
});
