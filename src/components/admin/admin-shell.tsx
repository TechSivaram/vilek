"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { WorkspaceSwitcher } from "@/components/workspaces/workspace-switcher";
import { ProfileMenu } from "@/components/workspaces/profile-menu";

type AdminUser = { firstName: string; lastName: string; email: string };

const groups = [
  {
    label: "Identity & access",
    items: [
      { href: "/admin/users", label: "Users", icon: "♙" },
      { href: "/admin/roles", label: "Role management", icon: "◇" },
      { href: "/admin/user-roles", label: "User role assignments", icon: "⇄" },
      {
        href: "/admin/identity-provider",
        label: "Identity provider",
        icon: "⌘",
      },
    ],
  },
  {
    label: "Finance & expenses",
    items: [
      {
        href: "/admin/expense-categories",
        label: "Expense categories",
        icon: "▤",
      },
      { href: "/admin/currencies", label: "Currencies", icon: "¤" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/settings", label: "System settings", icon: "⚙" },
      { href: "/admin/file-types", label: "Allowed file types", icon: "▧" },
      { href: "/admin/audit-log", label: "Audit log", icon: "≡" },
      { href: "/admin/operations", label: "Operations", icon: "◷" },
    ],
  },
];

export function AdminShell({
  children,
  user,
  roleCodes,
}: {
  children: ReactNode;
  user: AdminUser;
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
    <div className={`admin-app ${collapsed ? "admin-app--collapsed" : ""}`}>
      <button
        className={`admin-drawer-backdrop ${drawerOpen ? "is-visible" : ""}`}
        aria-label="Close navigation"
        onClick={() => setDrawerOpen(false)}
        tabIndex={drawerOpen ? 0 : -1}
      />
      <aside
        className={`admin-sidebar ${drawerOpen ? "is-open" : ""}`}
        aria-label="Administration navigation"
      >
        <div className="admin-brand-row">
          <Link href="/dashboard" className="admin-brand" aria-label="ViLek workspaces">
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

        <div className="admin-sidebar-heading">ADMINISTRATION</div>
        <nav className="admin-nav" aria-label="Admin menu">
          <Link
            className={`admin-nav-link ${pathname === "/admin" ? "is-active" : ""}`}
            href="/admin"
            title="Dashboard"
          >
            <span className="admin-nav-icon">◫</span>
            <span className="admin-nav-label">Dashboard</span>
          </Link>
          {groups.map((group) => (
            <section className="admin-nav-group" key={group.label}>
              <h2 className="admin-nav-group-title">{group.label}</h2>
              {group.items.map((item) => {
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
          ))}
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
              <strong>Administration</strong>
            </div>
          </div>
          <div className="admin-topbar-right">
            <WorkspaceSwitcher roleCodes={roleCodes} currentRole="ADMIN" />
            <ProfileMenu firstName={user.firstName} lastName={user.lastName} email={user.email} />
          </div>
        </header>
        <main className="admin-content">{children}</main>
        <footer className="admin-footer">
          <span>© {new Date().getFullYear()} ViLek</span>
          <span>Administration</span>
        </footer>
      </div>
    </div>
  );
}
