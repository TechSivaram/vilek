import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { getWorkspacesForRoles } from "@/lib/workspaces";
import { ProfileMenu } from "@/components/workspaces/profile-menu";
import "./dashboard.css";

export const dynamic = "force-dynamic";

const workspaceIllustrations: Record<string, { src: string; alt: string }> = {
  CREW: {
    src: "/workspaces/crew-illustration.png",
    alt: "Illustration of an aircraft at an airport",
  },
  APPROVER: {
    src: "/workspaces/approver-illustration.png",
    alt: "Illustration of a checklist and approval mark",
  },
  FINANCE: {
    src: "/workspaces/finance-illustration.png",
    alt: "Illustration of financial reports and a calculator",
  },
  FLIGHT_OPERATIONS_MANAGER: {
    src: "/workspaces/operations-illustration.png",
    alt: "Illustration of flight operations and route planning",
  },
  ADMIN: {
    src: "/workspaces/administration-illustration.png",
    alt: "Illustration of system administration tools",
  },
};

export default async function DashboardSelectionPage() {
  const authenticated = await requireAuthenticatedUser();
  const workspaces = getWorkspacesForRoles(authenticated.roleCodes);

  return (
    <main className="workspace-picker-page">
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
            {authenticated.user.firstName.slice(0, 1)}
            {authenticated.user.lastName.slice(0, 1)}
          </span>
          <span className="workspace-picker-user-identity">
            <strong>
              {authenticated.user.firstName} {authenticated.user.lastName}
            </strong>
            <small>Signed in</small>
          </span>
          <ProfileMenu
            firstName={authenticated.user.firstName}
            lastName={authenticated.user.lastName}
            email={authenticated.user.email}
          />
        </div>
      </header>

      <section className="workspace-picker-content">
        <div className="workspace-picker-intro">
          <span className="workspace-picker-eyebrow">
            YOUR VILEK WORKSPACES
          </span>
          <h1>Which workspace would you like to enter?</h1>
          <p>
            Choose the responsibility you want to work on. You can switch
            workspaces at any time.
          </p>
        </div>

        {workspaces.length === 0 ? (
          <section className="workspace-empty-state" role="status">
            <span className="workspace-empty-icon" aria-hidden="true">
              ⌁
            </span>
            <h2>No workspace access yet</h2>
            <p>
              Your account is signed in, but no active ViLek role has been
              assigned. Please contact your ViLek administrator.
            </p>
          </section>
        ) : (
          <div className="workspace-card-grid">
            {workspaces.map((workspace) => (
              <Link
                href={workspace.href}
                className={`workspace-card workspace-card--${workspace.code.toLowerCase()}`}
                key={workspace.code}
              >
                <span
                  className="workspace-card-illustration"
                  aria-hidden="true"
                >
                  <Image
                    src={workspaceIllustrations[workspace.code].src}
                    alt={workspaceIllustrations[workspace.code].alt}
                    fill
                    sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, 33vw"
                    className="workspace-card-illustration-image"
                  />
                </span>
                <span className="workspace-card-body">
                  <span
                    className={`workspace-card-icon workspace-card-icon--${workspace.code.toLowerCase()}`}
                    aria-hidden="true"
                  >
                    {workspace.icon}
                  </span>
                  <span className="workspace-card-details">
                    <span className="workspace-card-title-row">
                      <strong>{workspace.name}</strong>
                      <span className="workspace-card-arrow" aria-hidden="true">
                        ↗
                      </span>
                    </span>
                    <span className="workspace-card-description">
                      {workspace.description}
                    </span>
                    <span className="workspace-card-action">
                      Enter workspace <span aria-hidden="true">→</span>
                    </span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
        <footer className="workspace-picker-footer">
          <span>ViLek · Aviation expense and operations management</span>
          <span>Access is based on your active ViLek role assignments.</span>
        </footer>
      </section>
    </main>
  );
}
