/** API contract for the crew designations administration feature. */
export type CrewDesignationsListQuery = {
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  direction?: "asc" | "desc";
};
export type CrewDesignationsListRow = {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
};
export type CrewDesignationsCreateInput = Omit<CrewDesignationsListRow, "id">;
export type CrewDesignationsUpdateInput = Partial<CrewDesignationsCreateInput>;
export type CrewDesignationsListResult = {
  rows: CrewDesignationsListRow[];
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
export type CrewDesignationsFormDto = {
  code: string;
  name: string;
  isActive: boolean;
};
