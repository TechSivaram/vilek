import { z } from "zod";
import type {
  CurrenciesCreateInput,
  CurrenciesUpdateInput,
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
  code: z.string().trim().length(3),
  name: z.string().trim().min(1).max(120),
  minorUnits: z.coerce.number().int().min(0).max(6),
  isActive: z.boolean(),
};

export const createInputSchema: z.ZodType<CurrenciesCreateInput> = z
  .object(createShape)
  .strict();
export const updateInputSchema: z.ZodType<CurrenciesUpdateInput> = z
  .object(createShape)
  .partial()
  .strict();

/** Runtime validator explicitly checked against the feature DTO. */
export const formSchema: z.ZodType<CurrenciesFormDto> = z
  .object({
    code: z.string().trim().length(3),
    name: z.string().trim().min(1),
    minorUnits: z.coerce.number().int().min(0).max(4),
    isActive: z.boolean(),
  })
  .strict();
