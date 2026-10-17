/** API contract for the expense categories administration feature. */
export type ExpenseCategoriesListQuery = {
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  direction?: "asc" | "desc";
};
export type ExpenseCategoriesListRow = {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
};
export type ExpenseCategoriesCreateInput = Omit<ExpenseCategoriesListRow, "id">;
export type ExpenseCategoriesUpdateInput =
  Partial<ExpenseCategoriesCreateInput>;
export type ExpenseCategoriesListResult = {
  rows: ExpenseCategoriesListRow[];
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
export type ExpenseCategoriesFormDto = {
  code: string;
  name: string;
  isActive: boolean;
};
