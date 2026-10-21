import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { flightCrewBatchRequests, users } from "@/lib/db/schema";
import type { BatchRequestsRepository } from "./repository";

export const BatchRequestsResourceConfig = {
  label: "Crew batch requests",
  columns: [] as string[],
} as const;

export class BatchRequestsRepositoryImpl implements BatchRequestsRepository {
  list() {
    const rows = db
      .select({
        id: flightCrewBatchRequests.id,
        state: flightCrewBatchRequests.state,
        requested_by_user_id: flightCrewBatchRequests.requestedByUserId,
        created_at: flightCrewBatchRequests.createdAt,
        completed_at: flightCrewBatchRequests.completedAt,
        requested_by_email: users.email,
      })
      .from(flightCrewBatchRequests)
      .leftJoin(users, eq(flightCrewBatchRequests.requestedByUserId, users.id))
      .orderBy(desc(flightCrewBatchRequests.createdAt), desc(flightCrewBatchRequests.id))
      .limit(500)
      .all();
    return {
      rows,
      options: {},
      displayColumns: ["id", "state", "requested_by_email", "created_at", "completed_at"],
    };
  }
}
