import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { transaction } from "@/lib/server/db";
import { sendSignInCode } from "@/lib/server/email";
import { jsonError, jsonOk, clientIp } from "@/lib/server/http";
import { generateOtp, hashOtp, normalizeEmail, requestFingerprint } from "@/lib/server/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { email?: unknown };
  try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Please submit a valid request."); }
  const email = normalizeEmail(body.email);
  if (!email) return jsonError(400, "INVALID_EMAIL", "Enter a valid email address.");

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!apiKey || !from || !process.env.OTP_PEPPER || process.env.OTP_PEPPER.length < 32) {
    return jsonError(503, "AUTH_NOT_CONFIGURED", "Sign-in is temporarily unavailable. Please try again later.");
  }

  const otp = generateOtp();
  const challengeId = randomUUID();
  const ipHash = requestFingerprint(clientIp(request));
  const agentHash = requestFingerprint(request.headers.get("user-agent"));

  try {
    const eligible = await transaction(async client => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [email]);
      const rate = await client.query(
        `SELECT count(*)::int AS count FROM auth_otp_challenge
          WHERE destination = $1 AND requested_at > now() - interval '15 minutes'`,
        [email],
      );
      if ((rate.rows[0]?.count ?? 0) >= 5) return false;

      await client.query(
        `INSERT INTO app_user(email, status) VALUES ($1, 'pending_verification')
         ON CONFLICT (email) DO NOTHING`,
        [email],
      );
      const user = await client.query(
        "SELECT status FROM app_user WHERE lower(email) = $1",
        [email],
      );
      if (!user.rows[0] || ["suspended", "deleted", "deletion_requested"].includes(user.rows[0].status)) return false;

      const recentIp = await client.query(
        `SELECT count(*)::int AS count FROM auth_otp_challenge
          WHERE request_ip_hash = $1 AND requested_at > now() - interval '15 minutes'`,
        [ipHash],
      );
      if (ipHash && (recentIp.rows[0]?.count ?? 0) >= 20) return false;

      await client.query(
        `UPDATE auth_otp_challenge SET invalidated_at = now()
          WHERE destination = $1 AND purpose = 'sign_in'
            AND consumed_at IS NULL AND invalidated_at IS NULL`,
        [email],
      );
      await client.query(
        `INSERT INTO auth_otp_challenge
          (id, channel, destination, code_hash, purpose, max_attempts, expires_at, request_ip_hash, request_user_agent_hash)
         VALUES ($1, 'email', $2, $3, 'sign_in', 5, now() + interval '5 minutes', $4, $5)`,
        [challengeId, email, hashOtp(otp, email, challengeId), ipHash, agentHash],
      );
      return true;
    });

    if (!eligible) return jsonError(429, "OTP_RATE_LIMITED", "Too many attempts. Please wait before trying again.");
    try {
      await sendSignInCode(email, otp);
    } catch {
      await transaction(async client => {
        await client.query("UPDATE auth_otp_challenge SET invalidated_at = now() WHERE id = $1 AND consumed_at IS NULL", [challengeId]);
      });
      return jsonError(503, "EMAIL_DELIVERY_FAILED", "We could not send your code. Please try again later.");
    }
    return jsonOk({ message: "If this address can sign in, a verification code has been sent.", expiresInSeconds: 300 });
  } catch {
    return jsonError(503, "AUTH_TEMPORARILY_UNAVAILABLE", "Sign-in is temporarily unavailable. Please try again later.");
  }
}
