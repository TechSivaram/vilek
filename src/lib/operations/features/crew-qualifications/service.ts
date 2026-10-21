import "server-only";
import type {
  CrewQualificationsCreateDto,
  CrewQualificationsUpdateDto,
} from "./dto";
import { CrewQualificationsRepositoryImpl } from "./repository.impl";

export const CrewQualificationsService = {
  listRows() {
    return CrewQualificationsRepositoryImpl.listRows();
  },
  getOptions(field: string) {
    return CrewQualificationsRepositoryImpl.getOptions(field);
  },
  create(input: CrewQualificationsCreateDto) {
    return CrewQualificationsRepositoryImpl.create(input);
  },
  update(id: string, input: CrewQualificationsUpdateDto) {
    return CrewQualificationsRepositoryImpl.update(id, input);
  },
};
