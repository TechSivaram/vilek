import {
  SqliteMaintenanceResourceRepository,
  type MaintenanceResourceConfig,
} from "./maintenance-resource.repository";

const repository = new SqliteMaintenanceResourceRepository();
export const maintenanceResourceService = {
  list(name: string, resource: MaintenanceResourceConfig) {
    return repository.list(name, resource);
  },
  create(resource: MaintenanceResourceConfig, input: Record<string, unknown>) {
    return repository.create(resource, input);
  },
  update(
    resource: MaintenanceResourceConfig,
    id: string,
    input: Record<string, unknown>,
  ) {
    return repository.update(resource, id, input);
  },
};
