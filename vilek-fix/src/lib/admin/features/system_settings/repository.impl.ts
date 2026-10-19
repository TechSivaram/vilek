import "server-only";
import { db } from "@/lib/db";
import { currencies, systemSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const system_settingsRepository = {
  get() {
    return (
      db.select().from(systemSettings).where(eq(systemSettings.id, 1)).get() ??
      null
    );
  },
  currencyOptions() {
    return db
      .select({
        id: currencies.id,
        code: currencies.code,
        name: currencies.name,
      })
      .from(currencies)
      .where(eq(currencies.isActive, true))
      .all();
  },
  currencyExists(id: number) {
    return Boolean(
      db
        .select({ id: currencies.id })
        .from(currencies)
        .where(eq(currencies.id, id))
        .get(),
    );
  },
  save(defaultCurrencyId: number, maxUploadSizeBytes: number) {
    const updatedAt = new Date().toISOString();
    return db
      .insert(systemSettings)
      .values({ id: 1, defaultCurrencyId, maxUploadSizeBytes, updatedAt })
      .onConflictDoUpdate({
        target: systemSettings.id,
        set: { defaultCurrencyId, maxUploadSizeBytes, updatedAt },
      })
      .run();
  },
};
