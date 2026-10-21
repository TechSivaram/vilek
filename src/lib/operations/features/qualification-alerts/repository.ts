import type { MaintenanceOption } from "@/lib/operations/maintenance-repository";
import type {
  QualificationAlertsCreateDto,
  QualificationAlertsUpdateDto,
} from "./dto";

export interface QualificationAlertsRepository {
  listRows(): Record<string, unknown>[];
  getOptions(field: string): MaintenanceOption[];
  create(input: QualificationAlertsCreateDto): string;
  update(id: string, input: QualificationAlertsUpdateDto): boolean;
}
