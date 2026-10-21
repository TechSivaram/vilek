import { z } from "zod";

/** JSON-safe editable values accepted by the generic operations maintenance API. */
export type MaintenanceInputDto = Record<
  string,
  string | number | boolean | null
>;

/**
 * Build a strict runtime contract from the allow-listed columns declared by a
 * maintenance route. Unknown fields are rejected; required fields are enforced
 * on create and non-empty required fields on partial updates.
 */
export function maintenanceInputSchema(
  columns: readonly string[],
  required: readonly string[],
  mode: "create" | "update",
) {
  const value = z.union([
    z.string().max(2000),
    z.number().finite(),
    z.boolean(),
    z.null(),
  ]);
  const shape = Object.fromEntries(
    columns.map((column) => [column, value]),
  ) as Record<string, z.ZodTypeAny>;
  let schema = z.object(shape).strict();
  if (mode === "update") schema = schema.partial();
  return schema.superRefine((input, ctx) => {
    if (mode === "create") {
      for (const field of required) {
        const value = input[field];
        if (value === undefined || value === null || value === "") {
          ctx.addIssue({
            code: "custom",
            path: [field],
            message: `${field} is required`,
          });
        }
      }
    } else {
      if (Object.keys(input).length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "At least one editable field is required",
        });
      }
      for (const field of required) {
        if (field in input && (input[field] === null || input[field] === "")) {
          ctx.addIssue({
            code: "custom",
            path: [field],
            message: `${field} cannot be empty`,
          });
        }
      }
    }
  });
}
