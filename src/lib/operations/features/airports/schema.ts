import { z } from "zod";
import type {
  AirportsCreateInput,
  AirportsUpdateInput,
  ListQueryParams,
  AirportsFormDto,
} from "./dto";

export const listQuerySchema: z.ZodType<ListQueryParams> = z.object({
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.string().trim().max(80).optional(),
  direction: z.enum(["asc", "desc"]).default("asc"),
});

const createShape = {
  iataCode: z.string().trim().min(3).max(3),
  icaoCode: z.string().trim().min(4).max(4),
  name: z.string().trim().min(1).max(160),
  city: z.string().trim().min(1).max(120),
  country: z.string().trim().min(1).max(120),
  timeZone: z.string().trim().min(1).max(100),
  isActive: z.boolean(),
};

export const createInputSchema: z.ZodType<AirportsCreateInput> = z.object(createShape).strict();
export const updateInputSchema: z.ZodType<AirportsUpdateInput> = z
  .object(createShape)
  .partial()
  .strict();

/** Runtime validator explicitly checked against the feature DTO. */
export const formSchema: z.ZodType<AirportsFormDto, AirportsFormDto> = z
  .object({
    iataCode: z.string().trim().length(3),
    icaoCode: z.string().trim().length(4),
    name: z.string().trim().min(1),
    city: z.string().trim().min(1),
    country: z.string().trim().min(1),
    timeZone: z.string().trim().min(1),
    isActive: z.boolean(),
  })
  .strict();
