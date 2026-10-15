import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export default function Page() {
  return <AdminPlaceholder
    title="Crew Members"
    description="Maintain crew records linked to ViLek users."
    planned={["Search and filter crew members", "View crew profile and badge details", "Manage crew record status"]}
  />;
}
