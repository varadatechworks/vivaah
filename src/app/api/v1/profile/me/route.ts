import { query } from "@/lib/server/db";
import { jsonError, jsonOk } from "@/lib/server/http";
import { currentUser } from "@/lib/server/session";

export const runtime = "nodejs";

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
