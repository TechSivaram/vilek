import "server-only";
import { audit_logRepository } from "./repository";
export const audit_logService = {
  list() {
    return audit_logRepository.list();
  },
};
