import type { MaintenanceOption } from "@/lib/operations/maintenance-repository";
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
