"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { WorkspaceSwitcher } from "@/components/workspaces/workspace-switcher";
import { ProfileMenu } from "@/components/workspaces/profile-menu";

type OperationsUser = { firstName: string; lastName: string; email: string };

const items = [
  { href: "/operations/flights", label: "Flights", icon: "✈" },
  { href: "/operations/flight-crew", label: "Flight crew", icon: "♧" },
  { href: "/operations/crew-members", label: "Crew members", icon: "♧" },
  {
    href: "/operations/crew-designations",
    label: "Crew designations",
    icon: "✳",
  },
  { href: "/operations/airlines", label: "Airlines", icon: "⇢" },
  { href: "/operations/airports", label: "Airports", icon: "⌖" },
];

const configurationItems = [
  {
    href: "/operations/maintenance/crew-designation-assignments",
    label: "Crew designation assignments",
    group: "Crew eligibility",
    icon: "♧",
  },
  {
    href: "/operations/maintenance/qualification-types",
    label: "Qualification types",
    group: "Qualifications",
    icon: "✓",
  },
  {
    href: "/operations/maintenance/crew-qualifications",
    label: "Crew qualifications",
    group: "Qualifications",
    icon: "✓",
  },
  {
    href: "/operations/maintenance/designation-qualification-requirements",
    label: "Designation requirements",
    group: "Qualifications",
    icon: "✓",
  },
  {
    href: "/operations/maintenance/crew-complement-defaults",
    label: "Default crew complement",
    group: "Crew complement",
    icon: "⊞",
  },
  {
    href: "/operations/maintenance/flight-crew-requirements",
    label: "Flight-specific requirements",
    group: "Crew complement",
    icon: "⊞",
  },
  {
    href: "/operations/maintenance/flight-operations-settings",
    label: "Flight Operations settings",
    group: "Operational settings",
    icon: "⚙",
  },
  {
    href: "/operations/maintenance/audit-retention-policy",
    label: "Audit retention policy",
    group: "Operational settings",
    icon: "⚙",
  },
  {
    href: "/operations/maintenance/qualification-alerts",
    label: "Qualification alerts",
    group: "Alerts & audit",
    icon: "≋",
  },
  {
    href: "/operations/maintenance/flight-crew-audit",
    label: "Flight crew audit",
    group: "Alerts & audit",
    icon: "≋",
  },
  {
    href: "/operations/maintenance/batch-requests",
    label: "Batch requests",
    group: "Alerts & audit",
    icon: "≋",
  },
  {
    href: "/operations/maintenance/audit-exports",
    label: "Audit export history",
    group: "Alerts & audit",
    icon: "≋",
  },
  {
    href: "/operations/maintenance/audit-retention-actions",
    label: "Retention actions",
    group: "Alerts & audit",
    icon: "≋",
  },
];

export function OperationsShell({
  children,
  user,
  roleCodes,
}: {
  children: ReactNode;
  user: OperationsUser;
  roleCodes: string[];
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => setDrawerOpen(false), [pathname]);
  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  return (
    <div className={`admin-app ${collapsed ? "admin-app--collapsed" : ""} operations-app`}>
      <button
        className={`admin-drawer-backdrop ${drawerOpen ? "is-visible" : ""}`}
        aria-label="Close navigation"
        onClick={() => setDrawerOpen(false)}
        tabIndex={drawerOpen ? 0 : -1}
      />
      <aside
        className={`admin-sidebar ${drawerOpen ? "is-open" : ""}`}
        aria-label="Flight Operations navigation"
      >
        <div className="admin-brand-row">
          <Link href="/operations" className="admin-brand" aria-label="ViLek Flight Operations">
            <Image src="/Branding/logo.png" alt="ViLek" width={118} height={46} priority />
          </Link>
          <button
            className="admin-sidebar-collapse"
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            ‹
          </button>
        </div>
        <div className="admin-sidebar-heading">FLIGHT OPERATIONS</div>
        <nav className="admin-nav" aria-label="Flight Operations menu">
          <Link
            className={`admin-nav-link ${pathname === "/operations" ? "is-active" : ""}`}
            href="/operations"
            title="Overview"
          >
            <span className="admin-nav-icon">◫</span>
            <span className="admin-nav-label">Overview</span>
          </Link>
          <section className="admin-nav-group">
            <h2 className="admin-nav-group-title">Flight operations</h2>
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  className={`admin-nav-link ${active ? "is-active" : ""}`}
                  href={item.href}
                  title={item.label}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="admin-nav-icon">{item.icon}</span>
                  <span className="admin-nav-label">{item.label}</span>
                </Link>
              );
            })}
          </section>
          <section className="admin-nav-group ops-configuration-nav">
            <h2 className="admin-nav-group-title">Configuration &amp; audit</h2>
            {configurationItems.map((item, index) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const showGroup = index === 0 || configurationItems[index - 1].group !== item.group;
              return (
                <div key={item.href}>
                  {showGroup && (
                    <h3 className="admin-nav-group-title ops-nav-feature-group">{item.group}</h3>
                  )}
                  <Link
                    className={`admin-nav-link ops-nav-sub-link ${active ? "is-active" : ""}`}
                    href={item.href}
                    title={item.label}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="admin-nav-icon">{item.icon}</span>
                    <span className="admin-nav-label">{item.label}</span>
                  </Link>
                </div>
              );
            })}
          </section>
        </nav>
        <div className="admin-sidebar-footer">
          <Link href="/dashboard" className="admin-back-workspace">
            <span className="admin-nav-icon">←</span>
            <span className="admin-nav-label">All workspaces</span>
          </Link>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              className="admin-menu-toggle"
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              aria-expanded={drawerOpen}
            >
              ☰
            </button>
            <div className="admin-breadcrumb">
              <Link href="/dashboard">Workspace</Link>
              <span>/</span>
              <strong>Flight Operations</strong>
            </div>
          </div>
          <div className="admin-topbar-right">
            <WorkspaceSwitcher roleCodes={roleCodes} currentRole="FLIGHT_OPERATIONS_MANAGER" />
            <ProfileMenu firstName={user.firstName} lastName={user.lastName} email={user.email} />
          </div>
        </header>
        <main className="admin-content">{children}</main>
        <footer className="admin-footer">
          <span>© {new Date().getFullYear()} ViLek</span>
          <span>Flight Operations</span>
        </footer>
      </div>
    </div>
  );
}
