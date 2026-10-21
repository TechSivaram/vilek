import "server-only";

import { NextResponse } from "next/server";
import { getAuthorizationContext } from "@/lib/auth/guards";
import { hasAnyVilekRole, hasVilekPermission, type VilekPermission } from "@/lib/auth/permissions";

type GuardOptions = {
  /** Any one listed local role grants access. */
  roles?: readonly string[];
  /** Every listed permission must be granted by the user's local roles. */
  permissions?: readonly VilekPermission[];
};

type RouteContext = { params?: Promise<Record<string, string | string[]>> };
type GuardedHandler<C extends RouteContext> = (
  request: Request,
  context: C,
  auth: NonNullable<Awaited<ReturnType<typeof getAuthorizationContext>>>,
) => Response | Promise<Response>;

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Wrap a Next.js App Router handler with authentication and local RBAC.
 * Missing/invalid identity -> 401; authenticated but disallowed -> 403.
 * For cookie-authenticated mutations, require a matching Origin header.
 * Explicit Bearer-token clients are not subject to browser Origin checks. */
export function withRouteGuard<C extends RouteContext = RouteContext>(
  options: GuardOptions,
  handler: GuardedHandler<C>,
): (request: Request, context: C) => Promise<Response> {
  return async (request: Request, context: C) => {
    const authorization = request.headers.get("authorization");
    const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    const auth = await getAuthorizationContext(bearer);

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!bearer && MUTATING_METHODS.has(request.method.toUpperCase())) {
      const origin = request.headers.get("origin");

      if (!origin) {
        return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
      }

      const expectedOrigin = process.env.VILEK_BASE_URL
        ? new URL(process.env.VILEK_BASE_URL).origin
        : new URL(request.url).origin;

      if (origin !== expectedOrigin) {
        return NextResponse.json({ error: "Invalid expected origin" }, { status: 403 });
      }
    }

    if (options.roles?.length && !hasAnyVilekRole(auth.roleCodes, options.roles)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (
      options.permissions?.some((permission) => !hasVilekPermission(auth.roleCodes, permission))
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return handler(request, context, auth);
  };
}
