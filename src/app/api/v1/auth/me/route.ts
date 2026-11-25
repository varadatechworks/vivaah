import { currentUser } from "@/lib/server/session";
import { jsonError, jsonOk } from "@/lib/server/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return jsonError(401, "UNAUTHENTICATED", "Please sign in to continue.");
    return jsonOk({ user: { id: user.id, email: user.email } });
  } catch {
    return jsonError(503, "AUTH_TEMPORARILY_UNAVAILABLE", "Your session could not be checked right now.");
  }
}
