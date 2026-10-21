import type { BatchRequestsRowDto } from "./dto";

export interface BatchRequestsRepository {
  list(): {
    rows: unknown[];
    options: Record<string, { value: string | number; label: string }[]>;
    displayColumns?: string[];
  };
}
