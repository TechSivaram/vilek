# Bank account evidence flow patch

Based on the uploaded `src.zip` baseline. Changes are limited to beneficiary evidence handling and the directly related Finance account-list condition.

- Added the missing Drizzle `crewBankAccountEvidence` table declaration and schema export to match migration `0009_crew_bank_account_evidence.sql`.
- Added Crew-side evidence upload controls for pending/review-required/rejected bank accounts. Supported evidence types: cancelled cheque, bank passbook, bank statement. Supported files: PDF/JPEG/PNG, maximum 10 MB.
- Kept server-side MIME and file-signature checks, authenticated Crew ownership checks, and private filesystem storage.
- Made evidence metadata and upload audit-event insertion atomic; removes the stored file if database persistence fails.
- Prevents evidence changes after an account is verified.
- Added Finance review link to open the latest evidence through the authenticated Finance-only evidence endpoint. ADMIN is explicitly excluded by that endpoint.
- Corrected the Finance bank-account list Drizzle predicate to `eq(crewBankAccounts.isActive, true)`.

Operational note: bank-account evidence reuses the existing `VILEK_DOCUMENT_STORAGE_PATH` and is stored in its `bank-account-evidence/` subfolder. No new environment variable is required. Ensure the configured root is persistent and non-public; ephemeral hosting storage may not survive deployments. Ensure migration `0009_crew_bank_account_evidence.sql` has been applied.

Validation: source-level checks and ZIP integrity only. This environment has no `node_modules`, so `npm run typecheck` and `npm run build` were not run. Run both in the local project after extracting this archive.
