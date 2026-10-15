import Image from "next/image";
import { redirect } from "next/navigation";
import { getLocalAuthenticatedUser } from "@/lib/auth/tscloak";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { claims, expenses, flightCrew, flights, crewMembers, users, currencies, expenseCategories } from "@/lib/db/schema";

const money = (amount: number | string, currency = "INR") => new Intl.NumberFormat("en-IN", {
  style: "currency", currency, maximumFractionDigits: 2,
}).format(Number(amount) || 0);

function shortDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const authenticated = await getLocalAuthenticatedUser();
  if (!authenticated) redirect("/login");
  const [crewCount] = db.select({ count: sql<number>`count(*)` }).from(crewMembers).all();
  const [flightCount] = db.select({ count: sql<number>`count(*)` }).from(flights).all();
  const [expenseTotal] = db.select({ total: sql<number>`coalesce(sum(CAST(${expenses.amount} AS REAL)), 0)` }).from(expenses).all();
  const [claimCount] = db.select({ count: sql<number>`count(*)` }).from(claims).where(eq(claims.status, "SUBMITTED")).all();
  const recentExpenses = db.select({
    id: expenses.id, date: expenses.expenseDate, amount: expenses.amount,
    currency: currencies.code, category: expenseCategories.code, description: expenses.description,
    crewFirst: users.firstName, crewLast: users.lastName,
    flightNumber: flights.flightNumber,
  }).from(expenses)
    .innerJoin(flightCrew, eq(expenses.flightCrewId, flightCrew.id))
    .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
    .innerJoin(users, eq(crewMembers.userId, users.id))
    .innerJoin(flights, eq(flightCrew.flightId, flights.id))
    .innerJoin(currencies, eq(expenses.originalCurrencyId, currencies.id))
    .innerJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .orderBy(desc(expenses.createdAt)).limit(5).all();
  const recentClaims = db.select({ id: claims.id, number: claims.id, status: claims.status, createdAt: claims.createdAt,
    crewFirst: users.firstName, crewLast: users.lastName,
  }).from(claims).innerJoin(flightCrew, eq(claims.flightCrewId, flightCrew.id))
    .innerJoin(crewMembers, eq(flightCrew.crewMemberId, crewMembers.id))
    .innerJoin(users, eq(crewMembers.userId, users.id))
    .orderBy(desc(claims.createdAt)).limit(4).all();

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="ViLek home">
          <Image src="/Branding/logo.png" alt="ViLek" width={138} height={54} priority />
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="navigation" aria-label="Main navigation">
          <a className="nav-link active" href="#overview"><span className="nav-icon">◫</span> Overview</a>
          <a className="nav-link" href="#expenses"><span className="nav-icon">↗</span> Expenses <span className="nav-count">{expenseTotal.total ? "" : "0"}</span></a>
          <a className="nav-link" href="#claims"><span className="nav-icon">▤</span> Claims</a>
          <a className="nav-link" href="#flights"><span className="nav-icon">✈</span> Flights</a>
          <a className="nav-link" href="#crew"><span className="nav-icon">♙</span> Crew members</a>
          <a className="nav-link" href="#reports"><span className="nav-icon">▥</span> Reports</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-mark">?</div><strong>Need a hand?</strong><p>Get help managing your expenses and claims.</p><a href="mailto:support@vilek.app">Contact support ↗</a></div>
          <div className="profile"><div className="avatar">{authenticated.user.firstName.slice(0, 1)}{authenticated.user.lastName.slice(0, 1)}</div><div className="profile-copy"><strong>{authenticated.user.firstName} {authenticated.user.lastName}</strong><span>ViLek user</span></div><form action="/api/auth/logout" method="post"><button type="submit" aria-label="Sign out" title="Sign out">↪</button></form></div>
        </div>
      </aside>

      <section className="main-panel" id="overview">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>Overview</strong></div><div className="top-actions"><span className="today">Thursday, 15 October 2026</span><button className="icon-button" aria-label="Notifications">♧<i /></button><div className="top-avatar">VA</div></div></header>
        <div className="page-content">
          <section className="welcome-row"><div><div className="eyebrow">YOUR FLIGHT EXPENSES, IN ONE PLACE</div><h1>Good morning, {authenticated.user.firstName} <span>✦</span></h1><p className="subheading">Here’s what’s happening across your crew expenses and claims.</p></div><a className="primary-button" href="#expenses"><span>＋</span> Record an expense</a></section>

          <section className="stats-grid" aria-label="Key metrics">
            <article className="stat-card"><div className="stat-top"><span>Total expenses</span><span className="stat-icon teal">↗</span></div><div className="stat-value">{money(expenseTotal.total)}</div><div className="stat-foot"><span className="stat-dot teal-dot" /> All recorded expenses</div></article>
            <article className="stat-card"><div className="stat-top"><span>Active flights</span><span className="stat-icon blue">✈</span></div><div className="stat-value">{flightCount.count.toString().padStart(2, "0")}</div><div className="stat-foot"><span className="stat-dot blue-dot" /> Flights in your records</div></article>
            <article className="stat-card"><div className="stat-top"><span>Claims to review</span><span className="stat-icon amber">▤</span></div><div className="stat-value">{claimCount.count.toString().padStart(2, "0")}</div><div className="stat-foot"><span className="stat-dot amber-dot" /> Awaiting review</div></article>
            <article className="stat-card"><div className="stat-top"><span>Crew members</span><span className="stat-icon violet">♙</span></div><div className="stat-value">{crewCount.count.toString().padStart(2, "0")}</div><div className="stat-foot"><span className="stat-dot violet-dot" /> Crew in your directory</div></article>
          </section>

          <section className="content-grid">
            <article className="panel expense-panel" id="expenses"><div className="panel-heading"><div><h2>Recent expenses</h2><p>Your crew’s latest recorded expenses</p></div><a href="#expenses" className="text-link">View all <span>→</span></a></div>
              {recentExpenses.length ? <div className="table-wrap"><table><thead><tr><th>EXPENSE</th><th>CREW MEMBER</th><th>DATE</th><th>AMOUNT</th></tr></thead><tbody>{recentExpenses.map((expense) => <tr key={expense.id}><td><div className="expense-name"><span className="expense-type-icon">{expense.category === "MEALS" ? "♨" : expense.category === "TRANSPORT" ? "↗" : "▧"}</span><span><strong>{expense.description || (expense.category || "EXPENSE").replaceAll("_", " ").toLowerCase()}</strong><small>{expense.flightNumber} · {(expense.category || "EXPENSE").replaceAll("_", " ")}</small></span></div></td><td>{expense.crewFirst} {expense.crewLast}</td><td>{shortDate(expense.date)}</td><td className="amount-cell">{money(expense.amount, expense.currency)}</td></tr>)}</tbody></table></div> : <div className="empty-state"><div className="empty-icon">↗</div><strong>No expenses yet</strong><p>When your crew records expenses, they’ll show up here.</p><a href="#expenses" className="text-link">Record your first expense →</a></div>}
            </article>

            <article className="panel claims-panel" id="claims"><div className="panel-heading"><div><h2>Claims overview</h2><p>Keep track of reimbursements</p></div><a href="#claims" className="text-link">View all <span>→</span></a></div>
              {recentClaims.length ? <div className="claim-list">{recentClaims.map((claim) => <div className="claim-item" key={claim.id}><div className="claim-icon">▤</div><div className="claim-info"><strong>{claim.number}</strong><span>{claim.crewFirst} {claim.crewLast}</span></div><span className={`status status-${claim.status.toLowerCase()}`}>{claim.status.charAt(0) + claim.status.slice(1).toLowerCase()}</span></div>)}</div> : <div className="empty-state compact"><div className="empty-icon">▤</div><strong>No claims to show</strong><p>Claims will appear here as they’re created.</p></div>}
              <div className="claims-footer"><span>Have expenses ready to claim?</span><a href="#claims">Create a claim <span>→</span></a></div>
            </article>
          </section>

          <section className="bottom-banner"><div className="banner-plane">✈</div><div><strong>More time for the journey. Less time on paperwork.</strong><p>Keep receipts, expenses and reimbursements organised in one crew-friendly workspace.</p></div><a href="#reports">Explore reports <span>→</span></a><div className="banner-orbit orbit-one"/><div className="banner-orbit orbit-two"/></section>
          <footer className="footer"><span>© 2026 ViLek. Built for the people who keep us flying.</span><span><i className="footer-dot" /> All systems operational</span></footer>
        </div>
      </section>
    </main>
  );
}
