import { query } from "@/lib/server/db";
import { jsonError, jsonOk } from "@/lib/server/http";
import { hasTrustedOrigin } from "@/lib/server/origin";
import { currentUser } from "@/lib/server/session";

export const runtime = "nodejs";
const ACTIONS = new Set(["viewed", "shortlisted", "interested", "passed"]);

export async function POST(request: Request, context: { params: Promise<{ memberId: string }> }) {
  if (!hasTrustedOrigin(request)) return jsonError(403, "UNTRUSTED_ORIGIN", "This request could not be verified.");
  const viewer = await currentUser();
  if (!viewer) return jsonError(401, "UNAUTHENTICATED", "Please sign in to update a match.");

  const { memberId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(memberId) || memberId === viewer.id) {
    return jsonError(400, "INVALID_MEMBER", "The member reference is invalid.");
  }
  let body: { action?: unknown };
  try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Please submit a valid request."); }
  if (typeof body.action !== "string" || !ACTIONS.has(body.action)) {
    return jsonError(400, "INVALID_ACTION", "Choose a supported match action.");
  }

  try {
    const result = await query(
      `INSERT INTO match_feedback(user_id, candidate_user_id, action)
       SELECT $1, p.user_id, $3
         FROM member_profile p
         JOIN app_user u ON u.id = p.user_id
        WHERE p.user_id = $2 AND p.lifecycle_state = 'active' AND u.status = 'active'
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
       RETURNING id, candidate_user_id, action, created_at`,
      [viewer.id, memberId, body.action],
    );
    if (!result.rowCount) return jsonError(404, "MATCH_NOT_FOUND", "This match is not available.");
    return jsonOk({ feedback: result.rows[0] }, 201);
  } catch {
    return jsonError(503, "FEEDBACK_UNAVAILABLE", "Your match action could not be saved.");
  }
}
