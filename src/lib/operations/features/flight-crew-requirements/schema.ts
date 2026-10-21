import { z } from "zod";

/** Resource-specific schema; deliberately strict so unknown fields are rejected. */
const fields = {
  flight_id: z.coerce.number().int().safe(),
  designation_id: z.coerce.number().int().safe(),
  required_count: z.coerce.number().int().safe(),
  reason: z.string().trim().max(2000),
} as const;

export const createInputSchema = z.object(fields).strict();
export const updateInputSchema = z.object(fields).partial().strict();
export type CreateInput = z.infer<typeof createInputSchema>;
export type UpdateInput = z.infer<typeof updateInputSchema>;
