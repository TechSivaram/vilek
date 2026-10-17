import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/guards";
import { AdminShell } from "@/components/admin/admin-shell";
import "./admin.css";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const authenticated = await requireRole("ADMIN");

  return (
    <AdminShell
      user={{
        firstName: authenticated.user.firstName,
        lastName: authenticated.user.lastName,
        email: authenticated.user.email,
      }}
    >
      {children}
    </AdminShell>
  );
}
