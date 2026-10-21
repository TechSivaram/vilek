import type { AuditRetentionActionsRowDto } from "./dto";

export interface AuditRetentionActionsRepository {
  list(): {
    rows: unknown[];
    options: Record<string, { value: string | number; label: string }[]>;
    displayColumns?: string[];
  };
}
