import Image from "next/image";
import Link from "next/link";
import { ProfileMenu } from "@/components/workspaces/profile-menu";

type WorkspacePickerHeaderProps = {
  firstName: string;
  lastName: string;
  email: string;
};

/** Shared ViLek header for the workspace picker and account settings pages. */
export function WorkspacePickerHeader({
  firstName,
  lastName,
  email,
}: WorkspacePickerHeaderProps) {
  return (
    <header className="workspace-picker-header">
      <Link
        href="/dashboard"
        className="workspace-picker-brand"
        aria-label="ViLek workspaces"
      >
        <Image
          src="/Branding/logo.png"
          alt=""
          width={92}
          height={58}
          priority
        />
        <span className="workspace-picker-wordmark">ViLek</span>
      </Link>
      <div className="workspace-picker-user">
        <span className="workspace-picker-avatar" aria-hidden="true">
          {firstName.slice(0, 1)}
          {lastName.slice(0, 1)}
        </span>
        <span className="workspace-picker-user-identity">
          <strong>
            {firstName} {lastName}
          </strong>
          <small>Signed in</small>
        </span>
        <ProfileMenu firstName={firstName} lastName={lastName} email={email} />
      </div>
    </header>
  );
}
