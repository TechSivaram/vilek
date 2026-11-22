# Finance workspace

## Scope

The Finance workspace at `/finance` is connected to the existing ViLek SQLite/Drizzle claim model and guarded by the `FINANCE_PROCESS` permission.

Implemented:

- Approved-claim queue with crew, flight, currency and expense totals.
- Single-claim and same-currency batch payments.
- Manual payment recording (requires transaction/UTR reference and payment date).
- Provider-neutral bank payment initiation.
- Payment history with processing, paid and failed states.
- Payment audit events and claim status transition from `APPROVED` to `PAID` only after a confirmed payment.

Claims containing expenses in more than one currency are intentionally blocked from payment until the currency handling is resolved. Batch payments must contain claims in one currency. Failed bank payments may be attempted again; a claim with an existing `PROCESSING` or `PAID` payment cannot be submitted again.

## Migration

Run:

```bash
npm run db:migrate
npm run typecheck
npm run build
```

Migration: `drizzle/0006_finance_payments.sql`

New tables:

- `Payment`
- `Payment_Claim`
- `Payment_Audit_Event`

## Manual payment

Finance records the transfer after completing it through the organization's bank. A transaction reference/UTR and payment date are required. ViLek marks the payment and linked claims as paid and retains the audit event.

## Bank gateway contract

Set:

```env
VILEK_BANK_PAYMENT_URL=https://your-bank-adapter.example/payments
VILEK_BANK_PAYMENT_TOKEN=your-server-side-token
```

The application sends a server-to-server `POST` with:

- `content-type: application/json`
- `idempotency-key: <unique key>`
- optional `authorization: Bearer <token>`

Body:

```json
{
  "paymentNumber": "VLK-YYYYMMDD-XXXXXXXX",
  "amount": "1250.00",
  "currency": "INR",
  "reference": "VLK-YYYYMMDD-XXXXXXXX"
}
```

Expected JSON response fields:

- `status`: `PAID`, `SUCCESS`, `COMPLETED`, `PROCESSING`, `PENDING`, `FAILED`, `REJECTED` or `DECLINED`
- `reference` or `transactionId`: provider transaction reference
- `message`: optional failure detail

A confirmed success marks linked claims as paid. A pending/unknown response stays `PROCESSING`; a failed/rejected response is marked `FAILED`. A timeout or unparseable response is deliberately not treated as a failure, because the bank may have accepted the transfer. Finance must reconcile that outcome with the provider before attempting another payment.

This is an adapter contract, not a connection to a particular bank. Provider authentication, signing, webhook verification, settlement/reconciliation APIs and bank-specific request mapping must be implemented in the adapter selected by the organization before production bank execution.

## Crew beneficiary bank accounts (migration 0007)

- Crew can register multiple beneficiary bank accounts and view masked account identifiers.
- Account numbers and routing codes are encrypted with AES-256-GCM using `VILEK_BANK_DATA_ENCRYPTION_KEY`.
- Each account records its country and payout currency.
- Automated verification is attempted when `VILEK_BANK_VERIFICATION_URL` is configured; ambiguous/unavailable responses enter `NEEDS_REVIEW`.
- Without a provider, accounts remain `PENDING` for manual Finance review.
- Finance can verify or reject accounts from `/finance/bank-accounts`.
- Only verified accounts can be designated primary. A partial unique index permits at most one primary account per crew member.
- Payment execution has not yet been connected to beneficiary selection; that is the next implementation step.
