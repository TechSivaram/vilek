import "server-only";
import { usersRepository } from "./repository";
import type { UsersListQuery } from "./dto";
export const usersService = {
  list(query: UsersListQuery) {
    return usersRepository.list(query);
  },
  findByEmail(email: string) {
    return usersRepository.findByEmail(email);
  },
  findById(id: string) {
    return usersRepository.findById(id);
  },
  createProvisionedUser(values: {
    email: string;
    firstName: string;
    lastName: string;
    scimId: string;
  }) {
    return usersRepository.createProvisionedUser(values);
  },
  importFromScim(values: {
    email: string;
    firstName: string;
    lastName: string;
    scimId: string;
    isActive: boolean;
  }) {
    return usersRepository.importFromScim(values);
  },
  syncIdentities() {
    return usersRepository.syncIdentities();
  },
  relinkIdentity(userId: string, subject: string) {
    return usersRepository.relinkIdentity(userId, subject);
  },
  create(values: Record<string, unknown>) {
    return usersRepository.create(values);
  },
  update(id: string | number, values: Record<string, unknown>) {
    return usersRepository.update(id, values);
  },
  deactivate(id: string | number) {
    return usersRepository.deactivate(id);
  },
};
