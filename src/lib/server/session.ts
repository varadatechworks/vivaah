import { cookies } from "next/headers";
import { query } from "@/lib/server/db";
import { hashSessionToken } from "@/lib/server/security";

const COOKIE_NAME = "vivaah_session";

export type AuthenticatedUser = { id: string; email: string; status: string };

export async function currentUser(): Promise<AuthenticatedUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token || token.length < 40 || token.length > 100) return null;
  const result = await query<AuthenticatedUser>(
    `SELECT u.id, u.email, u.status
       FROM auth_session s
       JOIN app_user u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > now()
        AND u.status = 'active'
      LIMIT 1`,
    [hashSessionToken(token)],
  );
  return result.rows[0] ?? null;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export { COOKIE_NAME };
