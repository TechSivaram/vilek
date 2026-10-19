import "server-only";
import { operationsRepository } from "./repository";
export const operationsService = {
  list() {
    return operationsRepository.list();
  },
};
