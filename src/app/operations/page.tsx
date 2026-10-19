import { requireRole } from "@/lib/auth/guards";
import { WorkspaceDashboard } from "@/components/workspaces/workspace-dashboard";

export const dynamic = "force-dynamic";

export default async function FlightOperationsDashboardPage() {
  const authenticated = await requireRole("FLIGHT_OPERATIONS_MANAGER", "/dashboard");
  return <WorkspaceDashboard roleCode="FLIGHT_OPERATIONS_MANAGER" roleCodes={authenticated.roleCodes} firstName={authenticated.user.firstName} lastName={authenticated.user.lastName} email={authenticated.user.email} />;
}
