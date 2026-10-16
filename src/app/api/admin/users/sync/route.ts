import { NextResponse } from "next/server";
import { and, eq, inArray, or } from "drizzle-orm";
import { withRouteGuard } from "@/lib/auth/route-protection";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";
type ScimUser = { id?: string; userName?: string; active?: boolean; name?: { givenName?: string; familyName?: string }; displayName?: string; emails?: { value: string; primary?: boolean }[] };
type ScimList = { Resources?: ScimUser[]; totalResults?: number; detail?: string; message?: string };
function requiredEnv(name: string) { const value = process.env[name]?.trim(); if (!value) throw new Error(`${name} is not configured.`); return value; }
async function getScimToken(issuer: string) {
  const clientId = requiredEnv("TSCLOAK_SCIM_CLIENT_ID"); const clientSecret = requiredEnv("TSCLOAK_SCIM_CLIENT_SECRET");
  if (clientId !== requiredEnv("TSCLOAK_CLIENT_ID")) throw new Error("TSCLOAK_SCIM_CLIENT_ID must match TSCLOAK_CLIENT_ID for this deployment.");
  const method = (process.env.TSCLOAK_SCIM_TOKEN_AUTH_METHOD ?? "client_secret_post").toLowerCase();
  const form = new URLSearchParams({ grant_type: "client_credentials", scope: "scim" }); const headers = new Headers({ "content-type": "application/x-www-form-urlencoded", accept: "application/json" });
  if (method === "client_secret_post") { form.set("client_id", clientId); form.set("client_secret", clientSecret); }
  else if (method === "client_secret_basic") headers.set("authorization", `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`);
  else throw new Error("TSCLOAK_SCIM_TOKEN_AUTH_METHOD must be client_secret_post or client_secret_basic.");
  const response = await fetch(`${issuer}/token`, { method: "POST", headers, body: form, cache: "no-store", signal: AbortSignal.timeout(15000) });
  const body = await response.json().catch(() => ({})) as { access_token?: string; scope?: string; error_description?: string; error?: string };
  if (!response.ok || !body.access_token) throw new Error(`TSCloak token request failed (HTTP ${response.status}): ${body.error_description ?? body.error ?? "no access token returned"}`);
  if (body.scope && !body.scope.split(/\s+/).includes("scim")) throw new Error("TSCloak returned a token without the scim scope.");
  return body.access_token;
}
export const POST = withRouteGuard({ roles: ["ADMIN"] }, async () => {
  try {
    if (process.env.TSCLOAK_SCIM_ENABLED !== "true") return NextResponse.json({ error: "SCIM sync is disabled. Set TSCLOAK_SCIM_ENABLED=true to enable it." }, { status: 503 });
    const issuer = requiredEnv("TSCLOAK_ISSUER").replace(/\/$/, ""); const token = await getScimToken(issuer);
    const response = await fetch(`${issuer}/scim/v2/Users`, { headers: { authorization: `Bearer ${token}`, accept: "application/scim+json, application/json" }, cache: "no-store", signal: AbortSignal.timeout(15000) });
    const list = await response.json().catch(() => ({})) as ScimList;
    if (!response.ok || !Array.isArray(list.Resources)) return NextResponse.json({ error: `TSCloak SCIM list failed (HTTP ${response.status}): ${list.detail ?? list.message ?? "expected Resources list"}` }, { status: 502 });
    const localUsers = db.select({ id: users.id, email: users.email, oidcSubject: users.oidcSubject }).from(users).all();
    const localByEmail = new Map(localUsers.map(user => [user.email.toLowerCase(), user]));
    const claimedSubjects = new Set(localUsers.map(user => user.oidcSubject));
    let matched = 0, relinked = 0, inactiveAtProvider = 0, unmatched = 0, skippedUnsafe = 0;
    for (const identity of list.Resources) {
      const email = identity.emails?.find(e => e.primary)?.value ?? identity.emails?.[0]?.value ?? (identity.userName?.includes("@") ? identity.userName : undefined);
      if (!email || !identity.id) { unmatched++; continue; }
      const local = localByEmail.get(email.toLowerCase());
      if (!local) { unmatched++; continue; }
      if (identity.active === false) inactiveAtProvider++;
      matched++;
      // Do not infer that SCIM id is the OIDC `sub` unless a local placeholder mapping explicitly awaits reconciliation.
      if (local.oidcSubject.startsWith("demo|") || local.oidcSubject.startsWith("scim-pending:")) {
        if (claimedSubjects.has(identity.id) && local.oidcSubject !== identity.id) { skippedUnsafe++; continue; }
        db.update(users).set({ oidcSubject: identity.id, updatedAt: new Date().toISOString() }).where(eq(users.id, local.id)).run();
        claimedSubjects.delete(local.oidcSubject); claimedSubjects.add(identity.id); relinked++;
      }
    }
    return NextResponse.json({ ok: true, message: `SCIM sync complete: ${matched} local accounts matched, ${relinked} placeholder identity links updated, ${unmatched} provider identities unmatched, ${skippedUnsafe} unsafe relinks skipped${inactiveAtProvider ? `, ${inactiveAtProvider} provider accounts inactive` : ""}. Local ViLek roles were preserved.`, matched, relinked, unmatched, skippedUnsafe, inactiveAtProvider });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "TSCloak sync failed." }, { status: 502 }); }
});
