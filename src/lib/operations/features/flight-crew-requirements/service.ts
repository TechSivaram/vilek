import type { FlightCrewRequirementsCreateDto } from "./dto";
import { flightCrewRequirementsRepository } from "./repository.impl";

/** Use-case boundary for flight-specific crew requirement operations. */
export const flightCrewRequirementsService = {
  list(flightId: string | null) {
    return flightCrewRequirementsRepository.list(flightId);
  },
  listFlights(search: string) {
    return flightCrewRequirementsRepository.listFlights(search);
  },
  create(input: FlightCrewRequirementsCreateDto) {
    return flightCrewRequirementsRepository.create(input);
  },
  update(id: string, input: Partial<FlightCrewRequirementsCreateDto>) {
    return flightCrewRequirementsRepository.update(id, input);
  },
};
