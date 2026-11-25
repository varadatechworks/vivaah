import { query } from "@/lib/server/db";
import { jsonError, jsonOk } from "@/lib/server/http";
import { currentUser } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const viewer = await currentUser();
  if (!viewer) return jsonError(401, "UNAUTHENTICATED", "Please sign in to discover matches.");

  const url = new URL(request.url);
  const limitValue = Number(url.searchParams.get("limit") ?? 12);
  const offsetValue = Number(url.searchParams.get("offset") ?? 0);
  const limit = Number.isInteger(limitValue) ? Math.min(Math.max(limitValue, 1), 20) : 12;
  const offset = Number.isInteger(offsetValue) ? Math.min(Math.max(offsetValue, 0), 1000) : 0;

  try {
    const ownProfile = await query(
      `SELECT 1 FROM member_profile
        WHERE user_id = $1 AND lifecycle_state = 'active' LIMIT 1`,
      [viewer.id],
    );
    if (!ownProfile.rowCount) {
      return jsonError(409, "PROFILE_NOT_READY", "Complete profile verification before discovering matches.");
    }

    const ownConsent = await query(
      `SELECT 1 FROM consent_record
        WHERE user_id = $1 AND purpose = 'profile_discovery' AND revoked_at IS NULL
        LIMIT 1`,
      [viewer.id],
    );
    if (!ownConsent.rowCount) {
      return jsonOk({ matches: [], limit, offset, hasMore: false, reason: "Enable profile discovery consent to see eligible members." });
    }

    const candidates = await query(
      `SELECT p.user_id AS member_id,
              p.display_name,
              CASE WHEN p.visibility->>'showAge' = 'true' AND p.date_of_birth IS NOT NULL
                THEN date_part('year', age(current_date, p.date_of_birth))::int ELSE NULL END AS age,
              CASE WHEN p.visibility->>'showCity' = 'true' THEN p.city ELSE NULL END AS city,
              CASE WHEN p.visibility->>'showProfession' = 'true' THEN p.profession ELSE NULL END AS profession,
              CASE WHEN p.visibility->>'showEducation' = 'true' THEN p.education ELSE NULL END AS education,
              p.updated_at
         FROM member_profile p
         JOIN app_user u ON u.id = p.user_id
        WHERE p.user_id <> $1
          AND p.lifecycle_state = 'active'
          AND u.status = 'active'
          AND p.visibility->>'discoverable' = 'true'
          AND EXISTS (
            SELECT 1 FROM consent_record c
             WHERE c.user_id = p.user_id
               AND c.purpose = 'profile_discovery'
               AND c.revoked_at IS NULL
          )
          AND NOT EXISTS (
            SELECT 1 FROM member_block b
             WHERE (b.blocker_user_id = $1 AND b.blocked_user_id = p.user_id)
                OR (b.blocker_user_id = p.user_id AND b.blocked_user_id = $1)
          )
        ORDER BY p.updated_at DESC
        LIMIT $2 OFFSET $3`,
      [viewer.id, limit + 1, offset],
    );
    const hasMore = candidates.rows.length > limit;
    const matches = candidates.rows.slice(0, limit).map(row => ({
      ...row,
      matchScore: null,
      dimensions: {
        preference: "not_calculated",
        horoscope: "not_calculated",
        social: "requires_mutual_category_consent",
        aiCompatibility: "not_calculated",
        values: "not_calculated",
      },
    }));
    return jsonOk({ matches, limit, offset, hasMore });
  } catch {
    return jsonError(503, "DISCOVERY_UNAVAILABLE", "Match discovery is temporarily unavailable.");
  }
}
