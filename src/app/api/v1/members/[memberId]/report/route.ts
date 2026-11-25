import { query } from "@/lib/server/db";
import { jsonError, jsonOk } from "@/lib/server/http";
import { hasTrustedOrigin } from "@/lib/server/origin";
import { currentUser } from "@/lib/server/session";

export const runtime = "nodejs";
const CATEGORIES = new Set(["fake_profile", "harassment", "fraud", "safety_concern", "other"]);

export async function POST(request: Request, context: { params: Promise<{ memberId: string }> }) {
  if (!hasTrustedOrigin(request)) return jsonError(403, "UNTRUSTED_ORIGIN", "This request could not be verified.");
  const viewer = await currentUser();
  if (!viewer) return jsonError(401, "UNAUTHENTICATED", "Please sign in to report a member.");
  const { memberId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(memberId) || memberId === viewer.id) {
    return jsonError(400, "INVALID_MEMBER", "The member reference is invalid.");
  }
  let body: { category?: unknown; description?: unknown };
  try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Please submit a valid request."); }
  if (typeof body.category !== "string" || !CATEGORIES.has(body.category)) {
    return jsonError(400, "INVALID_CATEGORY", "Choose a supported report category.");
  }
  if (typeof body.description !== "string" || body.description.trim().length < 10 || body.description.trim().length > 2000) {
    return jsonError(400, "INVALID_DESCRIPTION", "Please provide 10 to 2,000 characters describing the concern.");
  }

  try {
    const result = await query(
      `INSERT INTO member_report(reporter_user_id, reported_user_id, category, description)
       SELECT $1, id, $3, $4 FROM app_user WHERE id = $2 AND status = 'active'
       RETURNING id, category, status, created_at`,
      [viewer.id, memberId, body.category, body.description.trim()],
    );
    if (!result.rowCount) return jsonError(404, "MEMBER_NOT_FOUND", "This member is not available.");
    return jsonOk({ report: result.rows[0], message: "Your report has been submitted for review." }, 201);
  } catch {
    return jsonError(503, "REPORT_UNAVAILABLE", "Your report could not be submitted. Please try again.");
  }
}
