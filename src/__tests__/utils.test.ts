import { describe, it, expect } from "vitest";
import { cn } from "../lib/utils";

describe("Classname helper utility (cn)", () => {
  it("merges simple class names", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("resolves conflicting tailwind classes correctly", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles conditional class values", () => {
    const isActive = true;
    const isHidden = false;
    expect(cn("base-class", isActive && "active", isHidden && "hidden")).toBe("base-class active");
  });
});
