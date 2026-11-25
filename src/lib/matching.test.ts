import { describe, expect, it } from "vitest";
import { aggregateMatch } from "./matching";

describe("aggregateMatch", () => {
  it("excludes unavailable and unconsented dimensions from the denominator", () => {
    const result = aggregateMatch({
      weights: { preference: 70, horoscope: 10, social: 10, ai: 5, values: 5 },
      results: [
        { dimension: "preference", score: 90, available: true, consented: true, explanation: ["Preference fit"] },
        { dimension: "horoscope", score: 0, available: false, consented: true, explanation: [] },
        { dimension: "social", score: 100, available: true, consented: false, explanation: [] },
      ],
    });
    expect(result.score).toBe(90);
    expect(result.included).toEqual(["preference"]);
    expect(result.excluded).toEqual(["horoscope", "social"]);
  });

  it("returns no score when no dimension is mutually available", () => {
    const result = aggregateMatch({
      weights: { preference: 100 },
      results: [{ dimension: "preference", score: null, available: false, consented: false, explanation: [] }],
    });
    expect(result.score).toBeNull();
  });

  it("rejects out-of-range scores", () => {
    expect(() => aggregateMatch({
      weights: { preference: 100 },
      results: [{ dimension: "preference", score: 101, available: true, consented: true, explanation: [] }],
    })).toThrow(RangeError);
  });
});
