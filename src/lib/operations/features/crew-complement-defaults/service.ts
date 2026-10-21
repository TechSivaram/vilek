import type {
  CrewComplementDefaultsCreateDto,
  CrewComplementDefaultsUpdateDto,
} from "./dto";
import { SqliteCrewComplementDefaultsRepository } from "./repository.impl";

const repository = new SqliteCrewComplementDefaultsRepository();
export const crewComplementDefaultsService = {
  list() {
    return repository.list();
  },
  create(input: CrewComplementDefaultsCreateDto) {
    return repository.create(input);
  },
  update(id: string, input: CrewComplementDefaultsUpdateDto) {
    return repository.update(id, input);
  },
};
