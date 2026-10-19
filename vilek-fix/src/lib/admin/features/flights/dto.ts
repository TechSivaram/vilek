export type FlightsListQuery = {
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  direction?: "asc" | "desc";
};

export type FlightListRow = {
  id: string;
  airlineId: number;
  airlineCode: string | null;
  airlineIcaoCode: string | null;
  airlineName: string | null;
  flightNumber: string;
  originAirportId: number;
  originAirportCode: string | null;
  originAirportName: string | null;
  originAirportCity: string | null;
  destinationAirportId: number;
  destinationAirportCode: string | null;
  destinationAirportName: string | null;
  destinationAirportCity: string | null;
  scheduledDeparture: string;
  scheduledArrival: string;
  actualDeparture: string | null;
  actualArrival: string | null;
  isActive: boolean;
};

export type FlightsListResult = {
  rows: FlightListRow[];
  total: number;
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
export type FlightFormDto = {
  airlineId: number;
  flightNumber: string;
  originAirportId: number;
  destinationAirportId: number;
  scheduledDeparture: string;
  scheduledArrival: string;
  actualDeparture?: string | null;
  actualArrival?: string | null;
  isActive: boolean;
};

/** Shared dropdown item DTO used by the flight editor. */
export type FlightOptionDto = {
  id: number;
  name: string;
  iataCode: string | null;
  icaoCode?: string | null;
  city?: string | null;
};

export type FlightsListResponseDto = {
  rows: FlightListRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type FlightOptionsResponseDto = {
  options: { airlines: FlightOptionDto[]; airports: FlightOptionDto[] };
};

export type FlightMutationResponseDto = { ok: boolean };
