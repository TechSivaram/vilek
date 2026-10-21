import { z } from "zod";
import type {
  UsersCreateInput,
  UsersUpdateInput,
  UsersFormDto,
  UsersStatusFormDto,
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
  email: z.string().trim().email().max(254),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
};

export const createInputSchema: z.ZodType<UsersCreateInput> = z.object(createShape).strict();
export const updateInputSchema: z.ZodType<UsersUpdateInput> = z
  .object(createShape)
  .partial()
  .strict();

export const userFormSchema: z.ZodType<UsersFormDto, UsersFormDto> = z
  .object({
    email: z.string().trim().email(),
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
  })
  .strict();
export const userStatusFormSchema: z.ZodType<UsersStatusFormDto, UsersStatusFormDto> = z
  .object({ isActive: z.boolean() })
  .strict();
