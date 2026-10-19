import "server-only";
import { db } from "@/lib/db";
import { allowedFileTypes, systemSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const fileTypesRepository = {
  setting() {
    return (
      db
        .select({ id: systemSettings.id })
        .from(systemSettings)
        .where(eq(systemSettings.id, 1))
        .get() ?? null
    );
  },
  list(settingId: number) {
    return db
      .select()
      .from(allowedFileTypes)
      .where(eq(allowedFileTypes.systemSettingId, settingId))
      .all();
  },
  create(settingId: number, fileType: string) {
    return db
      .insert(allowedFileTypes)
      .values({ systemSettingId: settingId, fileType })
      .run();
  },
  remove(id: number) {
    return db.delete(allowedFileTypes).where(eq(allowedFileTypes.id, id)).run();
  },
};
