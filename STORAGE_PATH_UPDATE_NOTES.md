# Document storage path update

Updated expense-document storage paths consistently across Crew upload, Crew retrieval/deletion, expense deletion cleanup, and Approver retrieval.

The storage root convention is now:

- When `VILEK_DOCUMENT_STORAGE_PATH` is set: `<VILEK_DOCUMENT_STORAGE_PATH>/expense-documents/`
- When it is not set: `<project>/data/expense-documents/`

Bank-account evidence uses the same root convention in Crew upload and Finance retrieval:

- When `VILEK_DOCUMENT_STORAGE_PATH` is set: `<VILEK_DOCUMENT_STORAGE_PATH>/bank-account-evidence/`
- When it is not set: `<project>/data/bank-account-evidence/`

No new environment variable is introduced. Existing files stored under the previous fallback locations are not moved automatically; move them to the corresponding new directory before relying on retrieval/deletion for those older uploads.
