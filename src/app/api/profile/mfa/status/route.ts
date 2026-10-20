import { proxyMfaRequest } from "@/lib/auth/mfa-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return proxyMfaRequest(request, "/status", "GET");
}
