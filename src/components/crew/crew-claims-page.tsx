"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProfileMenu } from "@/components/workspaces/profile-menu";
import { WorkspaceSwitcher } from "@/components/workspaces/workspace-switcher";
import "./crew-claims.css";

type Expense = {
  id: string;
  amount: string;
  expenseDate: string;
  location: string | null;
  description: string;
  category: string;
  currencyCode: string;
  linkedClaimId: string | null;
  isAttachedToThisClaim: boolean;
  isClaimed: boolean;
};
type Assignment = {
  assignmentId: string;
  flightId: string;
  flightNumber: string;
  scheduledDeparture: string;
  scheduledArrival: string;
  flightStatus: string;
  airlineName: string;
  airlineIata: string;
  originCode: string;
  originCity: string;
  destinationCode: string;
  destinationCity: string;
  designation: string;
  claimId: string | null;
  claimStatus: string | null;
  claimCreatedAt: string | null;
  expenses: Expense[];
  comments: {
    id: string;
    comment: string;
    createdAt: string;
    authorFirstName: string;
    authorLastName: string;
  }[];
};

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
function money(value: string, currency: string) {
  const amount = Number(value);
  return `${currency} ${Number.isFinite(amount) ? amount.toFixed(2) : value}`;
}

export function CrewClaimsPage({
  roleCodes,
  firstName,
  lastName,
  email,
}: {
  roleCodes: string[];
  firstName: string;
  lastName: string;
  email: string;
}) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async (keepSelection = true) => {
    setLoading(true);
    try {
      const response = await fetch("/api/crew/claims", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to load claims.");
      const rows = payload.assignments as Assignment[];
      setAssignments(rows);
      setSelectedId((current) =>
        keepSelection && rows.some((row) => row.assignmentId === current)
          ? current
          : (rows[0]?.assignmentId ?? ""),
      );
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load claims.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  const selected = useMemo(
    () => assignments.find((item) => item.assignmentId === selectedId) ?? null,
    [assignments, selectedId],
  );
  const attachedExpenses =
    selected?.expenses.filter((expense) => expense.isAttachedToThisClaim) ?? [];
  const eligibleExpenses = selected?.expenses.filter((expense) => !expense.isClaimed) ?? [];
  const canEditClaim =
    selected?.claimStatus === "DRAFT" || selected?.claimStatus === "REVISION_REQUIRED";
  const totalsByCurrency = attachedExpenses.reduce<Record<string, number>>((totals, expense) => {
    totals[expense.currencyCode] =
      (totals[expense.currencyCode] ?? 0) + (Number(expense.amount) || 0);
    return totals;
  }, {});
  const totalLabel = Object.entries(totalsByCurrency)
    .map(([currency, amount]) => money(amount.toFixed(2), currency))
    .join(" · ");

  async function mutate(url: string, method: "POST" | "PATCH", body: unknown, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "The request could not be completed.");
      setNotice(success);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The request could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  async function createDraft() {
    if (!selected) return;
    await mutate(
      "/api/crew/claims",
      "POST",
      { assignmentId: selected.assignmentId },
      "Draft claim created.",
    );
  }
  async function claimAction(action: string, expenseId?: string) {
    if (!selected?.claimId) return;
    await mutate(
      `/api/crew/claims/${selected.claimId}`,
      "PATCH",
      { action, ...(expenseId ? { expenseId } : {}) },
      action === "submit"
        ? "Claim submitted for review."
        : action === "reopen"
          ? "Rejected claim reopened. You can now correct its expenses."
          : action === "add-expense"
            ? "Expense added to claim."
            : "Expense removed from claim.",
    );
  }

  return (
    <div className="role-dashboard role-dashboard--crew crew-claims-shell">
      <aside className="role-dashboard-sidebar">
        <Link href="/crew" className="role-dashboard-brand" aria-label="ViLek dashboard">
          <Image src="/Branding/logo.png" alt="ViLek" width={118} height={48} priority />
        </Link>
        <div className="role-dashboard-sidebar-label">WORKSPACE</div>
        <div className="role-dashboard-current">
          <span>♙</span>
          <strong>Crew workspace</strong>
        </div>
        <nav className="role-dashboard-nav" aria-label="Crew navigation">
          <Link href="/crew">
            <span>◫</span> Overview
          </Link>
          <Link href="/crew/flights">
            <span>✈</span> My flights
          </Link>
          <Link href="/crew/expenses">
            <span>₹</span> My expenses
          </Link>
          <Link href="/crew/claims" className="is-active">
            <span>▤</span> My claims
          </Link>
        </nav>
        <div className="role-dashboard-sidebar-bottom">
          <div className="role-dashboard-help">
            <strong>Need a hand?</strong>
            <p>Contact your ViLek administrator if you need help with this workspace.</p>
          </div>
        </div>
      </aside>
      <div className="role-dashboard-main">
        <header className="role-dashboard-topbar">
          <div className="role-dashboard-breadcrumb">
            <Link href="/crew">Crew workspace</Link>
            <span>/</span>
            <strong>My claims</strong>
          </div>
          <div className="role-dashboard-topbar-actions">
            <WorkspaceSwitcher roleCodes={roleCodes} currentRole="CREW" />
            <ProfileMenu firstName={firstName} lastName={lastName} email={email} />
          </div>
        </header>
        <main className="role-dashboard-content crew-claims-content">
          <div className="role-dashboard-heading">
            <div>
              <span className="role-dashboard-eyebrow">EXPENSES · REIMBURSEMENTS</span>
              <h1>My claims</h1>
              <p>Create and manage one expense claim for each of your flight assignments.</p>
            </div>
            <span className="role-dashboard-heading-icon" aria-hidden="true">
              ▤
            </span>
          </div>
          {error && (
            <div className="crew-claims-alert crew-claims-alert--error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="crew-claims-alert crew-claims-alert--success" role="status">
              {notice}
            </div>
          )}
          <div className="crew-claims-layout">
            <section className="crew-claims-panel crew-claims-assignments">
              <div className="crew-claims-panel-heading">
                <div>
                  <h2>Flight assignments</h2>
                  <p>Select a flight to view its claim and expenses.</p>
                </div>
                <span>{assignments.length}</span>
              </div>
              {loading ? (
                <div className="crew-claims-empty">Loading your assignments…</div>
              ) : assignments.length === 0 ? (
                <div className="crew-claims-empty">
                  No flight assignments are linked to your crew profile yet.
                </div>
              ) : (
                <div className="crew-claims-assignment-list">
                  {assignments.map((item) => (
                    <button
                      type="button"
                      key={item.assignmentId}
                      className={`crew-claims-assignment ${selectedId === item.assignmentId ? "is-selected" : ""}`}
                      onClick={() => {
                        setSelectedId(item.assignmentId);
                        setError("");
                        setNotice("");
                      }}
                    >
                      <span className="crew-claims-flight">
                        {item.airlineIata} {item.flightNumber}
                      </span>
                      <span className="crew-claims-route">
                        {item.originCode} <span>→</span> {item.destinationCode}
                      </span>
                      <span className="crew-claims-date">{dateLabel(item.scheduledDeparture)}</span>
                      <span
                        className={`crew-claims-status ${item.claimStatus === "SUBMITTED" ? "is-submitted" : item.claimStatus === "DRAFT" ? "is-draft" : "is-none"}`}
                      >
                        {item.claimStatus ?? "No claim"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
            <section className="crew-claims-panel crew-claims-detail">
              {!selected ? (
                <div className="crew-claims-empty">Select a flight assignment to get started.</div>
              ) : (
                <>
                  <div className="crew-claims-detail-heading">
                    <div>
                      <span className="role-dashboard-eyebrow">
                        {selected.airlineName} · {selected.designation}
                      </span>
                      <h2>
                        {selected.airlineIata} {selected.flightNumber}
                      </h2>
                      <p>
                        {selected.originCity} ({selected.originCode}) → {selected.destinationCity} (
                        {selected.destinationCode})
                      </p>
                      <small>{dateLabel(selected.scheduledDeparture)}</small>
                    </div>
                    <span
                      className={`crew-claims-status ${selected.claimStatus === "SUBMITTED" ? "is-submitted" : selected.claimStatus === "DRAFT" || selected.claimStatus === "REVISION_REQUIRED" ? "is-draft" : selected.claimStatus === "REJECTED" ? "is-rejected" : "is-none"}`}
                    >
                      {selected.claimStatus ?? "No claim"}
                    </span>
                  </div>
                  {!selected.claimId ? (
                    <div className="crew-claims-start">
                      <p>No claim has been created for this assignment.</p>
                      <button
                        type="button"
                        className="crew-claims-primary"
                        disabled={busy}
                        onClick={createDraft}
                      >
                        Create draft claim
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="crew-claims-expense-heading">
                        <div>
                          <h3>Claim expenses</h3>
                          <p>
                            {attachedExpenses.length} expense
                            {attachedExpenses.length === 1 ? "" : "s"} attached
                          </p>
                        </div>
                        <strong>{totalLabel || "—"}</strong>
                      </div>
                      {attachedExpenses.length === 0 ? (
                        <div className="crew-claims-empty crew-claims-empty--compact">
                          No expenses added yet. You can save an empty draft and add expenses later.
                        </div>
                      ) : (
                        <div className="crew-claims-expense-list">
                          {attachedExpenses.map((expense) => (
                            <div className="crew-claims-expense" key={expense.id}>
                              <div>
                                <strong>{expense.description}</strong>
                                <span>
                                  {expense.category} · {dateLabel(expense.expenseDate)}
                                  {expense.location ? ` · ${expense.location}` : ""}
                                </span>
                              </div>
                              <strong>{money(expense.amount, expense.currencyCode)}</strong>
                              {canEditClaim && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => claimAction("remove-expense", expense.id)}
                                  aria-label={`Remove ${expense.description}`}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {canEditClaim && (
                        <div className="crew-claims-eligible">
                          <h3>Available expenses</h3>
                          {eligibleExpenses.length === 0 ? (
                            <p className="crew-claims-muted">
                              There are no unclaimed expenses for this assignment.
                            </p>
                          ) : (
                            eligibleExpenses.map((expense) => (
                              <div className="crew-claims-expense" key={expense.id}>
                                <div>
                                  <strong>{expense.description}</strong>
                                  <span>
                                    {expense.category} · {dateLabel(expense.expenseDate)}
                                    {expense.location ? ` · ${expense.location}` : ""}
                                  </span>
                                </div>
                                <strong>{money(expense.amount, expense.currencyCode)}</strong>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => claimAction("add-expense", expense.id)}
                                >
                                  Add
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                      {canEditClaim ? (
                        <div className="crew-claims-submit">
                          <span>
                            {selected.claimStatus === "REVISION_REQUIRED"
                              ? "Correct the rejected claim and resubmit it for review."
                              : "Review the expenses before submitting. A submitted claim can no longer be edited."}
                          </span>
                          <button
                            type="button"
                            className="crew-claims-primary"
                            disabled={busy || attachedExpenses.length === 0}
                            onClick={() => claimAction("submit")}
                          >
                            Submit claim
                          </button>
                        </div>
                      ) : selected.claimStatus === "REJECTED" ? (
                        <div className="crew-claims-submit">
                          <span>
                            This claim was rejected. Review the comments below, then reopen it to
                            make corrections.
                          </span>
                          <button
                            type="button"
                            className="crew-claims-primary"
                            disabled={busy}
                            onClick={() => claimAction("reopen")}
                          >
                            Reopen for correction
                          </button>
                        </div>
                      ) : (
                        <p className="crew-claims-submitted-note">
                          This claim is {selected.claimStatus?.toLowerCase().replaceAll("_", " ")}{" "}
                          and is read-only.
                        </p>
                      )}
                      {selected.comments.length > 0 && (
                        <section className="crew-claims-comments" aria-label="Claim history">
                          <h3>Claim history &amp; comments</h3>
                          {selected.comments.map((comment) => (
                            <article key={comment.id} className="crew-claims-comment">
                              <p>{comment.comment}</p>
                              <small>
                                {comment.authorFirstName} {comment.authorLastName} ·{" "}
                                {dateLabel(comment.createdAt)}
                              </small>
                            </article>
                          ))}
                        </section>
                      )}
                    </>
                  )}
                </>
              )}
            </section>
          </div>
        </main>
        <footer className="role-dashboard-footer">
          <span>© {new Date().getFullYear()} ViLek</span>
          <span>Crew workspace</span>
        </footer>
      </div>
    </div>
  );
}
