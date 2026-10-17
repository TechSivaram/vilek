/** API contract for the crew members administration feature. */
export type CrewMembersListQuery = {
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  direction?: "asc" | "desc";
};
export type CrewMembersListRow = {
  id: number;
  userId: number;
  badgeNumber: string;
  isActive: boolean;
  userName?: string;
  email?: string;
};
export type CrewMembersCreateInput = Omit<CrewMembersListRow, "id">;
export type CrewMembersUpdateInput = Partial<CrewMembersCreateInput>;
export type CrewMembersListResult = {
  rows: CrewMembersListRow[];
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
export type CrewMembersFormDto = {
  userId: number;
  badgeNumber: string;
  isActive: boolean;
};
