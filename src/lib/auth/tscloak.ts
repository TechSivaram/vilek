import "server-only";

import {
  createPublicKey,
  randomBytes,
  timingSafeEqual,
  verify as verifySignature,
} from "node:crypto";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const ACCESS_TOKEN_COOKIE = "vilek_access_token";
const OIDC_TX_COOKIE = "vilek_oidc_transaction";
const issuer = (process.env.TSCLOAK_ISSUER ?? "https://tscloak.onrender.com").replace(/\/$/, "");
const clientId = process.env.TSCLOAK_CLIENT_ID ?? "";
const clientSecret = process.env.TSCLOAK_CLIENT_SECRET ?? "";
const audience = process.env.TSCLOAK_ACCESS_TOKEN_AUDIENCE ?? clientId;
const redirectUri =
  process.env.TSCLOAK_REDIRECT_URI ?? "http://localhost:3001/api/auth/callback/tscloak";
const postLogoutRedirectUri =
  process.env.TSCLOAK_POST_LOGOUT_REDIRECT_URI ?? "http://localhost:3001/login";
const secureCookies = process.env.NODE_ENV === "production";
const cookieBase = {
  httpOnly: true,
  secure: secureCookies,
  sameSite: "lax" as const,
  path: "/",
};

type JwtClaims = Record<string, unknown> & {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  sub?: string;
  nonce?: string;
};
type Discovery = {
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  issuer: string;
  end_session_endpoint?: string;
};
type Jwk = JsonWebKey & { kid?: string; alg?: string; use?: string };
let discoveryCache: { expires: number; value: Discovery } | undefined;
let jwksCache: { expires: number; value: Jwk[] } | undefined;

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}
function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}
function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
function decodePart<T>(part: string): T {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
}
function parseJwt(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed JWT");
  return {
    header: decodePart<{ alg?: string; kid?: string }>(parts[0]),
    claims: decodePart<JwtClaims>(parts[1]),
    signingInput: `${parts[0]}.${parts[1]}`,
    signature: Buffer.from(parts[2], "base64url"),
  };
}
async function getDiscovery(): Promise<Discovery> {
  if (discoveryCache && discoveryCache.expires > Date.now()) return discoveryCache.value;
  const response = await fetch(`${issuer}/.well-known/openid-configuration`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`TSCloak discovery failed (${response.status})`);
  const value = (await response.json()) as Discovery;
  if (
    value.issuer !== issuer ||
    !value.authorization_endpoint ||
    !value.token_endpoint ||
    !value.jwks_uri
  )
    throw new Error("TSCloak discovery document is invalid");
  discoveryCache = { expires: Date.now() + 5 * 60_000, value };
  return value;
}
async function getJwks(uri: string): Promise<Jwk[]> {
  if (jwksCache && jwksCache.expires > Date.now()) return jwksCache.value;
  const response = await fetch(uri, { cache: "no-store" });
  if (!response.ok) throw new Error(`TSCloak JWKS request failed (${response.status})`);
  const body = (await response.json()) as { keys?: Jwk[] };
  if (!Array.isArray(body.keys)) throw new Error("TSCloak JWKS is invalid");
  jwksCache = { expires: Date.now() + 5 * 60_000, value: body.keys };
  return body.keys;
}
async function verifyJwt(
  token: string,
  jwksUri: string,
  expectedAudience: string,
  expectedNonce?: string,
) {
  const parsed = parseJwt(token);
  if (parsed.header.alg !== "RS256" || !parsed.header.kid)
    throw new Error("Unsupported token signing algorithm");
  let keys = await getJwks(jwksUri);
  let jwk = keys.find(
    (key) =>
      key.kid === parsed.header.kid &&
      (!key.alg || key.alg === "RS256") &&
      (!key.use || key.use === "sig"),
  );
  if (!jwk) {
    jwksCache = undefined;
    keys = await getJwks(jwksUri);
    jwk = keys.find(
      (key) =>
        key.kid === parsed.header.kid &&
        (!key.alg || key.alg === "RS256") &&
        (!key.use || key.use === "sig"),
    );
  }
  if (!jwk) throw new Error("No matching signing key found");
  const publicKey = createPublicKey({
    key: jwk as unknown as import("node:crypto").JsonWebKey,
    format: "jwk",
  });
  if (!verifySignature("RSA-SHA256", Buffer.from(parsed.signingInput), publicKey, parsed.signature))
    throw new Error("Invalid token signature");
  const c = parsed.claims;
  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(c.aud) ? c.aud : [c.aud];
  if (c.iss !== issuer) throw new Error("Invalid token issuer");
  if (!audiences.includes(expectedAudience)) throw new Error("Invalid token audience");
  if (typeof c.exp !== "number" || c.exp <= now) throw new Error("Token expired or missing exp");
  if (typeof c.nbf === "number" && c.nbf > now + 30) throw new Error("Token is not yet valid");
  if (expectedNonce && (typeof c.nonce !== "string" || !safeEqual(c.nonce, expectedNonce)))
    throw new Error("Invalid OIDC nonce");
  return c;
}
export async function createLoginRedirect() {
  if (!clientId) throw new Error("TSCLOAK_CLIENT_ID is not configured");
  const discovery = await getDiscovery();
  const state = randomToken();
  const nonce = randomToken();
  const verifier = randomToken(48);
  const challenge = base64url(
    Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))),
  );
  const jar = await cookies();
  jar.set(
    OIDC_TX_COOKIE,
    base64url(JSON.stringify({ state, nonce, verifier, createdAt: Date.now() })),
    {
      ...cookieBase,
      maxAge: 10 * 60,
      sameSite: "lax",
    },
  );
  const url = new URL(discovery.authorization_endpoint);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: process.env.TSCLOAK_SCOPES ?? "openid profile email",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}
