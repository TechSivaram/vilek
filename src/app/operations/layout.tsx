import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/guards";
import { OperationsShell } from "@/components/operations/operations-shell";
import "../admin/admin.css";

export const dynamic = "force-dynamic";

export default async function OperationsLayout({ children }: { children: ReactNode }) {
  const authenticated = await requireRole("FLIGHT_OPERATIONS_MANAGER", "/dashboard");
  return (
    <OperationsShell
      user={{
        firstName: authenticated.user.firstName,
        lastName: authenticated.user.lastName,
        email: authenticated.user.email,
      }}
      roleCodes={authenticated.roleCodes}
    >
      {children}
    </OperationsShell>
  );
}
