import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { service: "vivaah-web", status: "ok", timestamp: new Date().toISOString(), readiness: "check /api/ready" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
