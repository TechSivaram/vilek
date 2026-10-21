import "server-only";
import { flightCrewRepository } from "@/lib/operations/flight-crew";
import type { FlightCrewFeatureRepository } from "./repository";
import type {
  CreateFlightCrewInput,
  ListFlightCrewQuery,
  RemoveFlightCrewInput,
} from "./schema";
import type { FlightCrewActorDto } from "./dto";

/** Adapter to the established Drizzle-backed flight crew repository. */
export const flightCrewFeatureRepository: FlightCrewFeatureRepository = {
  list(query: ListFlightCrewQuery) {
    if (query.flightId)
      return { rows: flightCrewRepository.manifest(query.flightId) };
    const result = flightCrewRepository.listFlights({
      search: query.q,
      page: query.page,
      pageSize: query.pageSize,
    });
    return {
      rows: result.rows,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / query.pageSize)),
      },
    };
  },
  options() {
    return flightCrewRepository.options();
  },
  create(input: CreateFlightCrewInput, actor: FlightCrewActorDto) {
    return flightCrewRepository.create(input, actor);
  },
  remove(id: string, input: RemoveFlightCrewInput, actor: FlightCrewActorDto) {
    return flightCrewRepository.remove(id, input.reason, actor);
  },
};
