import "server-only";
import { flightsRepository } from "./repository";
import type {
  FlightsListQuery,
  FlightFormDto,
} from "./dto";
export const flightsService = {
  list(query: FlightsListQuery) {
    return flightsRepository.list(query);
  },
  create(values: FlightFormDto) {
    return flightsRepository.create(values);
  },
  update(id: string | number, values: FlightFormDto) {
    return flightsRepository.update(id, values);
  },
  deactivate(id: string | number) {
    return flightsRepository.deactivate(id);
  },
  options() {
    return flightsRepository.options();
  },
};
