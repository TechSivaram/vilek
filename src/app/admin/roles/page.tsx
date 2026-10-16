import { AdminDataManager } from "@/components/admin/admin-data-manager";
import { resourceConfigs } from "@/lib/admin/resources";

export const dynamic = "force-dynamic";
export default function Page() {
  const config = resourceConfigs["roles"];
  return <AdminDataManager resource="roles" title="Role Management" description="Manage predefined local ViLek roles. Permission grants remain code-defined; TSCloak roles are separate." fields={config.fields} canCreate={config.canCreate} canEdit={config.canEdit} canDeactivate={config.canDeactivate} syncUsers={false} />;
}
