import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("home page (DL-27)", () => {
  it("renders the Home landing heading", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1, name: "Home" })).toBeInTheDocument();
  });

  it("shows the landing placeholder copy", () => {
    render(<HomePage />);
    expect(screen.getByText(/community feed will appear here/i)).toBeInTheDocument();
  });
});
