import "server-only";
import { currenciesRepository } from "./repository";
import type {
  CurrenciesListQuery,
  CurrenciesCreateInput,
  CurrenciesUpdateInput,
} from "./dto";
export const currenciesService = {
  list(query: CurrenciesListQuery) {
    return currenciesRepository.list(query);
  },
  create(values: CurrenciesCreateInput) {
    return currenciesRepository.create(values);
  },
  update(id: string | number, values: CurrenciesUpdateInput) {
    return currenciesRepository.update(id, values);
  },
  deactivate(id: string | number) {
    return currenciesRepository.deactivate(id);
  },
};
