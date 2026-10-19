/** API contract for the roles administration feature. */
export type RolesListQuery = {
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  direction?: "asc" | "desc";
};
export type RolesListRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
};
export type RolesCreateInput = Omit<RolesListRow, "id">;
export type RolesUpdateInput = Partial<RolesCreateInput>;
export type RolesListResult = {
  rows: RolesListRow[];
  options?: {
    airlines?: Array<{ id: number; name: string; iataCode?: string }>;
    airports?: Array<{ id: number; name: string; iataCode?: string }>;
    users?: Array<{
      id: number;
      name?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
    }>;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

/** URL query contract validated by the feature schema. */
export type ListQueryParams = {
  q?: string;
  page: number;
  pageSize: number;
  sort?: string;
  direction: "asc" | "desc";
};

/** Validated form submission contract; this DTO is the source of truth. */
export type RolesFormDto = {
  name: string;
  description: string;
  isActive: boolean;
};
