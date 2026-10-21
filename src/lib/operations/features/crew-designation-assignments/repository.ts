type MaintenanceOption = { value: string | number; label: string };
export interface ResourceRepository {
  listRows(): Record<string, unknown>[];
  getOptions(field: string): MaintenanceOption[];
  create(input: Record<string, unknown>): { id: string };
  update(id: string, input: Record<string, unknown>): boolean;
}
