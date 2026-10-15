import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export default function Page() {
  return <AdminPlaceholder
    title="Allowed File Types"
    description="Manage file types permitted for expense-document uploads."
    planned={["Review currently allowed file types", "Add or remove permitted types", "Validate file policy against upload handling"]} notice="Upload policy changes will need to be enforced by the upload API as well as this interface."
  />;
}
