import type {
  CreateFlightCrewInput,
  ListFlightCrewQuery,
  RemoveFlightCrewInput,
} from "./schema";
import type { FlightCrewActorDto } from "./dto";

export interface FlightCrewFeatureRepository {
  list(query: ListFlightCrewQuery): unknown;
  options(): unknown;
  create(input: CreateFlightCrewInput, actor: FlightCrewActorDto): unknown;
  remove(
    id: string,
    input: RemoveFlightCrewInput,
    actor: FlightCrewActorDto,
  ): { changes: number };
}
