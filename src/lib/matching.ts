export type Dimension = "preference" | "horoscope" | "social" | "ai" | "values";
export type DimensionResult = { dimension: Dimension; score: number | null; available: boolean; explanation: string[]; consented: boolean };
export type MatchInput = { results: DimensionResult[]; weights: Partial<Record<Dimension, number>> };
export type MatchSummary = { score: number | null; included: Dimension[]; excluded: Dimension[]; explanations: string[] };

/**
 * Transparent weighted aggregation. Unavailable, non-consented or invalid dimensions
 * are excluded rather than treated as zero. This is a preference-fit indicator, not
 * a prediction of relationship or marriage success.
 */
export function aggregateMatch(input: MatchInput): MatchSummary {
  const included: DimensionResult[] = [];
  const excluded: Dimension[] = [];
  for (const result of input.results) {
    const weight = input.weights[result.dimension] ?? 0;
    if (!result.available || !result.consented || result.score === null || !Number.isFinite(result.score) || weight <= 0) {
      excluded.push(result.dimension);
      continue;
    }
    if (result.score < 0 || result.score > 100) throw new RangeError("Dimension score must be between 0 and 100");
    included.push(result);
  }
  const totalWeight = included.reduce((sum, item) => sum + (input.weights[item.dimension] ?? 0), 0);
  if (totalWeight === 0) return { score: null, included: [], excluded, explanations: ["Not enough mutually available information to calculate a match indicator."] };
  const weighted = included.reduce((sum, item) => sum + item.score! * (input.weights[item.dimension] ?? 0), 0);
  return {
    score: Math.round(weighted / totalWeight),
    included: included.map(item => item.dimension),
    excluded,
    explanations: included.flatMap(item => item.explanation).slice(0, 8),
  };
}
