import "server-only";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { roles, userRoles } from "@/lib/db/schema";
import { getLocalAuthenticatedUser } from "@/lib/auth/tscloak";
import { hasAnyVilekRole, hasVilekPermission, type VilekPermission } from "@/lib/auth/permissions";

export type AuthenticatedContext = NonNullable<
  Awaited<ReturnType<typeof getLocalAuthenticatedUser>>
> & {
  roleCodes: string[];
};

/** Validates the TSCloak access token and resolves an active local ViLek user
 * plus that user's active local role assignments. */
export async function getAuthorizationContext(
  tokenOverride?: string,
): Promise<AuthenticatedContext | null> {
  const authenticated = await getLocalAuthenticatedUser(tokenOverride);
  if (!authenticated) return null;

  const assignments = db
    .select({ code: roles.code })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, authenticated.user.id), eq(roles.isActive, true)))
    .all();

  return {
    ...authenticated,
    roleCodes: assignments.map((assignment) => assignment.code),
  };
}

/** Page guard: redirects unauthenticated visitors to login. */
export async function requireAuthenticatedUser(): Promise<AuthenticatedContext> {
  const context = await getAuthorizationContext();
  if (!context) {
    redirect("/login");
    throw new Error("Redirect did not terminate unauthenticated request");
  }
  return context;
}

/** Page guard: a user needs at least one of the listed local ViLek roles. */
export async function requireRole(requiredRoles: string | readonly string[], redirectTo = "/") {
  const context = await requireAuthenticatedUser();
  const rolesToCheck = typeof requiredRoles === "string" ? [requiredRoles] : requiredRoles;
  if (!hasAnyVilekRole(context.roleCodes, rolesToCheck)) redirect(redirectTo);
  return context;
}

/** Page guard: a user needs the named local ViLek permission. */
export async function requirePermission(permission: VilekPermission, redirectTo = "/") {
  const context = await requireAuthenticatedUser();
  if (!hasVilekPermission(context.roleCodes, permission)) redirect(redirectTo);
  return context;
}
