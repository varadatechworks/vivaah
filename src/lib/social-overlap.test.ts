import { describe, expect, it } from "vitest";
import { calculateSocialOverlap } from "./social-overlap";

const a = {
  memberId: "member-a",
  allowedToShare: { pages: true },
  entities: [
    { id: "p1", label: "Open Source", category: "pages" as const, source: "provider" as const },
    { id: "p1", label: "Open Source", category: "pages" as const, source: "provider" as const },
    { id: "p2", label: "Design", category: "pages" as const, source: "member-curated" as const },
  ],
};
const b = {
  memberId: "member-b",
  allowedToShare: { pages: true },
  entities: [
    { id: "p1", label: "Open Source", category: "pages" as const, source: "provider" as const },
    { id: "p3", label: "Photography", category: "pages" as const, source: "provider" as const },
  ],
};

describe("calculateSocialOverlap", () => {
  it("returns de-duplicated mutual items only when both members consent", () => {
    const result = calculateSocialOverlap(a, b, "pages");
    expect(result.count).toBe(1);
    expect(result.items[0]?.id).toBe("p1");
  });

  it("returns no items when either member withdraws consent", () => {
    const result = calculateSocialOverlap(a, { ...b, allowedToShare: { pages: false } }, "pages");
    expect(result.count).toBe(0);
    expect(result.items).toEqual([]);
  });

  it("rejects self-comparison", () => {
    expect(() => calculateSocialOverlap(a, { ...b, memberId: "member-a" }, "pages")).toThrow();
  });
});
