import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export default function Page() {
  return <AdminPlaceholder
    title="Airlines"
    description="Maintain airline reference data used by flight records."
    planned={["Search airline names and codes", "Maintain IATA and ICAO codes", "Manage active status"]}
  />;
}
