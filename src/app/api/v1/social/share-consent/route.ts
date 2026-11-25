import { query, transaction } from "@/lib/server/db";
import { jsonError, jsonOk } from "@/lib/server/http";
import { hasTrustedOrigin } from "@/lib/server/origin";
import { currentUser } from "@/lib/server/session";

export const runtime = "nodejs";
const CATEGORIES = new Set(["pages", "communities", "interests", "creators", "content_themes"]);

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return jsonError(401, "UNAUTHENTICATED", "Please sign in to view Social Connect settings.");
    const result = await query(
      `SELECT category, purpose, policy_version, granted_at, revoked_at,
              (revoked_at IS NULL) AS enabled
         FROM social_share_consent
        WHERE user_id = $1 ORDER BY granted_at DESC LIMIT 200`,
      [user.id],
    );
    return jsonOk({ sharing: result.rows });
  } catch {
    return jsonError(503, "SOCIAL_CONSENT_UNAVAILABLE", "Social Connect settings are temporarily unavailable.");
  }
}

export async function PUT(request: Request) {
  if (!hasTrustedOrigin(request)) return jsonError(403, "UNTRUSTED_ORIGIN", "This request could not be verified.");
  const user = await currentUser();
  if (!user) return jsonError(401, "UNAUTHENTICATED", "Please sign in to change Social Connect settings.");
  let body: { category?: unknown; enabled?: unknown };
  try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Please submit a valid request."); }
  if (typeof body.category !== "string" || !CATEGORIES.has(body.category) || typeof body.enabled !== "boolean") {
    return jsonError(400, "INVALID_INPUT", "Choose a valid category and sharing setting.");
  }

  try {
    const result = await transaction(async client => {
      if (body.enabled) {
        const policyVersion = process.env.CONSENT_POLICY_VERSION || "v1";
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtext($1))",
          [`${user.id}:social_overlap:${body.category}`],
        );
        const existing = await client.query(
          `SELECT id, category, granted_at FROM social_share_consent
            WHERE user_id = $1 AND category = $2 AND purpose = 'match_overlap'
              AND policy_version = $3 AND revoked_at IS NULL LIMIT 1`,
          [user.id, body.category, policyVersion],
        );
        if (existing.rows[0]) return { enabled: true, consent: existing.rows[0] };

        await client.query(
          `UPDATE social_share_consent SET revoked_at = now()
            WHERE user_id = $1 AND category = $2 AND purpose = 'match_overlap'
              AND revoked_at IS NULL`,
          [user.id, body.category],
        );
        const inserted = await client.query(
          `INSERT INTO social_share_consent(user_id, category, purpose, policy_version)
           VALUES ($1, $2, 'match_overlap', $3)
           RETURNING id, category, granted_at`,
          [user.id, body.category, policyVersion],
        );
        await client.query(
          "INSERT INTO auth_security_event(actor_user_id, subject_user_id, event_type, metadata) VALUES ($1, $1, 'consent_granted', $2)",
          [user.id, { purpose: "social_overlap", category: body.category }],
        );
        return { enabled: true, consent: inserted.rows[0] };
      }
      const withdrawn = await client.query(
        `UPDATE social_share_consent SET revoked_at = now()
          WHERE user_id = $1 AND category = $2 AND purpose = 'match_overlap' AND revoked_at IS NULL
          RETURNING id, category, revoked_at`,
        [user.id, body.category],
      );
      if (withdrawn.rowCount) {
        await client.query(
          "INSERT INTO auth_security_event(actor_user_id, subject_user_id, event_type, metadata) VALUES ($1, $1, 'consent_withdrawn', $2)",
          [user.id, { purpose: "social_overlap", category: body.category }],
        );
      }
      return { enabled: false, withdrawn: withdrawn.rows };
    });
    return jsonOk(result);
  } catch {
    return jsonError(503, "SOCIAL_CONSENT_UNAVAILABLE", "Your Social Connect setting could not be saved.");
  }
}
