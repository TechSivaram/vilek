# Finance FX correction workflow

- Finance can correct an approved FX resolution while the claim remains unpaid and has no payment currently in PROCESSING.
- Corrections require a reason, preserve previous values in the immutable FX audit event, and update the active resolution in a transaction.
- PAID payments are locked. PROCESSING payments must be reconciled before FX correction to avoid changing the claim amount while a bank instruction is in flight.
- FAILED payments do not block correction.
- Original expense amounts are never modified.
- Payment initiation continues to snapshot the approved payable amount; the payment record is not silently rewritten by an FX correction.
