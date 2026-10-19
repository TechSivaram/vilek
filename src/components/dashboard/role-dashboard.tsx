import Image from "next/image";
import Link from "next/link";

export type DashboardAction = { title: string; description: string; href: string; icon: string };
export type DashboardMetric = { label: string; value: string; detail: string; icon: string };

export function RoleDashboard({
  user,
  roleLabel,
  eyebrow,
  title,
  description,
  metrics,
  actions,
}: {
  user: { firstName: string; lastName: string; email: string };
  roleLabel: string;
  eyebrow: string;
  title: string;
  description: string;
  metrics: DashboardMetric[];
  actions: DashboardAction[];
}) {
  const initials = `${user.firstName.slice(0, 1)}${user.lastName.slice(0, 1)}`.toUpperCase();
  return (
    <main className="role-dashboard">
      <aside className="role-sidebar">
        <Link href="/" className="role-brand" aria-label="ViLek home">
          <Image src="/Branding/logo.png" alt="ViLek" width={126} height={50} priority />
        </Link>
        <p className="role-sidebar-label">WORKSPACE</p>
        <Link href="/" className="role-nav-item role-nav-item-active"><span>◫</span> Dashboard</Link>
        <div className="role-sidebar-bottom">
          <div className="role-user-avatar">{initials}</div>
          <div className="role-user-copy"><strong>{user.firstName} {user.lastName}</strong><span>{roleLabel}</span></div>
          <form action="/api/auth/logout" method="post"><button className="role-logout" type="submit" aria-label="Sign out" title="Sign out">↪</button></form>
        </div>
      </aside>
      <section className="role-main">
        <header className="role-topbar"><span>Workspace <b>/</b> {roleLabel}</span><span className="role-topbar-user"><span className="role-user-avatar">{initials}</span>{user.firstName} {user.lastName}</span></header>
        <div className="role-content">
          <div className="role-welcome"><div><p className="role-eyebrow">{eyebrow}</p><h1>{title}, {user.firstName} <span>✦</span></h1><p>{description}</p></div><span className="role-pill">{roleLabel}</span></div>
          <section className="role-metrics" aria-label="Dashboard overview">
            {metrics.map((metric) => <article className="role-metric" key={metric.label}><div className="role-metric-heading"><span>{metric.label}</span><span className="role-metric-icon">{metric.icon}</span></div><strong>{metric.value}</strong><small>{metric.detail}</small></article>)}
          </section>
          <section className="role-actions-section"><div className="role-section-heading"><div><h2>Quick access</h2><p>Common tasks for your role</p></div></div><div className="role-actions-grid">{actions.map((action) => <div className="role-action-card" key={action.title}><span className="role-action-icon">{action.icon}</span><span className="role-action-copy"><strong>{action.title}</strong><small>{action.description}</small></span></div>)}</div></section>
          <div className="role-note"><span>i</span><p>This dashboard is tailored to your ViLek role. Available tasks are governed by your assigned permissions.</p></div>
        </div>
      </section>
    </main>
  );
}
