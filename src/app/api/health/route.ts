import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ service: "vivaah-web", status: "ok", timestamp: new Date().toISOString(), readiness: "prototype-only" }, { headers: { "Cache-Control": "no-store" } });
}
