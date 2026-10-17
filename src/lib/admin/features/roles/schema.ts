import { z } from "zod";
import type {
  RolesCreateInput,
  RolesUpdateInput,
  ListQueryParams,
  RolesFormDto,
} from "./dto";

export const listQuerySchema: z.ZodType<ListQueryParams> = z.object({
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.string().trim().max(80).optional(),
  direction: z.enum(["asc", "desc"]).default("asc"),
});

const createShape = {
  code: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable(),
  isActive: z.boolean(),
};

export const createInputSchema: z.ZodType<RolesCreateInput> = z
  .object(createShape)
  .strict();
export const updateInputSchema: z.ZodType<RolesUpdateInput> = z
  .object(createShape)
  .partial()
  .strict();

/** Runtime validator explicitly checked against the feature DTO. */
export const formSchema: z.ZodType<RolesFormDto, RolesFormDto> = z
  .object({
    name: z.string().trim().min(1),
    description: z.string(),
    isActive: z.boolean(),
  })
  .strict();
