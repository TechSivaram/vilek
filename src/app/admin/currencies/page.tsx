import { AdminDataManager } from "@/components/admin/admin-data-manager";
import { resourceConfigs } from "@/lib/admin/resources";

export const dynamic = "force-dynamic";
export default function Page() {
  const config = resourceConfigs["currencies"];
  return <AdminDataManager resource="currencies" title="Currencies" description="Maintain supported currencies and minor-unit precision." fields={config.fields} canCreate={config.canCreate} canEdit={config.canEdit} canDeactivate={config.canDeactivate} syncUsers={false} />;
}
