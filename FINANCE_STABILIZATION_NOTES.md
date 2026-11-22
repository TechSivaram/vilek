# Finance workspace stabilization pass

Changes in this pass:
- Finance claim totals are accumulated in each currency's configured minor unit to reduce floating-point drift; malformed expense amounts now block payment instead of being silently omitted.
- Bank gateway success is accepted only when the provider returns a success status and a transaction reference.
- Bank payment state, linked claim state, and audit event are now persisted in one database transaction.
- Ambiguous provider success responses remain PROCESSING and return HTTP 202 with a reconciliation warning.
- Manual payment confirmation rejects future transfer timestamps and duplicate UTR/reference values.
- Finance payment history uses local datetime values for the `datetime-local` input and safely handles invalid display dates.

Validation:
- Source inspection completed.
- A full TypeScript/build validation could not be completed in this environment because this source archive does not include `node_modules`; `tsc` therefore reports missing project dependencies/types. Run `npm install`, `npm run typecheck`, and `npm run build` in the project environment.
