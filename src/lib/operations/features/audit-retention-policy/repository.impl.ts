import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditRetentionPolicy } from "@/lib/db/schema";
import type { AuditRetentionPolicyCreateDto, AuditRetentionPolicyUpdateDto } from "./dto";
import type { AuditRetentionPolicyRepository } from "./repository";

export const AuditRetentionPolicyResourceConfig = {
  label: "Audit retention policy",
  writable: true,
  required: ["id"],
  columns: ["id", "retention_days"],
} as const;

export class AuditRetentionPolicyRepositoryImpl implements AuditRetentionPolicyRepository {
  listWithMetadata() {
    const rows = db
      .select({
        id: auditRetentionPolicy.id,
        retention_days: auditRetentionPolicy.retentionDays,
        updated_at: auditRetentionPolicy.updatedAt,
      })
      .from(auditRetentionPolicy)
      .orderBy(asc(auditRetentionPolicy.id))
      .limit(500)
      .all()
      .map((row) => ({
        ...row,
        retention_label:
          row.retention_days == null ? "Keep indefinitely" : `${row.retention_days} days`,
      }));
    return {
      rows,
      options: {},
      displayColumns: ["id", "retention_label", "updated_at"],
    };
  }

  create(input: AuditRetentionPolicyCreateDto): string {
    const created = db
      .insert(auditRetentionPolicy)
      .values({ id: input.id, retentionDays: input.retention_days })
      .returning({ id: auditRetentionPolicy.id })
      .get();
    return String(created.id);
  }

  update(id: string, input: AuditRetentionPolicyUpdateDto): boolean {
    const values: Partial<typeof auditRetentionPolicy.$inferInsert> = {};
    if (input.retention_days !== undefined) values.retentionDays = input.retention_days;
    if (input.id !== undefined) values.id = input.id;
    if (!Object.keys(values).length)
      return (
        db
          .select({ id: auditRetentionPolicy.id })
          .from(auditRetentionPolicy)
          .where(eq(auditRetentionPolicy.id, Number(id)))
          .get() !== undefined
      );
    return (
      db
        .update(auditRetentionPolicy)
        .set({ ...values, updatedAt: new Date().toISOString() })
        .where(eq(auditRetentionPolicy.id, Number(id)))
        .returning({ id: auditRetentionPolicy.id })
        .all().length > 0
    );
  }
}
