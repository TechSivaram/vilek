import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export default function Page() {
  return <AdminPlaceholder
    title="Crew Designations"
    description="Maintain the designations used for flight crew assignments."
    planned={["View designation codes and names", "Create and update designation reference records", "Activate or deactivate designations"]}
  />;
}
