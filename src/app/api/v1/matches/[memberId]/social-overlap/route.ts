import { query } from "@/lib/server/db";
import { jsonError, jsonOk } from "@/lib/server/http";
import { currentUser } from "@/lib/server/session";

export const runtime = "nodejs";
const CATEGORIES = new Set(["pages", "communities", "interests", "creators", "content_themes"]);

export async function GET(
  request: Request,
  context: { params: Promise<{ memberId: string }> },
) {
  const viewer = await currentUser();
  if (!viewer) return jsonError(401, "UNAUTHENTICATED", "Please sign in to view match details.");

  const { memberId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(memberId) || memberId === viewer.id) {
    return jsonError(400, "INVALID_MEMBER", "The member reference is invalid.");
  }
  const category = new URL(request.url).searchParams.get("category") || "pages";
  if (!CATEGORIES.has(category)) return jsonError(400, "INVALID_CATEGORY", "Choose a supported Social Connect category.");

  try {
    const blocked = await query(
      `SELECT 1 FROM member_block
        WHERE (blocker_user_id = $1 AND blocked_user_id = $2)
           OR (blocker_user_id = $2 AND blocked_user_id = $1)
        LIMIT 1`,
      [viewer.id, memberId],
    );
    if (blocked.rowCount) return jsonError(404, "MATCH_NOT_FOUND", "This match is not available.");

    const eligible = await query(
      `SELECT 1
         FROM app_user u
         JOIN member_profile p ON p.user_id = u.id
        WHERE u.id = $1 AND u.status = 'active' AND p.lifecycle_state = 'active'
        LIMIT 1`,
      [memberId],
    );
    if (!eligible.rowCount) return jsonError(404, "MATCH_NOT_FOUND", "This match is not available.");

    const consents = await query(
      `SELECT user_id
         FROM social_share_consent
        WHERE user_id = ANY($1::uuid[]) AND category = $2
          AND purpose = 'match_overlap' AND revoked_at IS NULL`,
      [[viewer.id, memberId], category],
    );
    const permitted = new Set(consents.rows.map(row => row.user_id as string));
    if (!permitted.has(viewer.id) || !permitted.has(memberId)) {
      return jsonOk({
        category,
        count: null,
        items: [],
        available: false,
        reason: "Mutual sharing permission is required for this category.",
      });
    }

    const overlap = await query(
      `SELECT a.external_id_hash AS id,
              a.display_label AS label,
              a.source AS source
         FROM social_entity a
         JOIN social_entity b
           ON b.category = a.category
          AND b.external_id_hash = a.external_id_hash
        WHERE a.user_id = $1 AND b.user_id = $2
          AND a.category = $3
          AND (a.expires_at IS NULL OR a.expires_at > now())
          AND (b.expires_at IS NULL OR b.expires_at > now())
        ORDER BY a.display_label
        LIMIT 100`,
      [viewer.id, memberId, category],
    );
    return jsonOk({
      category,
      count: overlap.rows.length,
      items: overlap.rows.map(row => ({ id: row.id, label: row.label })),
      available: true,
      sourceTypes: [...new Set(overlap.rows.map(row => row.source))],
    });
  } catch {
    return jsonError(503, "SOCIAL_OVERLAP_UNAVAILABLE", "Social Connect overlap is temporarily unavailable.");
  }
}
