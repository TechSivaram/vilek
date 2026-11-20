import { requireRole } from "@/lib/auth/guards";
import { CrewFlightsPage } from "@/components/crew/crew-flights-page";

export const dynamic = "force-dynamic";

export default async function Page() {
  const authenticated = await requireRole("CREW", "/dashboard");
  return (
    <CrewFlightsPage
      roleCodes={authenticated.roleCodes}
      firstName={authenticated.user.firstName}
      lastName={authenticated.user.lastName}
      email={authenticated.user.email}
    />
  );
}
