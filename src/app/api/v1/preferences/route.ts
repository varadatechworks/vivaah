import { query } from "@/lib/server/db";
import { jsonError, jsonOk } from "@/lib/server/http";
import { hasTrustedOrigin } from "@/lib/server/origin";
import { currentUser } from "@/lib/server/session";

export const runtime = "nodejs";
const FIELDS = new Set(["age", "city", "countryCode", "profession", "education"]);

function validPreferenceSet(value: unknown): value is Record<string, unknown> {
  const serialized = JSON.stringify(value);
  if (!value || typeof value !== "object" || Array.isArray(value) || !serialized || serialized.length > 4000) return false;
  for (const [field, criterion] of Object.entries(value)) {
    if (!FIELDS.has(field)) return false;
    if (field === "age") {
      if (!criterion || typeof criterion !== "object" || Array.isArray(criterion)) return false;
      const range = criterion as { min?: unknown; max?: unknown };
      if (range.min !== undefined && (!Number.isInteger(range.min) || (range.min as number) < 18 || (range.min as number) > 100)) return false;
      if (range.max !== undefined && (!Number.isInteger(range.max) || (range.max as number) < 18 || (range.max as number) > 100)) return false;
      if (range.min === undefined && range.max === undefined) return false;
      if (range.min !== undefined && range.max !== undefined && (range.min as number) > (range.max as number)) return false;
      continue;
    }
    const values = Array.isArray(criterion) ? criterion : [criterion];
    if (values.length < 1 || values.length > 10 || values.some(item => typeof item !== "string" || !item.trim() || item.length > 100)) return false;
  }
  return true;
}

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return jsonError(401, "UNAUTHENTICATED", "Please sign in to view your preferences.");
    const result = await query(
      "SELECT must_have, flexible, updated_at FROM partner_preference WHERE user_id = $1 LIMIT 1",
      [user.id],
    );
    return jsonOk({ preferences: result.rows[0] ?? { must_have: {}, flexible: {} } });
  } catch {
    return jsonError(503, "PREFERENCES_UNAVAILABLE", "Your preferences are temporarily unavailable.");
  }
}

export async function PUT(request: Request) {
  if (!hasTrustedOrigin(request)) return jsonError(403, "UNTRUSTED_ORIGIN", "This request could not be verified.");
  const user = await currentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED", "Please sign in to update your preferences.");
  let body: { mustHave?: unknown; flexible?: unknown };
  try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Please submit a valid request."); }
  if (!validPreferenceSet(body.mustHave ?? {}) || !validPreferenceSet(body.flexible ?? {})) {
    return jsonError(400, "INVALID_PREFERENCES", "Use supported preference fields and valid values.");
  }
  try {
    const result = await query(
      `INSERT INTO partner_preference(user_id, must_have, flexible, updated_at)
       VALUES ($1, $2::jsonb, $3::jsonb, now())
       ON CONFLICT (user_id) DO UPDATE SET
         must_have = EXCLUDED.must_have,
         flexible = EXCLUDED.flexible,
         updated_at = now()
       RETURNING must_have, flexible, updated_at`,
      [user.id, JSON.stringify(body.mustHave ?? {}), JSON.stringify(body.flexible ?? {})],
    );
    return jsonOk({ preferences: result.rows[0], message: "Your preferences have been saved." });
  } catch {
    return jsonError(503, "PREFERENCES_SAVE_FAILED", "Your preferences could not be saved.");
  }
}
