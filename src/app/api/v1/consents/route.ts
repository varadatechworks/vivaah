import { transaction, query } from "@/lib/server/db";
import { jsonError, jsonOk } from "@/lib/server/http";
import { hasTrustedOrigin } from "@/lib/server/origin";
import { currentUser } from "@/lib/server/session";

export const runtime = "nodejs";
const PURPOSES = new Set(["profile_discovery", "social_provider_connect", "social_overlap", "horoscope_processing", "ai_compatibility", "values_processing", "marketing"]);

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return jsonError(401, "UNAUTHENTICATED", "Please sign in to view your consent settings.");
    const result = await query(
      `SELECT id, purpose, scope, policy_version, granted_at, revoked_at
         FROM consent_record WHERE user_id = $1 ORDER BY granted_at DESC LIMIT 200`,
      [user.id],
    );
    return jsonOk({ consents: result.rows });
  } catch {
    return jsonError(503, "CONSENT_UNAVAILABLE", "Consent settings are temporarily unavailable.");
  }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return jsonError(403, "UNTRUSTED_ORIGIN", "This request could not be verified.");
  const user = await currentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED", "Please sign in to change consent settings.");

  let body: { purpose?: unknown; scope?: unknown };
  try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Please submit a valid request."); }
  if (typeof body.purpose !== "string" || !PURPOSES.has(body.purpose)) {
    return jsonError(400, "INVALID_PURPOSE", "Choose a supported consent purpose.");
  }
  const serializedScope = JSON.stringify(body.scope);
  if (!body.scope || typeof body.scope !== "object" || Array.isArray(body.scope) || !serializedScope || serializedScope.length > 2000) {
    return jsonError(400, "INVALID_SCOPE", "The consent scope is invalid.");
  }

  const policyVersion = process.env.CONSENT_POLICY_VERSION || "v1";
  try {
    const receipt = await transaction(async client => {
      const existing = await client.query(
        `SELECT id, purpose, scope, policy_version, granted_at
           FROM consent_record
          WHERE user_id = $1 AND purpose = $2 AND scope = $3::jsonb
            AND policy_version = $4 AND revoked_at IS NULL
          ORDER BY granted_at DESC LIMIT 1`,
        [user.id, body.purpose, JSON.stringify(body.scope), policyVersion],
      );
      if (existing.rows[0]) return existing.rows[0];
      await client.query(
        `UPDATE consent_record SET revoked_at = now()
          WHERE user_id = $1 AND purpose = $2 AND scope = $3::jsonb AND revoked_at IS NULL`,
        [user.id, body.purpose, JSON.stringify(body.scope)],
      );
      const inserted = await client.query(
        `INSERT INTO consent_record(user_id, purpose, scope, policy_version, actor_user_id, source)
         VALUES ($1, $2, $3::jsonb, $4, $1, 'member_settings')
         RETURNING id, purpose, scope, policy_version, granted_at`,
        [user.id, body.purpose, JSON.stringify(body.scope), policyVersion],
      );
      await client.query(
        "INSERT INTO auth_security_event(actor_user_id, subject_user_id, event_type, metadata) VALUES ($1, $1, 'consent_granted', $2)",
        [user.id, { purpose: body.purpose }],
      );
      return inserted.rows[0];
    });
    return jsonOk({ consent: receipt }, 201);
  } catch {
    return jsonError(503, "CONSENT_UNAVAILABLE", "Your consent could not be saved. Please try again.");
  }
}
