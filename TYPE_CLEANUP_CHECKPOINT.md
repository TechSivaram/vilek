# ViLek type cleanup checkpoint

## Scope

Removed 19 exported type aliases that had no references anywhere in the source tree (checked by identifier scan across `.ts` and `.tsx` files). No runtime code, route handlers, database schema, authorization, or UI behavior was intentionally changed.

## Removed declarations

- `src/lib/profile/mfa.dto.ts`: `MfaStatusResponseDto`
- `src/lib/operations/features/flight-crew/dto.ts`: `FlightCrewListQueryDto`, `FlightCrewCreateRequestDto`, `FlightCrewRemovalRequestDto`, `FlightCrewMutationResponseDto`, `ApiErrorResponseDto`
- `src/lib/operations/features/flights/dto.ts`: `FlightsListResult`
- `src/lib/operations/features/qualification-alerts/dto.ts`: `QualificationAlertsResponseDto`
- `src/lib/operations/features/crew-qualifications/dto.ts`: `CrewQualificationsResponseDto`
- `src/lib/operations/features/designation-qualification-requirements/dto.ts`: `DesignationQualificationRequirementsMutationResponseDto`
- `src/lib/operations/features/flight-operations-settings/dto.ts`: `FlightOperationsSettingsMutationResponseDto`
- `src/lib/operations/features/audit-retention-policy/dto.ts`: `AuditRetentionPolicyMutationResponseDto`
- `src/lib/admin/features/audit_log/dto.ts`: `AuditLogListQuery`, `AuditLogListResult`
- `src/lib/admin/features/operations/dto.ts`: `OperationsListQuery`, `OperationsListResult`
- `src/lib/admin/features/file_types/dto.ts`: `FileTypeDto`
- `src/lib/admin/features/identity_provider/dto.ts`: `IdentityProviderListResult`
- `src/lib/admin/features/user_roles/dto.ts`: `UserRolesListQuery`, `UserRolesListResult`

## Verification

- Confirmed the removed identifiers no longer occur in the source tree.
- This was a conservative identifier-reference scan, not a TypeScript compiler's semantic unused-symbol analysis.
- `npm run typecheck`, lint, and production build were not run because dependencies (`node_modules`) are not present in this archive. Run these before deployment.

## Not included

This checkpoint does not yet remove unused imports/locals or finish the Admin generic-resource refactor. Those need separate reference-aware passes so behavior and public API contracts remain intact.
