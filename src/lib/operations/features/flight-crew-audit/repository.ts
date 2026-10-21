import type { FlightCrewAuditRowDto } from "./dto";

export interface FlightCrewAuditRepository {
  list(): {
    rows: unknown[];
    options: Record<string, { value: string | number; label: string }[]>;
    displayColumns?: string[];
  };
}
