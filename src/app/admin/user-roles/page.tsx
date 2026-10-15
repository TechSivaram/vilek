import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export default function Page() {
  return <AdminPlaceholder
    title="User Role Assignments"
    description="Manage the ViLek roles assigned to individual users."
    planned={["Find a user and review assigned roles", "Assign or remove an application role", "Record sensitive access changes for auditing"]} notice="Role assignment actions will require explicit server-side authorization."
  />;
}
