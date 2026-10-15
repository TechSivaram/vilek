import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export default function Page() {
  return <AdminPlaceholder
    title="Users"
    description="Manage ViLek user accounts and their application access."
    planned={["Search and filter provisioned ViLek users", "Review account status and identity linkage", "Sync users from TSCloak using the server-side SCIM integration", "Preserve local role assignments during identity synchronization"]} notice="User synchronization is not enabled from this placeholder yet. No TSCloak API is called from this page."
  />;
}
