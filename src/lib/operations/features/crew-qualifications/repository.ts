type MaintenanceOption = { value: string | number; label: string };
import type {
  CrewQualificationsCreateDto,
  CrewQualificationsUpdateDto,
} from "./dto";

export interface CrewQualificationsRepository {
  listRows(): Record<string, unknown>[];
  getOptions(field: string): MaintenanceOption[];
  create(input: CrewQualificationsCreateDto): string;
  update(id: string, input: CrewQualificationsUpdateDto): boolean;
}
