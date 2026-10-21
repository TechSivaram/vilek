import "server-only";
import type { BatchRequestsRowDto, BatchRequestsCollectionResponseDto } from "./dto";
import { BatchRequestsResourceConfig, BatchRequestsRepositoryImpl } from "./repository.impl";

const repository = new BatchRequestsRepositoryImpl();

function mapRow(value: unknown): BatchRequestsRowDto {
  const r = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    id: String(r.id ?? ""),
    state: r.state == null ? null : String(r.state),
    requested_by_user_id:
      r.requested_by_user_id == null
        ? null
        : typeof r.requested_by_user_id === "number"
          ? r.requested_by_user_id
          : String(r.requested_by_user_id),
    created_at: r.created_at == null ? null : String(r.created_at),
    completed_at: r.completed_at == null ? null : String(r.completed_at),
    requested_by_email: r.requested_by_email == null ? null : String(r.requested_by_email),
  };
}

export const batchrequestsService = {
  list(): BatchRequestsCollectionResponseDto {
    const result = repository.list();
    return {
      resource: "batch-requests",
      label: BatchRequestsResourceConfig.label,
      writable: false,
      columns: BatchRequestsResourceConfig.columns,
      displayColumns: result.displayColumns ?? [],
      rows: result.rows.map(mapRow),
      options: result.options,
    };
  },
};
