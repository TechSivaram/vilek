/** Read-only collection response contract for Flight crew assignment audit. */
export type FlightCrewAuditRowDto = {
  id: number | string;
  flight_id: number | string | null;
  crew_member_id: number | string | null;
  designation_id: number | string | null;
  action: string | null;
  reason: string | null;
  actor_email_snapshot: string | null;
  created_at: string | null;
  flight_number: string;
  crew_name: string;
  designation_name: string;
};
export type FlightCrewAuditCollectionResponseDto = {
  resource: "flight-crew-audit";
  label: string;
  writable: false;
  columns: readonly string[];
  displayColumns: string[];
  rows: FlightCrewAuditRowDto[];
  options: Record<string, { value: string | number; label: string }[]>;
};
