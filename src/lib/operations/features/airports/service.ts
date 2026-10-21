import "server-only";
import { airportsRepository } from "./repository";
import type {
  AirportsListQuery,
  AirportsCreateInput,
  AirportsUpdateInput,
} from "./dto";
export const airportsService = {
  list(query: AirportsListQuery) {
    return airportsRepository.list(query);
  },
  create(values: AirportsCreateInput) {
    return airportsRepository.create(values);
  },
  update(id: string | number, values: AirportsUpdateInput) {
    return airportsRepository.update(id, values);
  },
  deactivate(id: string | number) {
    return airportsRepository.deactivate(id);
  },
};
