import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandMark } from "./BrandMark";
import { Avatar } from "./Avatar";
import { Pill } from "./Pill";
import { BookCover, coverInitials } from "./BookCover";
import { appConfig } from "@/lib/app-config";

describe("visual language components (DL-13)", () => {
  it("renders the brand mark with the app name", () => {
    render(<BrandMark />);
    expect(screen.getByText("LL")).toBeInTheDocument();
    expect(screen.getByText(appConfig.name)).toBeInTheDocument();
  });

  it("renders an avatar initial tinted by color", () => {
    const { container } = render(<Avatar name="Ava Patel" color="#2f7d7e" />);
    const el = container.querySelector(".avatar");
    expect(el).toHaveTextContent("A");
    expect(el?.getAttribute("style")).toContain("--avatar-color: #2f7d7e");
  });

  it("renders a pill label", () => {
    render(<Pill>Science Fiction</Pill>);
    expect(screen.getByText("Science Fiction")).toHaveClass("pill");
  });

  it("derives up to three cover initials", () => {
    expect(coverInitials("Tomorrow, and Tomorrow, and Tomorrow")).toBe("TaT");
    expect(coverInitials("Circe")).toBe("C");
  });

  it("applies the requested cover theme class", () => {
    const { container } = render(<BookCover title="Babel" theme="crimson" />);
    const cover = container.querySelector(".book-cover");
    expect(cover).toHaveClass("cover-crimson");
    expect(cover).toHaveTextContent("B");
  });

  it("falls back to the teal cover theme", () => {
    const { container } = render(<BookCover title="Educated" />);
    expect(container.querySelector(".book-cover")).toHaveClass("cover-teal");
  });
});
