import "server-only";
import { expense_categoriesRepository } from "./repository";
import type { ExpenseCategoriesListQuery } from "./dto";
export const expense_categoriesService = {
  list(query: ExpenseCategoriesListQuery) {
    return expense_categoriesRepository.list(query);
  },
  create(values: Record<string, unknown>) {
    return expense_categoriesRepository.create(values);
  },
  update(id: string | number, values: Record<string, unknown>) {
    return expense_categoriesRepository.update(id, values);
  },
  deactivate(id: string | number) {
    return expense_categoriesRepository.deactivate(id);
  },
};
