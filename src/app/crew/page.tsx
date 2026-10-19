import { requireRole } from "@/lib/auth/guards";
import { WorkspaceDashboard } from "@/components/workspaces/workspace-dashboard";

export const dynamic = "force-dynamic";

export default async function CrewDashboardPage() {
  const authenticated = await requireRole("CREW", "/dashboard");
  return <WorkspaceDashboard roleCode="CREW" roleCodes={authenticated.roleCodes} firstName={authenticated.user.firstName} lastName={authenticated.user.lastName} email={authenticated.user.email} />;
}
