import { query } from "@/lib/server/db";

export async function isRateLimited(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const result = await query<{ count: number }>(
    `SELECT count(*)::int AS count
       FROM auth_otp_challenge
      WHERE request_ip_hash = decode($1, 'hex')
        AND requested_at > now() - ($2::text || ' seconds')::interval`,
    [key, windowSeconds],
  );
  return Number(result.rows[0]?.count ?? 0) >= limit;
}
