import "server-only";
import { fileTypesRepository } from "./repository";
export const fileTypesService = {
  setting() {
    return fileTypesRepository.setting();
  },
  list(id: number) {
    return fileTypesRepository.list(id);
  },
  create(id: number, type: string) {
    return fileTypesRepository.create(id, type);
  },
  remove(id: number) {
    return fileTypesRepository.remove(id);
  },
};
