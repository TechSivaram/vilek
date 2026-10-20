import { z } from "zod";
import type { MfaCodeRequestDto, MfaEnrollRequestDto } from "./mfa.dto";

export const mfaCodeRequestSchema: z.ZodType<MfaCodeRequestDto> = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the six-digit authenticator code."),
}).strict();
export const mfaEnrollRequestSchema: z.ZodType<MfaEnrollRequestDto> = z.object({}).strict();
