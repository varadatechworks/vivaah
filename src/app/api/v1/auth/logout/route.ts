import { NextResponse } from "next/server";
import { query } from "@/lib/server/db";
import { jsonError } from "@/lib/server/http";
import { hasTrustedOrigin } from "@/lib/server/origin";
import { hashSessionToken } from "@/lib/server/security";
import { COOKIE_NAME, sessionCookieOptions } from "@/lib/server/session";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return jsonError(403, "UNTRUSTED_ORIGIN", "This request could not be verified.");
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (token) {
    try {
      await query(
        `UPDATE auth_session SET revoked_at = now(), revoke_reason = 'logout'
          WHERE token_hash = $1 AND revoked_at IS NULL`,
        [hashSessionToken(token)],
      );
    } catch {
      return jsonError(503, "LOGOUT_UNAVAILABLE", "We could not safely end your session. Please try again.");
    }
  }
  const response = NextResponse.json({ authenticated: false, message: "You are signed out." }, {
    headers: { "Cache-Control": "no-store" },
  });
  response.cookies.set(COOKIE_NAME, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
