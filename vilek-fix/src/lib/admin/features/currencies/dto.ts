/** API contract for the currencies administration feature. */
export type CurrenciesListQuery = {
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  direction?: "asc" | "desc";
};
export type CurrenciesListRow = {
  id: number;
  code: string;
  name: string;
  minorUnits: number;
  isActive: boolean;
};
export type CurrenciesCreateInput = Omit<CurrenciesListRow, "id">;
export type CurrenciesUpdateInput = Partial<CurrenciesCreateInput>;
export type CurrenciesListResult = {
  rows: CurrenciesListRow[];
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
export type CurrenciesFormDto = {
  code: string;
  name: string;
  minorUnits: number;
  isActive: boolean;
};
