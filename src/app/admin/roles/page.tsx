import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export default function Page() {
  return <AdminPlaceholder
    title="Role Management"
    description="Review the roles that govern access within ViLek."
    planned={["View application roles and descriptions", "Review which capabilities each role grants", "Manage role activation and role definitions"]} notice="TSCloak identity roles are separate from ViLek application roles."
  />;
}
