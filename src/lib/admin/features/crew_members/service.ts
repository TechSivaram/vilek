import "server-only";
import { crew_membersRepository } from "./repository";
import type { CrewMembersListQuery } from "./dto";
export const crew_membersService = {
  list(query: CrewMembersListQuery) {
    return crew_membersRepository.list(query);
  },
  create(values: Record<string, unknown>) {
    return crew_membersRepository.create(values);
  },
  update(id: string | number, values: Record<string, unknown>) {
    return crew_membersRepository.update(id, values);
  },
  deactivate(id: string | number) {
    return crew_membersRepository.deactivate(id);
  },
  options() {
    return crew_membersRepository.options();
  },
};
