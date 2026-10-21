import { z } from "zod";
import type { CreateFileTypeDto } from "./dto";

export const createFileTypeSchema: z.ZodType<CreateFileTypeDto> = z
  .object({
    fileType: z
      .string()
      .trim()
      .toLowerCase()
      .transform((value) => (value.startsWith(".") ? value : `.${value}`))
      .pipe(z.string().regex(/^\.[a-z0-9]{1,10}$/)),
  })
  .strict();
