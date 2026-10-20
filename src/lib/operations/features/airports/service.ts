import "server-only";
import { airportsRepository } from "./repository";
import type { AirportsListQuery } from "./dto";
export const airportsService = {
  list(query: AirportsListQuery) {
    return airportsRepository.list(query);
  },
  create(values: Record<string, unknown>) {
    return airportsRepository.create(values);
  },
  update(id: string | number, values: Record<string, unknown>) {
    return airportsRepository.update(id, values);
  },
  deactivate(id: string | number) {
    return airportsRepository.deactivate(id);
  },
};
