import "server-only";
import { crew_designationsRepository } from "./repository";
import type {
  CrewDesignationsListQuery,
  CrewDesignationsCreateInput,
  CrewDesignationsUpdateInput,
} from "./dto";
export const crew_designationsService = {
  list(query: CrewDesignationsListQuery) {
    return crew_designationsRepository.list(query);
  },
  create(values: CrewDesignationsCreateInput) {
    return crew_designationsRepository.create(values);
  },
  update(id: string | number, values: CrewDesignationsUpdateInput) {
    return crew_designationsRepository.update(id, values);
  },
  deactivate(id: string | number) {
    return crew_designationsRepository.deactivate(id);
  },
};
