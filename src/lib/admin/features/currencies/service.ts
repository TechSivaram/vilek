import "server-only";
import { currenciesRepository } from "./repository";
import type { CurrenciesListQuery } from "./dto";
export const currenciesService = {
  list(query: CurrenciesListQuery) {
    return currenciesRepository.list(query);
  },
  create(values: Record<string, unknown>) {
    return currenciesRepository.create(values);
  },
  update(id: string | number, values: Record<string, unknown>) {
    return currenciesRepository.update(id, values);
  },
  deactivate(id: string | number) {
    return currenciesRepository.deactivate(id);
  },
};
