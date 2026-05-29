/**
 * Foundation smoke tests (DL-40): the design-system utility and core
 * primitives render and compose classes as expected. Interactive Radix
 * primitives (dialog/select/dropdown) are exercised by the surfaces that use
 * them in later tasks.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Badge } from "./badge";
import { Card, CardContent, CardTitle } from "./card";

describe("cn (DL-40)", () => {
  it("merges conditional classes and resolves Tailwind conflicts (last wins)", () => {
    expect(cn("p-2", false && "hidden", "p-4")).toBe("p-4");
    expect(cn("text-sm", "font-medium")).toBe("text-sm font-medium");
  });
});

describe("design-system primitives (DL-40)", () => {
  it("renders a Button as a real button carrying variant classes", () => {
    render(<Button variant="outline">Add item</Button>);
    const button = screen.getByRole("button", { name: "Add item" });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("border");
    expect(button).toHaveAttribute("data-slot", "button");
  });

  it("renders a Button as a child element when asChild is set", () => {
    render(
      <Button asChild>
        <a href="/library">Library</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Library" });
    expect(link).toHaveAttribute("href", "/library");
  });

  it("renders a Badge with its label", () => {
    render(<Badge variant="secondary">Book</Badge>);
    expect(screen.getByText("Book")).toBeInTheDocument();
  });

  it("composes Card sections", () => {
    render(
      <Card>
        <CardTitle>My Library</CardTitle>
        <CardContent>contents</CardContent>
      </Card>,
    );
    expect(screen.getByText("My Library")).toBeInTheDocument();
    expect(screen.getByText("contents")).toBeInTheDocument();
  });
});
