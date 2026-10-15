import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export default function Page() {
  return <AdminPlaceholder
    title="Expense Categories"
    description="Maintain the categories available when recording expenses."
    planned={["View category codes and names", "Create and update expense categories", "Control which categories are active"]}
  />;
}
