import "server-only";
import { airlinesRepository } from "./repository";
import type {
  AirlinesListQuery,
  AirlinesCreateInput,
  AirlinesUpdateInput,
} from "./dto";
export const airlinesService = {
  list(query: AirlinesListQuery) {
    return airlinesRepository.list(query);
  },
  create(values: AirlinesCreateInput) {
    return airlinesRepository.create(values);
  },
  update(id: string | number, values: AirlinesUpdateInput) {
    return airlinesRepository.update(id, values);
  },
  deactivate(id: string | number) {
    return airlinesRepository.deactivate(id);
  },
};
