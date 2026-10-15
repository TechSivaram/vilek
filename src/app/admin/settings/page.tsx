import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export default function Page() {
  return <AdminPlaceholder
    title="System Settings"
    description="Review application-wide settings for the ViLek deployment."
    planned={["Configure the default currency", "Configure maximum upload size", "Validate settings before saving"]} notice="No settings are changed from this placeholder."
  />;
}
