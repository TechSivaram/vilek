import { requireRole } from "@/lib/auth/guards";
import { WorkspaceDashboard } from "@/components/workspaces/workspace-dashboard";
export const dynamic = "force-dynamic";
export default async function FinanceBankAccountsPage() {
  const auth = await requireRole("FINANCE", "/dashboard");
  return (
    <WorkspaceDashboard
      roleCode="FINANCE"
      roleCodes={auth.roleCodes}
      firstName={auth.user.firstName}
      lastName={auth.user.lastName}
      email={auth.user.email}
      financeView="bank-accounts"
    />
  );
}
