import { z } from "zod";
import type {
  ListQueryParams,
  UserRoleCreateDto,
  UserRoleMutationResponseDto,
  UserRoleAssignmentDto,
  UserRoleOptionDto,
  UserRoleUserOptionDto,
  UserRolesListResponseDto,
} from "./dto";

export const listQuerySchema: z.ZodType<ListQueryParams> = z
  .object({
    q: z.string().trim().max(200).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10),
    sort: z.string().trim().max(80).optional(),
    direction: z.enum(["asc", "desc"]).default("asc"),
  })
  .strict();

export const createInputSchema: z.ZodType<UserRoleCreateDto> = z
  .object({
    userId: z.string().trim().min(1).max(200),
    roleId: z.coerce.number().int().positive().safe(),
  })
  .strict();

export const assignmentIdSchema = z.coerce.number().int().positive().safe();
export const mutationResponseSchema: z.ZodType<UserRoleMutationResponseDto> = z
  .object({ ok: z.boolean() })
  .strict();

const assignmentSchema: z.ZodType<UserRoleAssignmentDto> = z
  .object({
    id: z.number().int().positive(),
    userId: z.string(),
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
    roleId: z.number().int().positive(),
    roleCode: z.string(),
    roleName: z.string(),
    createdAt: z.string(),
  })
  .strict();
const userOptionSchema: z.ZodType<UserRoleUserOptionDto> = z
  .object({
    id: z.string(),
    email: z.string().email(),
    firstName: z.string(),
    lastName: z.string(),
  })
  .strict();
const roleOptionSchema: z.ZodType<UserRoleOptionDto> = z
  .object({
    id: z.number().int().positive(),
    code: z.string(),
    name: z.string(),
  })
  .strict();
export const listResponseSchema: z.ZodType<UserRolesListResponseDto> = z
  .object({
    rows: z.array(assignmentSchema),
    options: z
      .object({
        users: z.array(userOptionSchema),
        roles: z.array(roleOptionSchema),
      })
      .strict(),
  })
  .strict();
