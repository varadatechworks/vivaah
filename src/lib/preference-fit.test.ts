import { describe, expect, it } from "vitest";
import { evaluatePreferenceFit } from "./preference-fit";

describe("evaluatePreferenceFit", () => {
  it("marks a known must-have mismatch as ineligible", () => {
    const result = evaluatePreferenceFit(
      { city: "Bengaluru" },
      { profession: ["Engineer", "Architect"] },
      { city: "Mysuru", profession: "Engineer" },
    );
    expect(result.eligible).toBe(false);
    expect(result.mismatchedFields).toEqual(["city"]);
    expect(result.score).toBe(100);
  });

  it("keeps hidden or unavailable attributes unknown, not mismatched", () => {
    const result = evaluatePreferenceFit(
      { age: { min: 27, max: 35 } },
      { city: "Bengaluru" },
      { city: null },
    );
    expect(result.eligible).toBe("unknown");
    expect(result.mismatchedFields).toEqual([]);
    expect(result.score).toBeNull();
  });

  it("does not make a missing flexible field a hard eligibility failure", () => {
    const result = evaluatePreferenceFit({}, { city: "Bengaluru" }, { city: null });
    expect(result.eligible).toBe(true);
    expect(result.score).toBeNull();
    expect(result.unknownFields).toEqual(["city"]);
  });

  it("scores flexible preferences using only visible comparable fields", () => {
    const result = evaluatePreferenceFit(
      {},
      { city: "Bengaluru", profession: "Engineer" },
      { city: "Bengaluru", profession: "Teacher", education: null },
    );
    expect(result.eligible).toBe(true);
    expect(result.score).toBe(50);
  });
});
