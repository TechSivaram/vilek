import Image from "next/image";
import Link from "next/link";
import { WorkspaceSwitcher } from "@/components/workspaces/workspace-switcher";
import { ProfileMenu } from "@/components/workspaces/profile-menu";
import { getWorkspace } from "@/lib/workspaces";

export function WorkspaceDashboard({
  roleCode,
  roleCodes,
  firstName,
  lastName,
  email,
}: {
  roleCode: string;
  roleCodes: string[];
  firstName: string;
  lastName: string;
  email: string;
}) {
  const workspace = getWorkspace(roleCode);
  if (!workspace) return null;
  const initials =
    `${firstName.slice(0, 1)}${lastName.slice(0, 1)}`.toUpperCase();

  return (
    <div
      className={`role-dashboard role-dashboard--${workspace.code.toLowerCase()}`}
      data-workspace={workspace.code.toLowerCase()}
    >
      <aside className="role-dashboard-sidebar">
        <Link
          href={workspace.href}
          className="role-dashboard-brand"
          aria-label="ViLek dashboard"
        >
          <Image
            src="/Branding/logo.png"
            alt="ViLek"
            width={118}
            height={48}
            priority
          />
        </Link>
        <div className="role-dashboard-sidebar-label">WORKSPACE</div>
        <div className="role-dashboard-current">
          <span>{workspace.icon}</span>
          <strong>{workspace.name}</strong>
        </div>
        <nav
          className="role-dashboard-nav"
          aria-label={`${workspace.name} navigation`}
        >
          <a href="#overview" className="is-active">
            <span>◫</span> Overview
          </a>
          {workspace.capabilities.map((capability) => (
            <a href={capability.href} key={capability.title}>
              <span>{capability.icon}</span>
              {capability.title}
            </a>
          ))}
        </nav>
        <div className="role-dashboard-sidebar-bottom">
          <div className="role-dashboard-help">
            <strong>Need a hand?</strong>
            <p>
              Contact your ViLek administrator if you need help with this
              workspace.
            </p>
          </div>
        </div>
      </aside>

      <div className="role-dashboard-main">
        <header className="role-dashboard-topbar">
          <div className="role-dashboard-breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>{workspace.name}</strong>
          </div>
          <div className="role-dashboard-topbar-actions">
            <WorkspaceSwitcher roleCodes={roleCodes} currentRole={roleCode} />
            <ProfileMenu
              firstName={firstName}
              lastName={lastName}
              email={email}
            />
          </div>
        </header>
        <main className="role-dashboard-content" id="overview">
          <div className="role-dashboard-heading">
            <div>
              <span className="role-dashboard-eyebrow">
                {workspace.eyebrow}
              </span>
              <h1>{workspace.heading}</h1>
              <p>{workspace.summary}</p>
            </div>
            <span className="role-dashboard-heading-icon" aria-hidden="true">
              {workspace.icon}
            </span>
          </div>
          <div className="role-dashboard-note">
            <span aria-hidden="true">ⓘ</span>
            <p>
              This workspace layout is ready. Live operational metrics and
              workflows will be connected in the next implementation step.
            </p>
          </div>
          <section
            className="role-dashboard-capabilities"
            aria-label={`${workspace.name} quick links`}
          >
            {workspace.capabilities.map((capability) => (
              <article
                className="role-dashboard-capability"
                key={capability.title}
                id={capability.href.split("#")[1]}
              >
                <span className="role-dashboard-capability-icon">
                  {capability.icon}
                </span>
                <h2>{capability.title}</h2>
                <p>{capability.description}</p>
                <span className="role-dashboard-capability-link">
                  Open section <span aria-hidden="true">→</span>
                </span>
              </article>
            ))}
          </section>
        </main>
        <footer className="role-dashboard-footer">
          <span>© {new Date().getFullYear()} ViLek</span>
          <span>{workspace.name}</span>
        </footer>
      </div>
    </div>
  );
}
