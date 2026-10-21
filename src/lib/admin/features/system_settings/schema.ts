import { z } from "zod";
import type { UpdateSystemSettingsDto } from "./dto";

export const updateSystemSettingsSchema: z.ZodType<UpdateSystemSettingsDto> = z
  .object({
    defaultCurrencyId: z.coerce.number().int().min(1),
    maxUploadSizeBytes: z.coerce.number().int().min(1024).max(104857600),
  })
  .strict();
