import { requireRole } from "@/lib/auth/guards";
import { CrewClaimsPage } from "@/components/crew/crew-claims-page";

export const dynamic = "force-dynamic";

export default async function Page() {
  const authenticated = await requireRole("CREW", "/dashboard");
  return (
    <CrewClaimsPage
      roleCodes={authenticated.roleCodes}
      firstName={authenticated.user.firstName}
      lastName={authenticated.user.lastName}
      email={authenticated.user.email}
    />
  );
}
