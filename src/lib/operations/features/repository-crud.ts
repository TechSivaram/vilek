import "server-only";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { resourceConfigs } from "@/lib/operations/resources";

/** CRUD persistence for Flight Operations master records. Authorization and input validation stay in route handlers. */
export function makeCrudRepository(resource: string) {
  const config = resourceConfigs[resource];
  if (!config) throw new Error(`Unknown Flight Operations resource: ${resource}`);
  const table = config.table as any;
  const usesStringId = ["crew-members", "flights"].includes(resource);
  return {
    create(values: Record<string, unknown>) {
      const result = db.insert(table).values(values as never).run();
      return { changes: result.changes };
    },
    update(id: string | number, values: Record<string, unknown>) {
      const idValue = usesStringId ? String(id) : Number(id);
      const result = db.update(table).set(values as never).where(eq(table.id, idValue as never)).run();
      return { changes: result.changes };
    },
    deactivate(id: string | number) {
      const idValue = usesStringId ? String(id) : Number(id);
      const result = db.update(table).set({ isActive: false } as never).where(eq(table.id, idValue as never)).run();
      return { changes: result.changes };
    },
  };
}
