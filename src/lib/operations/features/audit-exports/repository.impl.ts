import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditExportEvents, users } from "@/lib/db/schema";
import type { AuditExportsRepository } from "./repository";

export const AuditExportsResourceConfig = {
  label: "Audit export history",
  columns: [] as string[],
} as const;

export class AuditExportsRepositoryImpl implements AuditExportsRepository {
  list() {
    const rows = db
      .select({
        id: auditExportEvents.id,
        actor_user_id: auditExportEvents.actorUserId,
        format: auditExportEvents.format,
        row_count: auditExportEvents.rowCount,
        created_at: auditExportEvents.createdAt,
        actor_email: users.email,
      })
      .from(auditExportEvents)
      .leftJoin(users, eq(auditExportEvents.actorUserId, users.id))
      .orderBy(desc(auditExportEvents.createdAt), desc(auditExportEvents.id))
      .limit(500)
      .all();
    return {
      rows,
      options: {},
      displayColumns: ["id", "actor_email", "format", "row_count", "created_at"],
    };
  }
}
