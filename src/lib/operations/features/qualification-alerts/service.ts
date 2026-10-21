import "server-only";
import type {
  QualificationAlertsCreateDto,
  QualificationAlertsUpdateDto,
} from "./dto";
import { QualificationAlertsRepositoryImpl } from "./repository.impl";

export const QualificationAlertsService = {
  listRows() {
    return QualificationAlertsRepositoryImpl.listRows();
  },
  getOptions(field: string) {
    return QualificationAlertsRepositoryImpl.getOptions(field);
  },
  create(input: QualificationAlertsCreateDto) {
    return QualificationAlertsRepositoryImpl.create(input);
  },
  update(id: string, input: QualificationAlertsUpdateDto) {
    return QualificationAlertsRepositoryImpl.update(id, input);
  },
};
