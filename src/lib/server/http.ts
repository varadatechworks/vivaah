import { NextResponse } from "next/server";

export function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, {
    status,
    headers: { "Cache-Control": "no-store", "Pragma": "no-cache" },
  });
}

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "Pragma": "no-cache" },
  });
}

export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}
