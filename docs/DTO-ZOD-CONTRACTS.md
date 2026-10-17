# DTO-first API contracts

Feature DTOs in `src/lib/admin/features/*/dto.ts` are the source of truth for application/API contract types. Runtime Zod validators are explicitly annotated with `z.ZodType<Dto>`; DTOs are not inferred from schemas.

For airlines, airports, crew designations, crew members, currencies, expense categories, roles, and users, `schema.ts` now defines DTO-typed `createInputSchema` and `updateInputSchema` contracts. Their object schemas are strict so unknown request properties are rejected instead of silently accepted. The list-query schemas are also explicitly typed against the feature's `ListQueryParams` DTO, with defaults for page, page size, and sort direction.

The corresponding POST/PATCH handlers use these feature schemas to validate untrusted request JSON before passing values into the feature service. Other feature areas currently have DTO-typed list-query schemas but still need feature-specific create/update/detail DTOs and runtime response validation where those contracts exist. The Zod annotation provides assignability checks, but by itself TypeScript does not prove exact key-set equality for every possible schema expression; keep the DTO/schema fields aligned and retain `.strict()` at runtime.
