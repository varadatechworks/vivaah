import { query } from "@/lib/server/db";
import { jsonError, jsonOk } from "@/lib/server/http";
import { hasTrustedOrigin } from "@/lib/server/origin";
import { currentUser } from "@/lib/server/session";

export const runtime = "nodejs";

async function validTarget(memberId: string, viewerId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(memberId) || memberId === viewerId) return false;
  const result = await query("SELECT 1 FROM app_user WHERE id = $1 AND status = 'active' LIMIT 1", [memberId]);
  return !!result.rowCount;
}

export async function POST(request: Request, context: { params: Promise<{ memberId: string }> }) {
  if (!hasTrustedOrigin(request)) return jsonError(403, "UNTRUSTED_ORIGIN", "This request could not be verified.");
  const viewer = await currentUser();
  if (!viewer) return jsonError(401, "UNAUTHENTICATED", "Please sign in to manage blocked members.");
  const { memberId } = await context.params;
  try {
    if (!(await validTarget(memberId, viewer.id))) return jsonError(404, "MEMBER_NOT_FOUND", "This member is not available.");
    await query(
      "INSERT INTO member_block(blocker_user_id, blocked_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [viewer.id, memberId],
    );
    return jsonOk({ blocked: true, message: "This member is now blocked." });
  } catch {
    return jsonError(503, "BLOCK_UNAVAILABLE", "We could not update your block settings.");
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ memberId: string }> }) {
  if (!hasTrustedOrigin(request)) return jsonError(403, "UNTRUSTED_ORIGIN", "This request could not be verified.");
  const viewer = await currentUser();
  if (!viewer) return jsonError(401, "UNAUTHENTICATED", "Please sign in to manage blocked members.");
  const { memberId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(memberId) || memberId === viewer.id) {
    return jsonError(400, "INVALID_MEMBER", "The member reference is invalid.");
  }
  try {
    await query("DELETE FROM member_block WHERE blocker_user_id = $1 AND blocked_user_id = $2", [viewer.id, memberId]);
    return jsonOk({ blocked: false, message: "This member has been unblocked." });
  } catch {
    return jsonError(503, "BLOCK_UNAVAILABLE", "We could not update your block settings.");
  }
}
