import { describe, expect, it } from "vitest";
import { actionForStatus, detailForStatus, reviewDetail } from "./activity";

describe("activity derivation (DL-24)", () => {
  it("maps a status to its activity action", () => {
    expect(actionForStatus("wishlist")).toBe("added");
    expect(actionForStatus("current")).toBe("started");
    expect(actionForStatus("finished")).toBe("finished");
  });

  it("describes the action, distinguishing a new vs moved wishlist entry", () => {
    expect(detailForStatus("wishlist", false)).toBe("added it to their wishlist");
    expect(detailForStatus("wishlist", true)).toBe("moved it to their wishlist");
    expect(detailForStatus("current", false)).toBe("started reading");
    expect(detailForStatus("finished", true)).toBe("marked it finished");
  });

  it("pluralizes the review detail", () => {
    expect(reviewDetail(1)).toBe("rated it 1 star");
    expect(reviewDetail(4)).toBe("rated it 4 stars");
  });
});
