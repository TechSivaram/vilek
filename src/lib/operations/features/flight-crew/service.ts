import "server-only";
import { flightCrewFeatureRepository } from "./repository.impl";
import type {
  CreateFlightCrewInput,
  ListFlightCrewQuery,
  RemoveFlightCrewInput,
} from "./schema";
import type { FlightCrewActorDto } from "./dto";

/** Application/service boundary for flight crew assignment workflows. */
export const flightCrewService = {
  list(query: ListFlightCrewQuery) {
    return flightCrewFeatureRepository.list(query);
  },
  options() {
    return flightCrewFeatureRepository.options();
  },
  create(input: CreateFlightCrewInput, actor: FlightCrewActorDto) {
    return flightCrewFeatureRepository.create(input, actor);
  },
  remove(id: string, input: RemoveFlightCrewInput, actor: FlightCrewActorDto) {
    return flightCrewFeatureRepository.remove(id, input, actor);
  },
};
