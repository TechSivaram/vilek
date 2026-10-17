import "server-only";
import { rolesRepository } from "./repository";
import type { RolesListQuery } from "./dto";
export const rolesService = {
  list(query: RolesListQuery) {
    return rolesRepository.list(query);
  },
  create(values: Record<string, unknown>) {
    return rolesRepository.create(values);
  },
  update(id: string | number, values: Record<string, unknown>) {
    return rolesRepository.update(id, values);
  },
  deactivate(id: string | number) {
    return rolesRepository.deactivate(id);
  },
};
