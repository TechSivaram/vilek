import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export default function Page() {
  return <AdminPlaceholder
    title="Flights"
    description="Maintain flight reference records and operational details."
    planned={["Search flights by airline and flight number", "Review scheduled and actual departure and arrival times", "Maintain origin, destination, and active status"]} notice="Flight scheduling and crew assignment workflows may be implemented separately from this master-data page."
  />;
}
