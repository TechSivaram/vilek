# Finance workspace: beneficiary-currency resolution

## Behavior

- The verified, active, primary crew bank account determines the payout currency.
- Claims with multiple source currencies, or a source currency different from the beneficiary payout currency, remain blocked until Finance enters a source-to-payout rate for each source currency.
- Rates are expressed as `1 source currency = N payout currency`.
- The payout currency rate is fixed at 1 when a source currency already matches the beneficiary currency.
- Finance must provide a rate source/reference and an effective date that is not in the future.
- Original expense rows and original currency totals are not modified.
- Converted payable amount is rounded using the payout currency's configured minor units.
- Resolution details are stored separately, including rates, payout currency, amount, rate source, effective date, creator/approver and approval timestamp.
- Every create/update approval appends an immutable audit event.
- Payment preparation rechecks the approved claim, verified primary beneficiary and FX resolution inside the write transaction.
- Beneficiary reveal now uses the resolved payout currency and remains audited.

## Migration

Run `npm run db:migrate` to apply `0008_claim_currency_resolution.sql`.

## Validation

- Changed TypeScript/TSX files passed TypeScript transpilation syntax checks.
- Migration SQL executed successfully against SQLite with minimal referenced tables.
- Full `npm run typecheck` and `npm run build` were not run because this archive does not contain `node_modules`. Run both after `npm install` in the project environment.
