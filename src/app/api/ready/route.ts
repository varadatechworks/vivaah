import { NextResponse } from "next/server";
import { query } from "@/lib/server/db";

export const runtime = "nodejs";

export async function GET() {
  const checks: Record<string, "ok" | "failed"> = {
    database: "failed",
    email: process.env.RESEND_API_KEY && process.env.AUTH_EMAIL_FROM ? "ok" : "failed",
    otpSecret: process.env.OTP_PEPPER && process.env.OTP_PEPPER.length >= 32 ? "ok" : "failed",
  };
  try {
    await query("SELECT 1");
    checks.database = "ok";
  } catch {
    checks.database = "failed";
  }
  const ready = Object.values(checks).every(value => value === "ok");
  return NextResponse.json(
    { service: "vivaah-web", ready, checks, timestamp: new Date().toISOString() },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
