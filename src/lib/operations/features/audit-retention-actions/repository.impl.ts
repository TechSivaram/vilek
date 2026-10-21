import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditRetentionActions, users } from "@/lib/db/schema";
import type { AuditRetentionActionsRepository } from "./repository";

export const AuditRetentionActionsResourceConfig = {
  label: "Audit retention actions",
  columns: [] as string[],
} as const;

export class AuditRetentionActionsRepositoryImpl implements AuditRetentionActionsRepository {
  list() {
    const rows = db
      .select({
        id: auditRetentionActions.id,
        action: auditRetentionActions.action,
        cutoff_at: auditRetentionActions.cutoffAt,
        affected_count: auditRetentionActions.affectedCount,
        actor_user_id: auditRetentionActions.actorUserId,
        created_at: auditRetentionActions.createdAt,
        actor_email: users.email,
      })
      .from(auditRetentionActions)
      .leftJoin(users, eq(auditRetentionActions.actorUserId, users.id))
      .orderBy(desc(auditRetentionActions.createdAt), desc(auditRetentionActions.id))
      .limit(500)
      .all();
    return {
      rows,
      options: {},
      displayColumns: ["id", "action", "cutoff_at", "affected_count", "actor_email", "created_at"],
    };
  }
}
