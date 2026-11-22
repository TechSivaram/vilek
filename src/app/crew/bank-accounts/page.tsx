import { requireRole } from "@/lib/auth/guards";
import { WorkspaceDashboard } from "@/components/workspaces/workspace-dashboard";
import { CrewBankAccounts } from "@/components/crew/bank-accounts";

export const dynamic = "force-dynamic";
export default async function CrewBankAccountsPage() {
  const auth = await requireRole("CREW", "/dashboard");
  return (
    <WorkspaceDashboard
      roleCode="CREW"
      roleCodes={auth.roleCodes}
      firstName={auth.user.firstName}
      lastName={auth.user.lastName}
      email={auth.user.email}
      crewView="bank-accounts"
    />
  );
}
