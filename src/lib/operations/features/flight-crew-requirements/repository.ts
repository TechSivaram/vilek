import type {
  FlightCrewRequirementsCreateDto,
  FlightCrewRequirementsListResponseDto,
  FlightCrewListResponseDto,
} from "./dto";

export interface FlightCrewRequirementsRepository {
  list(flightId: string | null): FlightCrewRequirementsListResponseDto;
  listFlights(search: string): FlightCrewListResponseDto;
  create(input: FlightCrewRequirementsCreateDto): string;
  update(id: string, input: Partial<FlightCrewRequirementsCreateDto>): boolean;
}
