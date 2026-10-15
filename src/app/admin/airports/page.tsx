import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export default function Page() {
  return <AdminPlaceholder
    title="Airports"
    description="Maintain airport reference data used by ViLek flights."
    planned={["Search airports by name, city, or code", "Maintain IATA and ICAO codes", "Maintain country and time-zone details"]}
  />;
}
