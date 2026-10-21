/** Typed request/response contracts for flight-specific crew requirements. */
export type FlightCrewRequirementsCreateDto = {
  flight_id: number;
  designation_id: number;
  required_count: number;
  reason?: string | null;
};
export type FlightCrewRequirementsUpdateDto = Partial<FlightCrewRequirementsCreateDto>;
export type FlightCrewRequirementsResponseDto = {
  id: number | string;
  flight_id: number | string;
  designation_id: number | string;
  required_count: number;
  reason: string | null;
  created_at?: string | null;
  flight_number?: string | null;
  scheduled_departure?: string | null;
  scheduled_arrival?: string | null;
  airline_name?: string | null;
  flight_route?: string | null;
  designation_name?: string | null;
};
export type FlightCrewRequirementsOptionDto = {
  value: string | number;
  label: string;
};
export type FlightCrewRequirementsListResponseDto = {
  rows: FlightCrewRequirementsResponseDto[];
  options: Record<string, FlightCrewRequirementsOptionDto[]>;
};
export type FlightCrewListRowDto = {
  flight_id: number | string;
  flight_number: string;
  scheduled_departure: string | null;
  scheduled_arrival: string | null;
  airline_name: string | null;
  flight_route: string;
  requirement_count: number;
};
export type FlightCrewListResponseDto = {
  rows: FlightCrewListRowDto[];
  options: Record<string, FlightCrewRequirementsOptionDto[]>;
};
