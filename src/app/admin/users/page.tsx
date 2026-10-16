import { AdminDataManager } from "@/components/admin/admin-data-manager";
import { resourceConfigs } from "@/lib/admin/resources";

export const dynamic = "force-dynamic";
export default function Page() {
  const config = resourceConfigs["users"];
  return <AdminDataManager resource="users" title="Users" description="Manage local ViLek user records and their TSCloak identity linkage." fields={config.fields} canCreate={config.canCreate} canEdit={config.canEdit} canDeactivate={config.canDeactivate} syncUsers={true} />;
}
