import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";
import { appConfig } from "@/lib/app-config";

describe("scaffold (DL-11)", () => {
  it("exposes a typed app config", () => {
    expect(appConfig.name).toBe("LibraryLoop");
    expect(appConfig.tagline).toBeTypeOf("string");
  });

  it("renders the brand mark with the app name on the home page", () => {
    render(<HomePage />);
    expect(screen.getByText("LL")).toBeInTheDocument();
    expect(screen.getByText(appConfig.name)).toBeInTheDocument();
  });
});
