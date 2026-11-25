import { query, transaction } from "@/lib/server/db";
import { jsonError, jsonOk } from "@/lib/server/http";
import { hasTrustedOrigin } from "@/lib/server/origin";
import { currentUser } from "@/lib/server/session";

export const runtime = "nodejs";

function validText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}

function validDateOfBirth(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  const today = new Date();
  const cutoff = new Date(Date.UTC(today.getUTCFullYear() - 18, today.getUTCMonth(), today.getUTCDate()));
  return date <= cutoff;
}

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return jsonError(401, "UNAUTHENTICATED", "Please sign in to view your profile.");
    const result = await query(
      `SELECT id, display_name, date_of_birth, city, country_code, profession, education,
              lifecycle_state, visibility, created_at, updated_at
         FROM member_profile WHERE user_id = $1 LIMIT 1`,
      [user.id],
    );
    return jsonOk({ profile: result.rows[0] ?? null });
  } catch {
    return jsonError(503, "PROFILE_UNAVAILABLE", "Your profile is temporarily unavailable.");
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return jsonError(403, "UNTRUSTED_ORIGIN", "This request could not be verified.");
  const user = await currentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED", "Please sign in to update your profile.");

  let body: {
    displayName?: unknown; dateOfBirth?: unknown; city?: unknown;
    countryCode?: unknown; profession?: unknown; education?: unknown;
    visibility?: unknown;
  };
  try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Please submit a valid request."); }

  if (!validText(body.displayName, 80)) return jsonError(400, "INVALID_DISPLAY_NAME", "Enter a display name up to 80 characters.");
  if (body.dateOfBirth !== undefined && body.dateOfBirth !== null && !validDateOfBirth(body.dateOfBirth)) {
    return jsonError(400, "INVALID_DATE_OF_BIRTH", "Enter a valid date of birth. Members must be at least 18 years old.");
  }
  if (body.city !== undefined && body.city !== null && (typeof body.city !== "string" || body.city.length > 100)) {
    return jsonError(400, "INVALID_CITY", "City must be 100 characters or fewer.");
  }
  if (body.countryCode !== undefined && body.countryCode !== null && (typeof body.countryCode !== "string" || !/^[A-Za-z]{2}$/.test(body.countryCode))) {
    return jsonError(400, "INVALID_COUNTRY_CODE", "Use a two-letter country code.");
  }
  if (body.profession !== undefined && body.profession !== null && (typeof body.profession !== "string" || body.profession.length > 120)) {
    return jsonError(400, "INVALID_PROFESSION", "Profession must be 120 characters or fewer.");
  }
  if (body.education !== undefined && body.education !== null && (typeof body.education !== "string" || body.education.length > 160)) {
    return jsonError(400, "INVALID_EDUCATION", "Education must be 160 characters or fewer.");
  }
  const visibility = body.visibility ?? {};
  if (!visibility || typeof visibility !== "object" || Array.isArray(visibility) || JSON.stringify(visibility).length > 1000) {
    return jsonError(400, "INVALID_VISIBILITY", "Profile visibility settings are invalid.");
  }

  try {
    const profile = await transaction(async client => {
      const result = await client.query(
        `INSERT INTO member_profile
          (user_id, display_name, date_of_birth, city, country_code, profession, education, visibility, lifecycle_state)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, 'incomplete')
         ON CONFLICT (user_id) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           date_of_birth = EXCLUDED.date_of_birth,
           city = EXCLUDED.city,
           country_code = EXCLUDED.country_code,
           profession = EXCLUDED.profession,
           education = EXCLUDED.education,
           visibility = EXCLUDED.visibility,
           updated_at = now()
         RETURNING id, display_name, date_of_birth, city, country_code, profession, education,
                   lifecycle_state, visibility, created_at, updated_at`,
        [
          user.id, body.displayName.trim(), body.dateOfBirth ?? null,
          typeof body.city === "string" ? body.city.trim() : null,
          typeof body.countryCode === "string" ? body.countryCode.toUpperCase() : null,
          typeof body.profession === "string" ? body.profession.trim() : null,
          typeof body.education === "string" ? body.education.trim() : null,
          JSON.stringify(visibility),
        ],
      );
      return result.rows[0];
    });
    return jsonOk({ profile, message: "Your profile has been saved." });
  } catch {
    return jsonError(503, "PROFILE_SAVE_FAILED", "Your profile could not be saved. Please try again.");
  }
}
