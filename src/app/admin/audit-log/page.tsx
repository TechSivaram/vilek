import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export default function Page() {
  return <AdminPlaceholder
    title="Audit Log"
    description="Review administrative and security-relevant activity."
    planned={["Filter events by date, actor, and event type", "Review changes to users, roles, and configuration", "Inspect correlation identifiers where available"]} notice="The existing Audit_Outbox is an outbox table, not a complete user-facing audit history. This page will only display verified audit events once the audit pipeline is defined."
  />;
}
