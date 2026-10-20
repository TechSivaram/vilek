/** API contracts for user-to-role assignment administration. */
export type UserRoleAssignmentDto = {
  id: number;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: number;
  roleCode: string;
  roleName: string;
  createdAt: string;
};

export type UserRoleUserOptionDto = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type UserRoleOptionDto = { id: number; code: string; name: string };

export type UserRolesListResponseDto = {
  rows: UserRoleAssignmentDto[];
  options: { users: UserRoleUserOptionDto[]; roles: UserRoleOptionDto[] };
};

export type UserRoleCreateDto = { userId: string; roleId: number };
export type UserRoleMutationResponseDto = { ok: boolean };

/** URL query contract used by paginated admin list endpoints. */
export type UserRolesListQuery = {
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  direction?: "asc" | "desc";
};
export type UserRolesListResult<T> = {
  rows: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
export type ListQueryParams = {
  q?: string;
  page: number;
  pageSize: number;
  sort?: string;
  direction: "asc" | "desc";
};
