/** API contract for the airlines administration feature. */
export type AirlinesListQuery = {
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  direction?: "asc" | "desc";
};
export type AirlinesListRow = {
  id: number;
  iataCode: string;
  icaoCode: string;
  name: string;
  isActive: boolean;
};
export type AirlinesCreateInput = Omit<AirlinesListRow, "id">;
export type AirlinesUpdateInput = Partial<AirlinesCreateInput>;
export type AirlinesListResult = {
  rows: AirlinesListRow[];
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
export type AirlinesFormDto = {
  iataCode: string;
  icaoCode: string;
  name: string;
  isActive: boolean;
};
