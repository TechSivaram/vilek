import "server-only";
import { flightsRepository } from "./repository";
import type {
  FlightsListQuery,
  FlightCreateInput,
  FlightUpdateInput,
} from "./dto";
export const flightsService = {
  list(query: FlightsListQuery) {
    return flightsRepository.list(query);
  },
  create(values: FlightCreateInput) {
    return flightsRepository.create(values);
  },
  update(id: string | number, values: FlightUpdateInput) {
    return flightsRepository.update(id, values);
  },
  deactivate(id: string | number) {
    return flightsRepository.deactivate(id);
  },
  options() {
    return flightsRepository.options();
  },
};
