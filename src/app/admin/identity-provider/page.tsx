import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export default function Page() {
  return <AdminPlaceholder
    title="Identity Provider"
    description="Review the configuration boundary between ViLek and TSCloak."
    planned={["Review configured OIDC issuer and client metadata", "Review SCIM provisioning configuration status", "Show actionable integration errors without exposing secrets"]} notice="Credentials and client secrets must remain server-side and will never be displayed here."
  />;
}
