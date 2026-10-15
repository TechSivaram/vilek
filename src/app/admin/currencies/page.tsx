import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export default function Page() {
  return <AdminPlaceholder
    title="Currencies"
    description="Maintain supported currencies and their minor-unit precision."
    planned={["Search by currency code or name", "Maintain currency code and display name", "Configure supported minor units from zero to four"]}
  />;
}
