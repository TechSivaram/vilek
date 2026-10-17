/** API contract for the airports administration feature. */
export type AirportsListQuery = {
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  direction?: "asc" | "desc";
};
export type AirportsListRow = {
  id: number;
  iataCode: string;
  icaoCode: string;
  name: string;
  city: string;
  country: string;
  timeZone: string;
  isActive: boolean;
};
export type AirportsCreateInput = Omit<AirportsListRow, "id">;
export type AirportsUpdateInput = Partial<AirportsCreateInput>;
export type AirportsListResult = {
  rows: AirportsListRow[];
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
export type AirportsFormDto = {
  iataCode: string;
  icaoCode: string;
  name: string;
  city: string;
  country: string;
  timeZone: string;
  isActive: boolean;
};
