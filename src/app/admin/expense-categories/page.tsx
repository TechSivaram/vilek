import { AdminDataManager } from "@/components/admin/admin-data-manager";
import { resourceConfigs } from "@/lib/admin/resources";

export const dynamic = "force-dynamic";
export default function Page() {
  const config = resourceConfigs["expense-categories"];
  return <AdminDataManager resource="expense-categories" title="Expense Categories" description="Maintain categories available when recording expenses." fields={config.fields} canCreate={config.canCreate} canEdit={config.canEdit} canDeactivate={config.canDeactivate} syncUsers={false} />;
}
