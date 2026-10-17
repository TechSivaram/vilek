import "server-only";
import { airlinesRepository } from "./repository";
import type { AirlinesListQuery } from "./dto";
export const airlinesService = {
  list(query: AirlinesListQuery) {
    return airlinesRepository.list(query);
  },
  create(values: Record<string, unknown>) {
    return airlinesRepository.create(values);
  },
  update(id: string | number, values: Record<string, unknown>) {
    return airlinesRepository.update(id, values);
  },
  deactivate(id: string | number) {
    return airlinesRepository.deactivate(id);
  },
};
