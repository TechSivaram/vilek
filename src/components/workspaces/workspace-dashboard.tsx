import Image from "next/image";
import Link from "next/link";
import { WorkspaceSwitcher } from "@/components/workspaces/workspace-switcher";
import { ProfileMenu } from "@/components/workspaces/profile-menu";
import { getWorkspace } from "@/lib/workspaces";
import { CrewFlightsOverviewCard } from "@/components/workspaces/crew-flights-overview-card";
import { CrewExpensesOverviewCard } from "@/components/workspaces/crew-expenses-overview-card";
import { CrewClaimsOverviewCard } from "@/components/workspaces/crew-claims-overview-card";
import { CrewBankAccounts } from "@/components/crew/bank-accounts";
import { ApproverWorkspace } from "@/components/approver/approver-workspace";
import { FinanceWorkspace } from "@/components/finance/finance-workspace";
import { FinanceBankAccountReview } from "@/components/finance/bank-account-review";
import {
  CrewDashboardShell,
  CrewMobileNavToggle,
} from "@/components/workspaces/crew-dashboard-shell";

export function WorkspaceDashboard({
  roleCode,
  roleCodes,
  firstName,
  lastName,
  email,
  approverView = "dashboard",
  financeView = "overview",
  crewView = "dashboard",
}: {
  roleCode: string;
  roleCodes: string[];
  firstName: string;
  lastName: string;
  email: string;
  approverView?: "dashboard" | "pending" | "history";
  financeView?: "overview" | "approved-claims" | "payment-history" | "bank-accounts";
  crewView?: "dashboard" | "bank-accounts";
}) {
  const workspace = getWorkspace(roleCode);
  if (!workspace) return null;
  const initials = `${firstName.slice(0, 1)}${lastName.slice(0, 1)}`.toUpperCase();

  return (
    <CrewDashboardShell
      className={`role-dashboard--${workspace.code.toLowerCase()}`}
      sidebar={
        <>
          <Link href={workspace.href} className="role-dashboard-brand" aria-label="ViLek dashboard">
            <Image src="/Branding/logo.png" alt="ViLek" width={118} height={48} priority />
          </Link>
          <div className="role-dashboard-sidebar-label">WORKSPACE</div>
          <div className="role-dashboard-current">
            <span>{workspace.icon}</span>
            <strong>{workspace.name}</strong>
          </div>
          <nav className="role-dashboard-nav" aria-label={`${workspace.name} navigation`}>
            <Link
              href={workspace.href}
              className={
                workspace.code === "APPROVER"
                  ? approverView === "dashboard"
                    ? "is-active"
                    : undefined
                  : workspace.code === "FINANCE"
                    ? financeView === "overview"
                      ? "is-active"
                      : undefined
                    : "is-active"
              }
            >
              <span className="crew-nav-icon">◫</span>
              <span className="crew-nav-label">Overview</span>
            </Link>
            {workspace.capabilities.map((capability) => {
              const isActive =
                (workspace.code === "APPROVER" &&
                  ((approverView === "pending" && capability.title === "Pending approvals") ||
                    (approverView === "history" && capability.title === "Review history"))) ||
                (workspace.code === "CREW" &&
                  crewView === "bank-accounts" &&
                  capability.title === "Bank accounts") ||
                (workspace.code === "FINANCE" &&
                  ((financeView === "approved-claims" && capability.title === "Approved claims") ||
                    (financeView === "payment-history" && capability.title === "Payment history") ||
                    (financeView === "bank-accounts" && capability.title === "Bank accounts")));
              return (
                <Link
                  href={capability.href}
                  key={capability.title}
                  className={isActive ? "is-active" : undefined}
                >
                  <span className="crew-nav-icon">{capability.icon}</span>
                  <span className="crew-nav-label">{capability.title}</span>
                </Link>
              );
            })}
          </nav>
          <div className="role-dashboard-sidebar-bottom">
            <div className="role-dashboard-help">
              <strong>Need a hand?</strong>
              <p>Contact your ViLek administrator if you need help with this workspace.</p>
            </div>
          </div>
        </>
      }
    >
      <header className="role-dashboard-topbar">
        <CrewMobileNavToggle />
        <Link
          href={workspace.href}
          className="role-dashboard-mobile-brand"
          aria-label="ViLek dashboard"
        >
          <Image src="/Branding/logo.png" alt="ViLek" width={40} height={40} priority />
        </Link>
        <div className="role-dashboard-breadcrumb">
          <span>Workspace</span>
          <span>/</span>
          <strong>{workspace.name}</strong>
        </div>
        <div className="role-dashboard-topbar-actions">
          <WorkspaceSwitcher roleCodes={roleCodes} currentRole={roleCode} />
          <ProfileMenu firstName={firstName} lastName={lastName} email={email} />
        </div>
      </header>
      <main className="role-dashboard-content" id="overview">
        <div className="role-dashboard-heading">
          <div>
            <span className="role-dashboard-eyebrow">
              {workspace.code === "APPROVER" && approverView !== "dashboard"
                ? approverView === "pending"
                  ? "ACTION REQUIRED · CLAIM REVIEW"
                  : "DECISION RECORD · AUDIT HISTORY"
                : workspace.code === "CREW" && crewView === "bank-accounts"
                  ? "BANKING · BENEFICIARY DETAILS"
                  : workspace.code === "FINANCE" && financeView !== "overview"
                    ? financeView === "approved-claims"
                      ? "PAYMENT QUEUE · REIMBURSEMENTS"
                      : financeView === "payment-history"
                        ? "TRANSACTION REGISTER · AUDIT TRAIL"
                        : "BENEFICIARY CONTROL · VERIFICATION"
                    : workspace.eyebrow}
            </span>
            <h1>
              {workspace.code === "APPROVER" && approverView !== "dashboard"
                ? approverView === "pending"
                  ? "Pending approvals"
                  : "Review history"
                : workspace.code === "CREW" && crewView === "bank-accounts"
                  ? "Bank accounts"
                  : workspace.code === "FINANCE" && financeView !== "overview"
                    ? financeView === "approved-claims"
                      ? "Approved claims"
                      : financeView === "payment-history"
                        ? "Payment history"
                        : "Bank accounts"
                    : workspace.heading}
            </h1>
            <p>
              {workspace.code === "APPROVER" && approverView !== "dashboard"
                ? approverView === "pending"
                  ? "Review submitted claims, supporting receipts and record an approval decision."
                  : "Search and review previously approved or returned claims and their recorded comments."
                : workspace.code === "CREW" && crewView === "bank-accounts"
                  ? "Register beneficiary accounts, track verification and choose your primary reimbursement account."
                  : workspace.code === "FINANCE" && financeView !== "overview"
                    ? financeView === "approved-claims"
                      ? "Review eligible approved claims and record single or batch reimbursements."
                      : financeView === "payment-history"
                        ? "Track completed, processing and failed reimbursement transactions."
                        : "Review crew beneficiary account verification."
                    : workspace.summary}
            </p>
          </div>
          <span className="role-dashboard-heading-icon" aria-hidden="true">
            {workspace.icon}
          </span>
        </div>
        {workspace.code === "FINANCE" ? (
          financeView === "bank-accounts" ? (
            <FinanceBankAccountReview />
          ) : (
            <FinanceWorkspace view={financeView} />
          )
        ) : workspace.code === "APPROVER" ? (
          <ApproverWorkspace view={approverView} />
        ) : workspace.code === "CREW" && crewView === "bank-accounts" ? (
          <CrewBankAccounts />
        ) : (
          <>
            {workspace.code !== "CREW" && (
              <div className="role-dashboard-note">
                <span aria-hidden="true">ⓘ</span>
                <p>
                  This workspace layout is ready. Live operational metrics and workflows will be
                  connected in the next implementation step.
                </p>
              </div>
            )}
            <section
              className="role-dashboard-capabilities"
              aria-label={`${workspace.name} quick links`}
            >
              {workspace.capabilities.map((capability) =>
                workspace.code === "CREW" && capability.title === "My flights" ? (
                  <CrewFlightsOverviewCard key={capability.title} />
                ) : workspace.code === "CREW" && capability.title === "My expenses" ? (
                  <CrewExpensesOverviewCard key={capability.title} />
                ) : workspace.code === "CREW" && capability.title === "My claims" ? (
                  <CrewClaimsOverviewCard key={capability.title} />
                ) : (
                  <Link
                    className="role-dashboard-capability"
                    key={capability.title}
                    href={capability.href}
                    id={capability.href.split("#")[1]}
                  >
                    <span className="role-dashboard-capability-icon">{capability.icon}</span>
                    <h2>{capability.title}</h2>
                    <p>{capability.description}</p>
                    <span className="role-dashboard-capability-link">
                      Open section <span aria-hidden="true">→</span>
                    </span>
                  </Link>
                ),
              )}
            </section>
          </>
        )}
      </main>
      <footer className="role-dashboard-footer">
        <span>© {new Date().getFullYear()} ViLek</span>
        <span>{workspace.name}</span>
      </footer>
    </CrewDashboardShell>
  );
}
