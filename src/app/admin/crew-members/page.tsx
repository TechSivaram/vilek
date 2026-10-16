import { AdminDataManager } from "@/components/admin/admin-data-manager";
import { resourceConfigs } from "@/lib/admin/resources";

export const dynamic = "force-dynamic";
export default function Page() {
  const config = resourceConfigs["crew-members"];
  return <AdminDataManager resource="crew-members" title="Crew Members" description="Manage crew profiles linked to existing ViLek user accounts." fields={config.fields} canCreate={config.canCreate} canEdit={config.canEdit} canDeactivate={config.canDeactivate} syncUsers={false} />;
}
