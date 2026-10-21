import "server-only";
import { rolesRepository } from "./repository";
import type { RolesListQuery, RolesCreateInput, RolesUpdateInput } from "./dto";
export const rolesService = {
  list(query: RolesListQuery) {
    return rolesRepository.list(query);
  },
  create(values: RolesCreateInput) {
    return rolesRepository.create(values);
  },
  update(id: string | number, values: RolesUpdateInput) {
    return rolesRepository.update(id, values);
  },
  deactivate(id: string | number) {
    return rolesRepository.deactivate(id);
  },
};
