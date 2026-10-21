import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { qualificationTypes } from "@/lib/db/schema";
import type { ResourceRepository } from "./repository";

export const repository: ResourceRepository = {
  listRows() {
    return db
      .select({
        id: qualificationTypes.id,
        code: qualificationTypes.code,
        qualification_name: qualificationTypes.name,
        name: qualificationTypes.name,
        expiry_required: qualificationTypes.expiryRequired,
        is_active: qualificationTypes.isActive,
        created_at: qualificationTypes.createdAt,
        updated_at: qualificationTypes.updatedAt,
      })
      .from(qualificationTypes)
      .orderBy(asc(qualificationTypes.name), asc(qualificationTypes.id))
      .limit(500)
      .all()
      .map((row) => ({
        ...row,
        expiry_policy: row.expiry_required ? "Expiry required" : "No expiry",
        status_label: row.is_active ? "Active" : "Inactive",
      }));
  },
  getOptions(field: string) {
    if (field !== "qualification_type_id") return [];
    return db
      .select({ value: qualificationTypes.id, label: qualificationTypes.name })
      .from(qualificationTypes)
      .where(eq(qualificationTypes.isActive, true))
      .orderBy(asc(qualificationTypes.name))
      .all();
  },
  create(input) {
    const row = db
      .insert(qualificationTypes)
      .values({
        code: String(input.code),
        name: String(input.name),
        expiryRequired: input.expiry_required === undefined ? true : Boolean(input.expiry_required),
        isActive: input.is_active === undefined ? true : Boolean(input.is_active),
      })
      .returning({ id: qualificationTypes.id })
      .get();
    return { id: String(row.id) };
  },
  update(id, input) {
    const values: Partial<typeof qualificationTypes.$inferInsert> = {};
    if (input.code !== undefined) values.code = String(input.code);
    if (input.name !== undefined) values.name = String(input.name);
    if (input.expiry_required !== undefined) values.expiryRequired = Boolean(input.expiry_required);
    if (input.is_active !== undefined) values.isActive = Boolean(input.is_active);
    if (!Object.keys(values).length)
      return (
        db
          .select({ id: qualificationTypes.id })
          .from(qualificationTypes)
          .where(eq(qualificationTypes.id, Number(id)))
          .get() !== undefined
      );
    return (
      db
        .update(qualificationTypes)
        .set({ ...values, updatedAt: new Date().toISOString() })
        .where(eq(qualificationTypes.id, Number(id)))
        .returning({ id: qualificationTypes.id })
        .all().length > 0
    );
  },
};
