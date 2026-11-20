import { requireRole } from "@/lib/auth/guards";
import { CrewExpensesPage } from "@/components/crew/crew-expenses-page";
export const dynamic = "force-dynamic";
export default async function Page() {
  const authenticated = await requireRole("CREW", "/dashboard");
  return (
    <CrewExpensesPage
      roleCodes={authenticated.roleCodes}
      firstName={authenticated.user.firstName}
      lastName={authenticated.user.lastName}
      email={authenticated.user.email}
    />
  );
}
