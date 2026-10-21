/** Request/response contracts for flight crew assignment operations. */
export type FlightCrewListQueryDto = {
  flightId?: string;
  q?: string;
  page: number;
  pageSize: number;
};
export type FlightCrewCreateRequestDto = {
  flightId: string;
  crewMemberId: string;
  designationId: number;
};
export type FlightCrewRemovalRequestDto = { reason: string };
export type FlightCrewActorDto = { id: string; email: string };
export type FlightCrewListResponseDto = {
  rows: Record<string, unknown>[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
export type FlightCrewMutationResponseDto = { ok: true };
export type ApiErrorResponseDto = { error: string; details?: unknown };
