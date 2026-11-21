# ViLek claim-wide conversation implementation

## Included

- One shared `/api/claims/[claimId]/conversation` endpoint for reading and posting messages across authorised workspaces.
- Uses existing `Claim_Comment` records, preserving historical comments and decision comments.
- Authorization uses the authenticated local ViLek session/token identity only; no API-supplied user ID is accepted for authorization.
- Users with the existing `APPROVER` or `ADMIN` role can access any claim conversation.
- Crew access is restricted to claims owned by the authenticated crew member.
- Finance retains its existing `FINANCE_PROCESS` role-to-permission rule. Other roles are denied unless an existing explicit resource authorization rule applies.
- No new database role, permission, or migration is introduced for conversation authorization.
- Posting is independent of claim status, so approved/rejected/settled claims can continue to receive messages.
- Chronological timeline with sender identity and timestamps, one-level threaded replies, 100-message pages and a Load older messages control.
- Manual refresh plus 15-second polling while the conversation is open. Draft text is not reset by refresh.
- Conversation panel on Crew claim details, Approver pending review, and Approver review history.
- Typography uses high-contrast navy/slate text and a separate pale panel with orange accent.

## Not included yet

- File attachments.
- Per-user read receipts/unread counts.
- Push/email/in-app notifications.
- Arbitrarily deep nested reply trees (existing schema supports a parent pointer; current UI renders one reply level).

No database migration is required for the included work; it reuses the existing `Claim_Comment` table and `parent_comment_id` column.
