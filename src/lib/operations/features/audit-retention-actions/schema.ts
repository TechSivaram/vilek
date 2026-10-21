import { z } from "zod";

/** These history resources are read-only; the empty object rejects unexpected query/body fields. */
export const listQuerySchema = z.object({}).strict();
export const readOnlyMutationSchema = z.object({}).strict();
