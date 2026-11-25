import { query } from "@/lib/server/db";
import { jsonError, jsonOk } from "@/lib/server/http";
import { currentUser } from "@/lib/server/session";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ memberId: string }> }) {
  const viewer = await currentUser();
  if (!viewer) return jsonError(401, "UNAUTHENTICATED", "Please sign in to view match details.");
  const { memberId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(memberId) || memberId === viewer.id) {
    return jsonError(400, "INVALID_MEMBER", "The member reference is invalid.");
  }

  try {
    const result = await query(
      `SELECT p.user_id AS member_id,
              p.display_name,
              CASE WHEN p.visibility->>'showAge' = 'true' AND p.date_of_birth IS NOT NULL
                THEN date_part('year', age(current_date, p.date_of_birth))::int ELSE NULL END AS age,
              CASE WHEN p.visibility->>'showCity' = 'true' THEN p.city ELSE NULL END AS city,
              CASE WHEN p.visibility->>'showCountryCode' = 'true' THEN p.country_code ELSE NULL END AS country_code,
              CASE WHEN p.visibility->>'showProfession' = 'true' THEN p.profession ELSE NULL END AS profession,
              CASE WHEN p.visibility->>'showEducation' = 'true' THEN p.education ELSE NULL END AS education
         FROM member_profile p
         JOIN app_user u ON u.id = p.user_id
        WHERE p.user_id = $2
          AND p.lifecycle_state = 'active'
          AND u.status = 'active'
          AND p.visibility->>'discoverable' = 'true'
          AND EXISTS (
            SELECT 1 FROM consent_record c
             WHERE c.user_id = p.user_id AND c.purpose = 'profile_discovery' AND c.revoked_at IS NULL
          )
          AND EXISTS (
            SELECT 1 FROM member_profile mine
             WHERE mine.user_id = $1 AND mine.lifecycle_state = 'active'
          )
          AND EXISTS (
            SELECT 1 FROM consent_record own
             WHERE own.user_id = $1 AND own.purpose = 'profile_discovery' AND own.revoked_at IS NULL
          )
          AND NOT EXISTS (
            SELECT 1 FROM member_block b
             WHERE (b.blocker_user_id = $1 AND b.blocked_user_id = p.user_id)
                OR (b.blocker_user_id = p.user_id AND b.blocked_user_id = $1)
          )
        LIMIT 1`,
      [viewer.id, memberId],
    );
    if (!result.rowCount) return jsonError(404, "MATCH_NOT_FOUND", "This match is not available.");
    return jsonOk({
      match: {
        ...result.rows[0],
        matchScore: null,
        dimensions: {
          preference: "not_calculated",
          horoscope: "not_calculated",
          social: "requires_mutual_category_consent",
          aiCompatibility: "not_calculated",
          values: "not_calculated",
        },
      },
    });
  } catch {
    return jsonError(503, "MATCH_UNAVAILABLE", "Match details are temporarily unavailable.");
  }
}
