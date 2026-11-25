export type PreferenceField = "age" | "city" | "countryCode" | "profession" | "education";
export type AgeRange = { min?: number; max?: number };
export type PreferenceValue = string | string[] | AgeRange;
export type PreferenceSet = Partial<Record<PreferenceField, PreferenceValue>>;
export type PreferenceFit = {
  eligible: boolean | "unknown";
  score: number | null;
  matchedFields: PreferenceField[];
  unknownFields: PreferenceField[];
  mismatchedFields: PreferenceField[];
};

export type PreferenceCandidate = Partial<Record<PreferenceField, string | number | null>>;

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("en");
}

function matches(field: PreferenceField, actual: string | number, expected: PreferenceValue): boolean {
  if (field === "age") {
    if (typeof actual !== "number" || !Number.isFinite(actual) || typeof expected !== "object" || Array.isArray(expected)) return false;
    const range = expected as AgeRange;
    return (range.min === undefined || actual >= range.min) && (range.max === undefined || actual <= range.max);
  }
  if (typeof actual !== "string") return false;
  const actualValue = normalize(actual);
  const allowed = Array.isArray(expected) ? expected : [expected];
  return allowed.some(item => typeof item === "string" && normalize(item) === actualValue);
}

/**
 * Scores only candidate attributes that are explicitly visible to the viewer.
 * Unknown attributes remain unknown; they are never silently treated as a mismatch.
 */
export function evaluatePreferenceFit(
  mustHave: PreferenceSet,
  flexible: PreferenceSet,
  candidate: PreferenceCandidate,
): PreferenceFit {
  const matchedFields: PreferenceField[] = [];
  const unknownFields: PreferenceField[] = [];
  const unknownMustHaveFields: PreferenceField[] = [];
  const mismatchedFields: PreferenceField[] = [];
  let flexibleCompared = 0;
  let flexibleMatched = 0;

  for (const [field, expected] of Object.entries(mustHave) as [PreferenceField, PreferenceValue][]) {
    const actual = candidate[field];
    if (actual === undefined || actual === null || actual === "") {
      unknownFields.push(field);
      unknownMustHaveFields.push(field);
      continue;
    }
    if (matches(field, actual, expected)) matchedFields.push(field);
    else mismatchedFields.push(field);
  }

  for (const [field, expected] of Object.entries(flexible) as [PreferenceField, PreferenceValue][]) {
    const actual = candidate[field];
    if (actual === undefined || actual === null || actual === "") {
      if (!unknownFields.includes(field)) unknownFields.push(field);
      continue;
    }
    flexibleCompared += 1;
    if (matches(field, actual, expected)) {
      flexibleMatched += 1;
      if (!matchedFields.includes(field)) matchedFields.push(field);
    }
  }

  const score = flexibleCompared > 0 ? Math.round((flexibleMatched / flexibleCompared) * 100) : null;
  const eligible = mismatchedFields.length > 0 ? false : unknownMustHaveFields.length > 0 ? "unknown" : true;
  return { eligible, score, matchedFields, unknownFields, mismatchedFields };
}
