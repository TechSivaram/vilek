import { z } from "zod";

/** Resource-specific schema; deliberately strict so unknown fields are rejected. */
const fields = {
  setting_key: z.string().trim().max(2000),
  value_json: z.string().trim().max(2000),
  description: z.string().trim().max(2000),
} as const;

export const createInputSchema = z.object(fields).strict();
export const updateInputSchema = z.object(fields).partial().strict();
export type CreateInput = z.infer<typeof createInputSchema>;
export type UpdateInput = z.infer<typeof updateInputSchema>;
