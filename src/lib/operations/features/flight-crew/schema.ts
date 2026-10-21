import { z } from "zod";

/** Dedicated schemas per operation; API payloads are parsed before reaching services. */
export const listFlightCrewQuerySchema = z
  .object({
    flightId: z.string().trim().min(1).optional(),
    q: z.string().trim().max(200).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10),
  })
  .strict();

export const createFlightCrewSchema = z
  .object({
    flightId: z.string().trim().min(1),
    crewMemberId: z.string().trim().min(1),
    designationId: z.number().int().positive(),
  })
  .strict();

export const removeFlightCrewSchema = z
  .object({
    reason: z.string().trim().min(5).max(500),
  })
  .strict();

export type ListFlightCrewQuery = z.infer<typeof listFlightCrewQuerySchema>;
export type CreateFlightCrewInput = z.infer<typeof createFlightCrewSchema>;
export type RemoveFlightCrewInput = z.infer<typeof removeFlightCrewSchema>;
