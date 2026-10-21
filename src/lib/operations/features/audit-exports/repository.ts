import type { AuditExportsRowDto } from "./dto";

export interface AuditExportsRepository {
  list(): {
    rows: unknown[];
    options: Record<string, { value: string | number; label: string }[]>;
    displayColumns?: string[];
  };
}
