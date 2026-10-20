/** Request/response contracts for the signed-in user's MFA proxy endpoints. */
export type MfaCodeRequestDto = { code: string };
export type MfaEnrollRequestDto = Record<string, never>;
export type MfaStatusResponseDto = { enabled: boolean; [key: string]: unknown };
