import "server-only";
import { userRolesRepository } from "./repository";
export const userRolesService = {
  list() {
    return userRolesRepository.list();
  },
  create(userId: string, roleId: number) {
    return userRolesRepository.create(userId, roleId);
  },
  remove(id: number) {
    return userRolesRepository.remove(id);
  },
};
