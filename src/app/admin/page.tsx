import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, roles, expenseCategories, currencies } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default function AdminDashboard() {
  const userCount =
    db
      .select({ value: sql<number>`count(*)` })
      .from(users)
      .get()?.value ?? 0;
  const roleCount =
    db
      .select({ value: sql<number>`count(*)` })
      .from(roles)
      .where(sql`${roles.isActive} = 1`)
      .get()?.value ?? 0;
  const categoryCount =
    db
      .select({ value: sql<number>`count(*)` })
      .from(expenseCategories)
      .where(sql`${expenseCategories.isActive} = 1`)
      .get()?.value ?? 0;
  const currencyCount =
    db
      .select({ value: sql<number>`count(*)` })
      .from(currencies)
      .where(sql`${currencies.isActive} = 1`)
      .get()?.value ?? 0;

  const metrics = [
    {
      label: "Users",
      value: userCount,
      note: "Accounts in ViLek",
      icon: "♙",
      href: "/admin/users",
      tone: "teal",
    },
    {
      label: "Active roles",
      value: roleCount,
      note: "Application roles",
      icon: "◇",
      href: "/admin/roles",
      tone: "blue",
    },
  ];

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <div className="admin-eyebrow">ADMINISTRATION</div>
          <h1>Dashboard</h1>
          <p>Manage users, access, finance reference data, and system configuration.</p>
        </div>
      </section>

      <section className="admin-metrics-grid" aria-label="Administration metrics">
        {metrics.map((metric) => (
          <Link className="admin-metric-card" href={metric.href} key={metric.label}>
            <div className="admin-metric-top">
              <span>{metric.label}</span>
              <span className={`admin-metric-icon tone-${metric.tone}`}>{metric.icon}</span>
            </div>
            <strong className="admin-metric-value">{metric.value.toLocaleString("en-IN")}</strong>
            <span className="admin-metric-note">{metric.note}</span>
          </Link>
        ))}
      </section>

      <div className="admin-dashboard-grid">
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Quick actions</h2>
              <p>Common administration tasks</p>
            </div>
          </div>
          <div className="admin-quick-actions">
            <Link href="/admin/users">
              <span className="admin-action-icon">♙</span>
              <span>
                <strong>Manage users</strong>
                <small>Review local accounts and access</small>
              </span>
              <b>→</b>
            </Link>
            <Link href="/admin/roles">
              <span className="admin-action-icon">◇</span>
              <span>
                <strong>Review roles</strong>
                <small>Understand application permissions</small>
              </span>
              <b>→</b>
            </Link>
            <Link href="/admin/identity-provider">
              <span className="admin-action-icon">⌘</span>
              <span>
                <strong>Identity provider</strong>
                <small>View TSCloak integration information</small>
              </span>
              <b>→</b>
            </Link>
            <Link href="/admin/settings">
              <span className="admin-action-icon">⚙</span>
              <span>
                <strong>System settings</strong>
                <small>Review application configuration</small>
              </span>
              <b>→</b>
            </Link>
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Reference data</h2>
              <p>Current active finance reference records</p>
            </div>
          </div>
          <div className="admin-reference-list">
            <Link href="/admin/expense-categories">
              <span>Expense categories</span>
              <strong>{categoryCount}</strong>
              <b>→</b>
            </Link>
            <Link href="/admin/currencies">
              <span>Currencies</span>
              <strong>{currencyCount}</strong>
              <b>→</b>
            </Link>
          </div>
          <div className="admin-info-note">
            <span>i</span>
            <p>
              Flight records, crew members, designations, airlines, and airports are maintained in
              the Flight Operations workspace.
            </p>
          </div>
          <div className="admin-quick-actions">
            <Link href="/operations">
              <span className="admin-action-icon">✈</span>
              <span>
                <strong>Open Flight Operations</strong>
                <small>Manage flights, crew, airlines, and airports</small>
              </span>
              <b>→</b>
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
