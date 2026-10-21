import "server-only";
import { db } from "@/lib/db";
import { auditOutbox } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
export const audit_logRepository = {
  async list() {
    return db.select().from(auditOutbox).orderBy(desc(auditOutbox.createdAt)).limit(200).all();
  },
};
