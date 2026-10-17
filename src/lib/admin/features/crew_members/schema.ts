import { z } from "zod";
import type {
  CrewMembersCreateInput,
  CrewMembersUpdateInput,
  ListQueryParams,
} from "./dto";

export const listQuerySchema: z.ZodType<ListQueryParams> = z.object({
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.string().trim().max(80).optional(),
  direction: z.enum(["asc", "desc"]).default("asc"),
});

const createShape = {
  userId: z.coerce.number().int().positive(),
  badgeNumber: z.string().trim().min(1).max(80),
  isActive: z.boolean(),
};

export const createInputSchema: z.ZodType<CrewMembersCreateInput> = z
  .object(createShape)
  .strict();
export const updateInputSchema: z.ZodType<CrewMembersUpdateInput> = z
  .object(createShape)
  .partial()
  .strict();

/** Runtime validator explicitly checked against the feature DTO. */
export const formSchema: z.ZodType<CrewMembersFormDto> = z
  .object({
    userId: z.coerce.number().int().positive(),
    badgeNumber: z.string().trim().min(1),
    isActive: z.boolean(),
  })
  .strict();
