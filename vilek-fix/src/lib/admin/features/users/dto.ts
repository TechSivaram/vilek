/** API contract for the users administration feature. */
export type UsersListQuery = {
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  direction?: "asc" | "desc";
};
export type UsersListRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  oidcSubject: string | null;
  isActive: boolean;
};
export type UsersCreateInput = Omit<
  UsersListRow,
  "id" | "oidcSubject" | "isActive"
>;
export type UsersUpdateInput = Partial<UsersCreateInput>;
export type UsersListResult = {
  rows: UsersListRow[];
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

/** User creation form submission contract. */
export type UsersFormDto = {
  email: string;
  firstName: string;
  lastName: string;
};
/** User status edit form submission contract. */
export type UsersStatusFormDto = { isActive: boolean };
