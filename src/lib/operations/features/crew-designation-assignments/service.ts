import "server-only";
import { repository } from "./repository.impl";
export const service = {
  listRows() {
    return repository.listRows();
  },
  getOptions(field: string) {
    return repository.getOptions(field);
  },
  create(input: Record<string, unknown>) {
    return repository.create(input);
  },
  update(id: string, input: Record<string, unknown>) {
    return repository.update(id, input);
  },
};