export async function completeLogin(code: string, state: string) {
  if (!clientId || !clientSecret)
    throw new Error("TSCloak OIDC client credentials are not configured");
  const jar = await cookies();
  const txValue = jar.get(OIDC_TX_COOKIE)?.value;
  jar.delete(OIDC_TX_COOKIE);
  if (!txValue) throw new Error("Missing OIDC login transaction");
  let tx: { state: string; nonce: string; verifier: string; createdAt: number };
  try {
    tx = decodePart(txValue);
  } catch {
    throw new Error("Invalid OIDC login transaction");
  }
  if (Date.now() - tx.createdAt > 10 * 60_000 || !safeEqual(tx.state, state))
    throw new Error("OIDC state validation failed");
  const discovery = await getDiscovery();
  const authMethod = process.env.TSCLOAK_TOKEN_AUTH_METHOD ?? "client_secret_post";
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: tx.verifier,
  });
  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
    accept: "application/json",
  };
  if (authMethod === "client_secret_basic") {
    const formEncode = (value: string) =>
      new URLSearchParams({ value }).toString().slice("value=".length);
    headers.authorization = `Basic ${Buffer.from(`${formEncode(clientId)}:${formEncode(clientSecret)}`).toString("base64")}`;
  } else if (authMethod === "client_secret_post") {
    body.set("client_id", clientId);
    body.set("client_secret", clientSecret);
  } else {
    throw new Error("TSCLOAK_TOKEN_AUTH_METHOD must be client_secret_post or client_secret_basic");
  }
  const tokenResponse = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers,
    body,
    cache: "no-store",
  });
  const tokens = (await tokenResponse.json()) as {
    access_token?: string;
    id_token?: string;
    token_type?: string;
    expires_in?: number;
    error?: string;
  };
  if (
    !tokenResponse.ok ||
    !tokens.access_token ||
    !tokens.id_token ||
    tokens.token_type?.toLowerCase() !== "bearer"
  ) {
    throw new Error(
      `TSCloak token exchange failed (${tokenResponse.status}${tokens.error ? `: ${tokens.error}` : ""})`,
    );
  }
  await verifyJwt(tokens.id_token, discovery.jwks_uri, clientId, tx.nonce);
  // The access token must be a signed JWT with an audience explicitly intended for ViLek.
  const accessClaims = await verifyJwt(tokens.access_token, discovery.jwks_uri, audience);
  if (typeof accessClaims.sub !== "string" || !accessClaims.sub)
    throw new Error("Access token has no subject");
  // Keep below the common per-cookie size ceiling; never split or truncate tokens.
  if (Buffer.byteLength(tokens.access_token, "utf8") > 3500) {
    throw new Error(
      "TSCloak access token is too large for a reliable browser cookie (maximum 3500 bytes)",
    );
  }
  // Store only the access token. ID and refresh tokens are deliberately discarded.
  const expiresIn =
    typeof tokens.expires_in === "number"
      ? Math.max(1, Math.min(tokens.expires_in, 60 * 60 * 24))
      : Math.max(1, Number(accessClaims.exp) - Math.floor(Date.now() / 1000));
  jar.set(ACCESS_TOKEN_COOKIE, tokens.access_token, {
    ...cookieBase,
    maxAge: expiresIn,
    expires: new Date(Number(accessClaims.exp) * 1000),
  });
}
export async function getValidatedAccessToken(tokenOverride?: string) {
  const token = tokenOverride ?? (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;
  try {
    const discovery = await getDiscovery();
    const claims = await verifyJwt(token, discovery.jwks_uri, audience);
    if (!claims.sub || typeof claims.sub !== "string") return null;
    return { token, claims };
  } catch {
    return null;
  }
}
export async function getLocalAuthenticatedUser(tokenOverride?: string) {
  const validated = await getValidatedAccessToken(tokenOverride);
  if (!validated) return null;
  const [user] = db
    .select()
    .from(users)
    .where(and(eq(users.oidcSubject, validated.claims.sub as string), eq(users.isActive, true)))
    .limit(1)
    .all();
  if (!user) return null;
  return { user, claims: validated.claims };
}
/** Build the TSCloak RP-initiated logout URL. TSCloak's session-end endpoint
 * terminates the IdP browser session; post_logout_redirect_uri must be registered
 * on the ViLek client in TSCloak.
 */
export function createLogoutRedirectUrl() {
  const url = new URL(`${issuer}/session/end`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);
  return url.toString();
}

export async function clearAuthCookies() {
  const jar = await cookies();
  jar.delete(ACCESS_TOKEN_COOKIE);
  jar.delete(OIDC_TX_COOKIE);
}

// Kept as a backwards-compatible helper for callers that only need to clear the token.
export async function clearAccessTokenCookie() {
  (await cookies()).delete(ACCESS_TOKEN_COOKIE);
}
export function getIssuer() {
  return issuer;
}
export function getRedirectUri() {
  return redirectUri;
}
