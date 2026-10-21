# ViLek Admin Explicit-Feature Refactor Checkpoint

## Changes in this checkpoint

- Removed `src/lib/admin/resources.ts` and the `resourceConfigs` registry.
- Removed `src/lib/admin/features/repository-crud.ts` and replaced resource-driven CRUD with feature-local Drizzle operations for Users, Roles, Currencies, and Expense Categories.
- Replaced resource-config-driven listing in those repositories with explicit table columns, searchable columns, and allow-listed sortable columns.
- Rewrote the Identity Provider repository to query the `users` table explicitly instead of looking up a dynamic resource config.
- Removed `src/lib/admin/validate-resource-payload.ts`; no source file referenced it.
- Removed `src/lib/admin/client-validation.ts`; no source file referenced it.
- Removed route-level `resourceConfigs` permission checks. Create remains explicitly disabled for Roles, and existing route guards remain in place.
- Preserved last-active-admin checks in user and role repositories.

## Verification

- Original ZIP integrity checked before editing.
- Static search found no remaining references to `resourceConfigs`, `makeCrudRepository`, `validateResourcePayload`, the removed resource module, or `makeFormSchema`.
- This environment did not have `node_modules`, so Prettier, TypeScript typecheck, and the production build were not run. Treat this as a source checkpoint, not a build-verified release.
