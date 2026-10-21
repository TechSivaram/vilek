import "server-only";
import { crew_membersRepository } from "./repository";
import type {
  CrewMembersListQuery,
  CrewMembersCreateInput,
  CrewMembersUpdateInput,
} from "./dto";
export const crew_membersService = {
  list(query: CrewMembersListQuery) {
    return crew_membersRepository.list(query);
  },
  create(values: CrewMembersCreateInput) {
    return crew_membersRepository.create(values);
  },
  update(id: string | number, values: CrewMembersUpdateInput) {
    return crew_membersRepository.update(id, values);
  },
  deactivate(id: string | number) {
    return crew_membersRepository.deactivate(id);
  },
  options() {
    return crew_membersRepository.options();
  },
};
