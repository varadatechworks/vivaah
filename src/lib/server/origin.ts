export function hasTrustedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host");
    const host = forwardedHost?.split(",")[0]?.trim() || request.headers.get("host");
    return !!host && parsed.host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}
