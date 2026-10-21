import { z } from "zod";

/** Resource-specific schema; deliberately strict so unknown fields are rejected. */
const fields = {
  crew_member_id: z.coerce.number().int().safe(),
  qualification_type_id: z.coerce.number().int().safe(),
  valid_from: z.string().trim().min(1).max(80).nullable().optional(),
  valid_until: z.string().trim().min(1).max(80).nullable().optional(),
  status: z.string().trim().max(2000),
  replaced_by_id: z.coerce.number().int().safe(),
  notes: z.string().trim().max(2000),
} as const;

export const createInputSchema = z.object(fields).strict();
export const updateInputSchema = z.object(fields).partial().strict();
export type CreateInput = z.infer<typeof createInputSchema>;
export type UpdateInput = z.infer<typeof updateInputSchema>;
