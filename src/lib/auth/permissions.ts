import "server-only";

/** Local ViLek authorization vocabulary. These are application permissions,
 * not roles or scopes issued by TSCloak. Keep this mapping conservative. */
export const VILEK_PERMISSIONS = [
  "ADMIN_DASHBOARD_VIEW",
  "USER_READ",
  "USER_MANAGE",
  "ROLE_READ",
  "ROLE_MANAGE",
  "USER_ROLE_ASSIGN",
  "IDENTITY_PROVIDER_VIEW",
  "IDENTITY_PROVIDER_MANAGE",
  "CREW_READ",
  "CREW_MANAGE",
  "CREW_DESIGNATION_MANAGE",
  "AIRLINE_MANAGE",
  "AIRPORT_MANAGE",
  "FLIGHT_READ",
  "FLIGHT_MANAGE",
  "EXPENSE_CATEGORY_MANAGE",
  "CURRENCY_MANAGE",
  "SYSTEM_SETTINGS_MANAGE",
  "FILE_TYPE_MANAGE",
  "AUDIT_READ",
  "OPERATIONS_READ",
  "CLAIM_READ",
  "CLAIM_CREATE",
  "CLAIM_REVIEW",
  "FINANCE_PROCESS",
] as const;

export type VilekPermission = (typeof VILEK_PERMISSIONS)[number];
export type VilekRoleCode = "ADMIN" | "CREW" | "APPROVER" | "FINANCE" | "FLIGHT_OPERATIONS_MANAGER";

const ADMIN_PERMISSIONS: readonly VilekPermission[] = VILEK_PERMISSIONS;

const ROLE_PERMISSIONS: Record<VilekRoleCode, readonly VilekPermission[]> = {
  ADMIN: ADMIN_PERMISSIONS,
  CREW: ["CLAIM_READ", "CLAIM_CREATE"],
  APPROVER: ["CLAIM_READ", "CLAIM_REVIEW"],
  FINANCE: ["CLAIM_READ", "FINANCE_PROCESS"],
  FLIGHT_OPERATIONS_MANAGER: [
    "CREW_READ",
    "CREW_MANAGE",
    "CREW_DESIGNATION_MANAGE",
    "AIRLINE_MANAGE",
    "AIRPORT_MANAGE",
    "FLIGHT_READ",
    "FLIGHT_MANAGE",
  ],
};

export function hasVilekPermission(
  roleCodes: readonly string[],
  permission: VilekPermission,
): boolean {
  return roleCodes.some((code) => ROLE_PERMISSIONS[code as VilekRoleCode]?.includes(permission));
}

export function hasAnyVilekRole(
  actualRoles: readonly string[],
  requiredRoles: readonly string[],
): boolean {
  return requiredRoles.length === 0 || requiredRoles.some((role) => actualRoles.includes(role));
}
