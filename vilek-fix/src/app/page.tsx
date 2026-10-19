import { redirect } from "next/navigation";
import { getAuthorizationContext } from "@/lib/auth/guards";
import { getWorkspacesForRoles } from "@/lib/workspaces";

export const dynamic = "force-dynamic";

export default async function Home() {
  const authenticated = await getAuthorizationContext();
  if (!authenticated) redirect("/login");

  const workspaces = getWorkspacesForRoles(authenticated.roleCodes);
  if (workspaces.length === 1) redirect(workspaces[0].href);
  redirect("/dashboard");
}
