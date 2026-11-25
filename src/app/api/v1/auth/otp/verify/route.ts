import { NextResponse } from "next/server";
import { transaction } from "@/lib/server/db";
import { jsonError, clientIp } from "@/lib/server/http";
import { hashSessionToken, newSessionToken, normalizeEmail, requestFingerprint, validOtp, verifyOtp } from "@/lib/server/security";
import { COOKIE_NAME, sessionCookieOptions } from "@/lib/server/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { email?: unknown; code?: unknown };
  try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Please submit a valid request."); }
  const email = normalizeEmail(body.email);
  if (!email || !validOtp(body.code)) return jsonError(400, "INVALID_CODE", "The verification code is invalid or expired.");
  if (!process.env.OTP_PEPPER || process.env.OTP_PEPPER.length < 32) {
    return jsonError(503, "AUTH_NOT_CONFIGURED", "Sign-in is temporarily unavailable.");
  }

  const rawToken = newSessionToken();
  const ipHash = requestFingerprint(clientIp(request));
  const agentHash = requestFingerprint(request.headers.get("user-agent"));

  try {
    const userId = await transaction(async client => {
      const challenge = await client.query(
        `SELECT id, code_hash, attempts, max_attempts
           FROM auth_otp_challenge
          WHERE channel = 'email' AND destination = $1 AND purpose = 'sign_in'
            AND consumed_at IS NULL AND invalidated_at IS NULL AND expires_at > now()
          ORDER BY requested_at DESC LIMIT 1 FOR UPDATE`,
        [email],
      );
      const row = challenge.rows[0];
      if (!row) return null;

      const matches = verifyOtp(body.code as string, email, row.id, row.code_hash);
      if (!matches) {
        await client.query("UPDATE auth_otp_challenge SET attempts = attempts + 1 WHERE id = $1", [row.id]);
        await client.query(
          `UPDATE auth_otp_challenge SET invalidated_at = now()
            WHERE id = $1 AND attempts >= max_attempts`,
          [row.id],
        );
        await client.query(
          "INSERT INTO auth_security_event(event_type, occurred_at, ip_hash, metadata) VALUES ('otp_failed', now(), $1, $2)",
          [ipHash, { purpose: "sign_in" }],
        );
        return null;
      }

      const user = await client.query(
        `UPDATE app_user SET status = 'active', email_verified_at = COALESCE(email_verified_at, now()), last_authenticated_at = now(), updated_at = now()
          WHERE lower(email) = $1 AND status IN ('pending_verification', 'active')
          RETURNING id, email`,
        [email],
      );
      if (!user.rows[0]) return null;

      await client.query("UPDATE auth_otp_challenge SET consumed_at = now() WHERE id = $1", [row.id]);
      await client.query(
        "INSERT INTO auth_security_event(actor_user_id, subject_user_id, event_type, ip_hash, metadata) VALUES ($1, $1, 'otp_verified', $2, $3)",
        [user.rows[0].id, ipHash, { purpose: "sign_in" }],
      );
      await client.query(
        `INSERT INTO auth_session(user_id, token_hash, expires_at, ip_hash, user_agent_hash)
         VALUES ($1, $2, now() + interval '7 days', $3, $4)`,
        [user.rows[0].id, hashSessionToken(rawToken), ipHash, agentHash],
      );
      await client.query(
        "INSERT INTO auth_security_event(actor_user_id, subject_user_id, event_type, ip_hash) VALUES ($1, $1, 'session_created', $2)",
        [user.rows[0].id, ipHash],
      );
      return user.rows[0].id as string;
    });

    if (!userId) return jsonError(401, "INVALID_CODE", "The verification code is invalid or expired.");
    const response = NextResponse.json({ authenticated: true, message: "You are signed in." }, {
      headers: { "Cache-Control": "no-store", "Pragma": "no-cache" },
    });
    response.cookies.set(COOKIE_NAME, rawToken, sessionCookieOptions());
    return response;
  } catch {
    return jsonError(503, "AUTH_TEMPORARILY_UNAVAILABLE", "Sign-in is temporarily unavailable. Please try again later.");
  }
}
