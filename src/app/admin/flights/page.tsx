import { AdminDataManager } from "@/components/admin/admin-data-manager";
import { resourceConfigs } from "@/lib/admin/resources";

export const dynamic = "force-dynamic";
export default function Page() {
  const config = resourceConfigs["flights"];
  return (
    <AdminDataManager
      resource="flights"
      title="Flights"
      description="Maintain scheduled flight records and operational details."
      fields={config.fields}
      canCreate={config.canCreate}
      canEdit={config.canEdit}
      canDeactivate={config.canDeactivate}
      syncUsers={false}
    />
  );
}
