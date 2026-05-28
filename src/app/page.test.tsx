import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";
import { appConfig } from "@/lib/app-config";

describe("scaffold (DL-11)", () => {
  it("exposes a typed app config", () => {
    expect(appConfig.name).toBe("LibraryLoop");
    expect(appConfig.tagline).toBeTypeOf("string");
  });

  it("renders the app name as the home page heading", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { level: 1, name: appConfig.name }),
    ).toBeInTheDocument();
  });
});
