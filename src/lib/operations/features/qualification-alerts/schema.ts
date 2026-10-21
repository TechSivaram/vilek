import { z } from "zod";

/** Resource-specific schema; deliberately strict so unknown fields are rejected. */
const fields = {
  crew_qualification_id: z.coerce.number().int().safe(),
  alert_interval_days: z.coerce.number().int().safe(),
  due_at: z.string().trim().min(1).max(80).nullable().optional(),
  state: z
    .union([
      z.string().trim().max(2000),
      z.number().finite(),
      z.boolean(),
      z.null(),
    ])
    .optional(),
  generated_at: z.string().trim().min(1).max(80).nullable().optional(),
  resolved_at: z.string().trim().min(1).max(80).nullable().optional(),
} as const;

export const createInputSchema = z.object(fields).strict();
export const updateInputSchema = z.object(fields).partial().strict();
export type CreateInput = z.infer<typeof createInputSchema>;
export type UpdateInput = z.infer<typeof updateInputSchema>;
