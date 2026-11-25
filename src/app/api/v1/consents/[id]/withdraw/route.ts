import { transaction } from "@/lib/server/db";
import { jsonError, jsonOk } from "@/lib/server/http";
import { hasTrustedOrigin } from "@/lib/server/origin";
import { currentUser } from "@/lib/server/session";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!hasTrustedOrigin(request)) return jsonError(403, "UNTRUSTED_ORIGIN", "This request could not be verified.");
  const user = await currentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED", "Please sign in to change consent settings.");
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(400, "INVALID_CONSENT_ID", "The consent reference is invalid.");

  try {
    const withdrawn = await transaction(async client => {
      const result = await client.query(
        `UPDATE consent_record SET revoked_at = now()
          WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
          RETURNING id, purpose, revoked_at`,
        [id, user.id],
      );
      if (!result.rows[0]) return null;
      await client.query(
        "INSERT INTO auth_security_event(actor_user_id, subject_user_id, event_type, metadata) VALUES ($1, $1, 'consent_withdrawn', $2)",
        [user.id, { purpose: result.rows[0].purpose }],
      );
      return result.rows[0];
    });
    if (!withdrawn) return jsonError(404, "CONSENT_NOT_FOUND", "The active consent record could not be found.");
    return jsonOk({ consent: withdrawn, message: "Consent withdrawn. New processing under this consent is blocked." });
  } catch {
    return jsonError(503, "CONSENT_UNAVAILABLE", "Your consent could not be withdrawn. Please try again.");
  }
}
