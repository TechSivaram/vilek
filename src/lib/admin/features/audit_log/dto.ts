export type AuditLogListQuery = {
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  direction?: "asc" | "desc";
};
export type AuditLogListResult<T> = {
  rows: T[];
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
