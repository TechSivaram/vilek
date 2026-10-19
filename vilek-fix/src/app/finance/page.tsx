import { requireRole } from "@/lib/auth/guards";
import { WorkspaceDashboard } from "@/components/workspaces/workspace-dashboard";

export const dynamic = "force-dynamic";

export default async function FinanceDashboardPage() {
  const authenticated = await requireRole("FINANCE", "/dashboard");
  return <WorkspaceDashboard roleCode="FINANCE" roleCodes={authenticated.roleCodes} firstName={authenticated.user.firstName} lastName={authenticated.user.lastName} email={authenticated.user.email} />;
}
