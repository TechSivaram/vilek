import { z } from "zod";

/** Resource-specific schema; deliberately strict so unknown fields are rejected. */
const fields = {
  code: z.string().trim().max(2000),
  name: z.string().trim().max(2000),
  expiry_required: z.coerce.number().int().safe(),
  is_active: z.coerce.number().int().safe(),
} as const;

export const createInputSchema = z.object(fields).strict();
export const updateInputSchema = z.object(fields).partial().strict();
export type CreateInput = z.infer<typeof createInputSchema>;
export type UpdateInput = z.infer<typeof updateInputSchema>;
