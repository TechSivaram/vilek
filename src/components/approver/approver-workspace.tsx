"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ClaimConversation } from "@/components/claims/claim-conversation";

type ExpenseItem = {
  id: string;
  description: string;
  amount: string;
  currencyCode: string;
  category: string;
  expenseDate: string;
  location: string | null;
  documents?: { id: string; fileName: string; contentType: string; fileSizeBytes: number }[];
};

type Pagination = { page: number; pageSize: number; total: number; totalPages: number };
type DashboardData = {
  pending: number;
  approvedThisMonth: number;
  returnedThisMonth: number;
  olderThan24Hours: number;
  olderThan72Hours: number;
  averageReviewHours: number | null;
  oldest: {
    claimId: string;
    createdAt: string;
    crewName: string;
    crewLastName: string;
    flightNumber: string;
    airlineName: string;
  }[];
  monthlyTrend: { month: string; approved: number; returned: number }[];
  pendingByCurrency: { currency: string; amount: number }[];
  recentActivity: {
    claimId: string;
    status: string;
    updatedAt: string;
    crewName: string;
    crewLastName: string;
    flightNumber: string;
    airlineName: string;
  }[];
};
type Claim = {
  claimId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  flightNumber: string;
  airlineName: string;
  crewName: string;
  crewLastName: string;
  crewEmail: string;
  originCode: string;
  originAirportName: string;
  destinationCode: string;
  destinationAirportName: string;
  scheduledDeparture: string;
  scheduledArrival: string;
  actualDeparture: string | null;
  actualArrival: string | null;
  flightStatus: string;
  expenses?: ExpenseItem[];
  latestComments?: {
    comment: string;
    createdAt: string;
    authorFirstName: string;
    authorLastName: string;
  }[];
};

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return (withTime ? dateTimeFormatter : dateFormatter).format(date);
}

function formatFlightStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\\b\\w/g, (letter) => letter.toUpperCase());
}

function currencyTotals(items: ExpenseItem[]) {
  const totals = new Map<string, number>();
  for (const item of items) {
    totals.set(item.currencyCode, (totals.get(item.currencyCode) ?? 0) + Number(item.amount || 0));
  }
  return [...totals.entries()].map(([currency, amount]) => ({ currency, amount }));
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function ApproverWorkspace({
  view = "dashboard",
}: {
  view?: "dashboard" | "pending" | "history";
}) {
  const [pending, setPending] = useState<Claim[]>([]);
  const [history, setHistory] = useState<Claim[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [pendingPagination, setPendingPagination] = useState<Pagination>({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 1,
  });
  const [historyPagination, setHistoryPagination] = useState<Pagination>({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 1,
  });
  const [pendingPage, setPendingPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState<"ALL" | "APPROVED" | "REJECTED">("ALL");
  const [sortBy, setSortBy] = useState("submitted");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [historyConversationId, setHistoryConversationId] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (view === "dashboard") {
        const response = await fetch("/api/approver/dashboard", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load dashboard metrics.");
        setDashboard(data.dashboard ?? null);
      } else if (view === "pending") {
        const params = new URLSearchParams({
          page: String(pendingPage),
          pageSize: String(pageSize),
          search,
          sortBy,
          sortOrder,
        });
        const response = await fetch(`/api/approver/claims?${params}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load pending claims.");
        setPending(Array.isArray(data.claims) ? data.claims : []);
        setPendingPagination(
          data.pagination ?? { page: pendingPage, pageSize, total: 0, totalPages: 1 },
        );
      } else {
        const params = new URLSearchParams({
          page: String(historyPage),
          pageSize: String(pageSize),
          search: historySearch,
          status: historyStatus,
        });
        const response = await fetch(`/api/approver/history?${params}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load review history.");
        setHistory(Array.isArray(data.claims) ? data.claims : []);
        setHistoryPagination(
          data.pagination ?? { page: historyPage, pageSize, total: 0, totalPages: 1 },
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load the approval workspace.");
    } finally {
      setLoading(false);
    }
  }, [
    view,
    pendingPage,
    historyPage,
    pageSize,
    search,
    historySearch,
    historyStatus,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const selectedClaim = pending.find((claim) => claim.claimId === selectedClaimId) ?? null;

  async function submitDecision(action: "approve" | "reject") {
    if (!selectedClaim || !reviewComment.trim()) {
      setActionError("Add a review comment before recording your decision.");
      return;
    }
    setSaving(true);
    setActionError("");
    setSuccessMessage("");
    try {
      const response = await fetch(
        `/api/approver/claims/${encodeURIComponent(selectedClaim.claimId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, comment: reviewComment.trim() }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The review decision could not be saved.");
      setSuccessMessage(
        action === "approve"
          ? "Claim approved successfully."
          : "Claim rejected and returned to the crew member.",
      );
      setSelectedClaimId(null);
      setReviewComment("");
      await loadData();
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : "The review decision could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="approver-workspace">
      {view === "dashboard" && (
        <>
          <section className="approver-metrics" aria-label="Approval summary">
            <article className="approver-metric approver-metric--pending">
              <span className="approver-metric__icon" aria-hidden="true">
                ▤
              </span>
              <span className="approver-metric__label">Awaiting review</span>
              <strong>{loading ? "—" : (dashboard?.pending ?? pendingPagination.total)}</strong>
              <small>Claims submitted by crew</small>
            </article>
            <article className="approver-metric approver-metric--approved">
              <span className="approver-metric__icon" aria-hidden="true">
                ✓
              </span>
              <span className="approver-metric__label">Approved</span>
              <strong>{loading ? "—" : (dashboard?.approvedThisMonth ?? 0)}</strong>
              <small>Recorded review decisions</small>
            </article>
            <article className="approver-metric approver-metric--rejected">
              <span className="approver-metric__icon" aria-hidden="true">
                ↩
              </span>
              <span className="approver-metric__label">Returned this month</span>
              <strong>{loading ? "—" : (dashboard?.returnedThisMonth ?? 0)}</strong>
              <small>Claims requiring crew action</small>
            </article>
            <article className="approver-metric approver-metric--ageing">
              <span className="approver-metric__icon" aria-hidden="true">
                ◷
              </span>
              <span className="approver-metric__label">Over 72 hours</span>
              <strong>{loading ? "—" : (dashboard?.olderThan72Hours ?? 0)}</strong>
              <small>Claims needing attention</small>
            </article>
          </section>
          <section className="approver-insights" aria-label="Approval workload insights">
            <article className="approver-insight-card">
              <div className="approver-insight-card__heading">
                <div>
                  <span className="approver-section__eyebrow">QUEUE AGEING</span>
                  <h3>Outstanding claims</h3>
                </div>
                <span className="approver-insight-card__total">
                  {dashboard?.pending ?? 0} total
                </span>
              </div>
              <div className="approver-ageing-row">
                <span>Older than 24 hours</span>
                <strong>{dashboard?.olderThan24Hours ?? 0}</strong>
              </div>
              <div className="approver-ageing-row">
                <span>Older than 72 hours</span>
                <strong>{dashboard?.olderThan72Hours ?? 0}</strong>
              </div>
            </article>
            <article className="approver-insight-card approver-insight-card--oldest">
              <div className="approver-insight-card__heading">
                <div>
                  <span className="approver-section__eyebrow">PRIORITY REVIEW</span>
                  <h3>Oldest pending claims</h3>
                </div>
                <Link href="/approver/pending">View queue</Link>
              </div>
              {dashboard?.oldest?.length ? (
                dashboard.oldest.slice(0, 3).map((item) => (
                  <div className="approver-oldest-row" key={item.claimId}>
                    <span>
                      <strong>
                        {item.crewName} {item.crewLastName}
                      </strong>
                      <small>
                        {item.airlineName} · {item.flightNumber}
                      </small>
                    </span>
                    <time>{formatDate(item.createdAt)}</time>
                  </div>
                ))
              ) : (
                <p className="approver-insight-empty">No outstanding claims.</p>
              )}
            </article>
          </section>

          <section
            className="approver-dashboard-detail"
            aria-label="Approval performance and financial overview"
          >
            <article className="approver-insight-card approver-trend-card">
              <div className="approver-insight-card__heading">
                <div>
                  <span className="approver-section__eyebrow">DECISION TREND</span>
                  <h3>Last six months</h3>
                </div>
                <span className="approver-insight-card__total">Approved / returned</span>
              </div>
              {dashboard?.monthlyTrend?.length ? (
                dashboard.monthlyTrend.map((item) => {
                  const total = Math.max(
                    1,
                    ...dashboard.monthlyTrend.map((row) => row.approved + row.returned),
                  );
                  const approvedWidth = Math.max(0, (item.approved / total) * 100);
                  const returnedWidth = Math.max(0, (item.returned / total) * 100);
                  const label = new Intl.DateTimeFormat("en-IN", {
                    month: "short",
                    year: "2-digit",
                  }).format(new Date(`${item.month}-01T00:00:00`));
                  return (
                    <div className="approver-trend-row" key={item.month}>
                      <span>{label}</span>
                      <div className="approver-trend-track">
                        <i style={{ width: `${approvedWidth}%` }} />
                        <b style={{ width: `${returnedWidth}%` }} />
                      </div>
                      <strong>{item.approved + item.returned}</strong>
                    </div>
                  );
                })
              ) : (
                <p className="approver-insight-empty">
                  No completed decisions in the last six months.
                </p>
              )}
              <div className="approver-trend-legend">
                <span>
                  <i /> Approved
                </span>
                <span>
                  <i /> Returned
                </span>
              </div>
            </article>
            <article className="approver-insight-card">
              <div className="approver-insight-card__heading">
                <div>
                  <span className="approver-section__eyebrow">FINANCIAL EXPOSURE</span>
                  <h3>Pending by currency</h3>
                </div>
              </div>
              {dashboard?.pendingByCurrency?.length ? (
                dashboard.pendingByCurrency.map((item) => (
                  <div className="approver-ageing-row" key={item.currency}>
                    <span>{item.currency}</span>
                    <strong>{formatMoney(item.amount, item.currency)}</strong>
                  </div>
                ))
              ) : (
                <p className="approver-insight-empty">No pending expense amounts.</p>
              )}
              <div className="approver-average-review">
                <span>Average decision time this month</span>
                <strong>
                  {dashboard?.averageReviewHours == null
                    ? "—"
                    : `${dashboard.averageReviewHours} hours`}
                </strong>
              </div>
            </article>
            <article className="approver-insight-card approver-activity-card">
              <div className="approver-insight-card__heading">
                <div>
                  <span className="approver-section__eyebrow">RECENT ACTIVITY</span>
                  <h3>Latest decisions</h3>
                </div>
                <Link href="/approver/history">View history</Link>
              </div>
              {dashboard?.recentActivity?.length ? (
                dashboard.recentActivity.map((item) => (
                  <div className="approver-oldest-row" key={item.claimId}>
                    <span>
                      <strong>
                        {item.crewName} {item.crewLastName}
                      </strong>
                      <small>
                        {item.airlineName} · {item.flightNumber} ·{" "}
                        {item.status === "APPROVED" ? "Approved" : "Returned"}
                      </small>
                    </span>
                    <time>{formatDate(item.updatedAt)}</time>
                  </div>
                ))
              ) : (
                <p className="approver-insight-empty">No decisions recorded yet.</p>
              )}
            </article>
          </section>

          <div className="approver-dashboard-links">
            <Link href="/approver/pending">
              <span aria-hidden="true">▤</span>
              <strong>Open pending approvals</strong>
              <span aria-hidden="true">→</span>
            </Link>
            <Link href="/approver/history">
              <span aria-hidden="true">◷</span>
              <strong>Open review history</strong>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </>
      )}

      {error && (
        <div className="approver-alert approver-alert--error" role="alert">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="approver-alert approver-alert--success" role="status">
          {successMessage}
        </div>
      )}

      {view === "pending" && (
        <section className="approver-section" id="pending" aria-labelledby="approver-pending-title">
          <div className="approver-section__heading">
            <div>
              <span className="approver-section__eyebrow">ACTION REQUIRED</span>
              <h2 id="approver-pending-title">Pending approvals</h2>
              <p>Review submitted expenses and record an approval decision.</p>
            </div>
            <div className="approver-list-controls">
              <label className="approver-search">
                <span className="sr-only">Search pending claims</span>
                <span aria-hidden="true">⌕</span>
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPendingPage(1);
                  }}
                  placeholder="Search crew, email, flight or claim ID"
                />
              </label>
              <label className="approver-select-label">
                Sort
                <select
                  value={`${sortBy}:${sortOrder}`}
                  onChange={(event) => {
                    const [field, direction] = event.target.value.split(":");
                    setSortBy(field);
                    setSortOrder(direction as "asc" | "desc");
                    setPendingPage(1);
                  }}
                >
                  <option value="submitted:desc">Newest submitted</option>
                  <option value="submitted:asc">Oldest submitted</option>
                  <option value="crew:asc">Crew name A–Z</option>
                  <option value="flight:asc">Flight number A–Z</option>
                  <option value="departure:asc">Departure earliest</option>
                  <option value="departure:desc">Departure latest</option>
                </select>
              </label>
            </div>
          </div>

          {loading ? (
            <div className="approver-empty">
              <span className="approver-spinner" />
              Loading approval queue…
            </div>
          ) : pending.length === 0 ? (
            <div className="approver-empty">
              <span className="approver-empty__icon" aria-hidden="true">
                ✓
              </span>
              <strong>{search ? "No matching claims" : "You're all caught up"}</strong>
              <p>
                {search
                  ? "Try a different crew name, email address or flight number."
                  : "There are no claims waiting for your review right now."}
              </p>
            </div>
          ) : (
            <div className="approver-claim-list">
              {pending.map((claim) => {
                const totals = currencyTotals(claim.expenses ?? []);
                const expanded = selectedClaimId === claim.claimId;
                return (
                  <article
                    className={`approver-claim-card${expanded ? " is-expanded" : ""}`}
                    key={claim.claimId}
                  >
                    <div className="approver-claim-card__main">
                      <div className="approver-claim-card__identity">
                        <span className="approver-claim-card__avatar" aria-hidden="true">
                          {`${claim.crewName?.[0] ?? "C"}${claim.crewLastName?.[0] ?? ""}`.toUpperCase()}
                        </span>
                        <div>
                          <h3>
                            {claim.crewName} {claim.crewLastName}
                          </h3>
                          <p>{claim.crewEmail}</p>
                        </div>
                      </div>
                      <div className="approver-claim-card__flight">
                        <div className="approver-flight-heading">
                          <strong>
                            {claim.airlineName} · {claim.flightNumber}
                          </strong>
                          <span className="approver-flight-status">
                            {formatFlightStatus(claim.flightStatus)}
                          </span>
                        </div>
                        <div
                          className="approver-flight-route"
                          aria-label={`Route: ${claim.originAirportName} (${claim.originCode}) to ${claim.destinationAirportName} (${claim.destinationCode})`}
                        >
                          <span className="approver-flight-airport">
                            {claim.originAirportName} <strong>({claim.originCode})</strong>
                          </span>
                          <span className="approver-flight-route-arrow" aria-hidden="true">
                            →
                          </span>
                          <span className="approver-flight-airport">
                            {claim.destinationAirportName}{" "}
                            <strong>({claim.destinationCode})</strong>
                          </span>
                        </div>
                        <div className="approver-flight-times">
                          <div className="approver-flight-time">
                            <span>Scheduled departure</span>
                            <strong>{formatDate(claim.scheduledDeparture, true)}</strong>
                          </div>
                          <div className="approver-flight-time">
                            <span>Actual departure</span>
                            <strong
                              className={claim.actualDeparture ? "is-recorded" : "is-pending"}
                            >
                              {formatDate(claim.actualDeparture, true)}
                            </strong>
                          </div>
                          <div className="approver-flight-time">
                            <span>Scheduled arrival</span>
                            <strong>{formatDate(claim.scheduledArrival, true)}</strong>
                          </div>
                          <div className="approver-flight-time">
                            <span>Actual arrival</span>
                            <strong className={claim.actualArrival ? "is-recorded" : "is-pending"}>
                              {formatDate(claim.actualArrival, true)}
                            </strong>
                          </div>
                        </div>
                      </div>
                      <div className="approver-claim-card__amount">
                        <strong>{claim.expenses?.length ?? 0} expenses</strong>
                        {totals.map((total) => (
                          <span key={total.currency}>
                            {formatMoney(total.amount, total.currency)}
                          </span>
                        ))}
                        <small>Submitted {formatDate(claim.createdAt)}</small>
                      </div>
                      <button
                        type="button"
                        className="approver-review-button"
                        onClick={() => {
                          setSelectedClaimId(expanded ? null : claim.claimId);
                          setReviewComment("");
                          setActionError("");
                        }}
                      >
                        {expanded ? "Close review" : "Review claim"}
                        <span aria-hidden="true">{expanded ? "⌃" : "→"}</span>
                      </button>
                    </div>
                    {expanded && (
                      <>
                        <div className="approver-review-panel">
                          <div className="approver-review-panel__heading">
                            <div>
                              <h4>Expense details</h4>
                              <p>Check each submitted expense before making a decision.</p>
                            </div>
                            <span className="approver-status">Submitted</span>
                          </div>
                          <div className="approver-expense-table-wrap">
                            <table className="approver-expense-table">
                              <thead>
                                <tr>
                                  <th>Expense</th>
                                  <th>Category</th>
                                  <th>Date</th>
                                  <th>Location</th>
                                  <th>Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(claim.expenses ?? []).map((expense) => (
                                  <tr key={expense.id}>
                                    <td>
                                      <strong>{expense.description}</strong>
                                      {expense.documents && expense.documents.length > 0 && (
                                        <span className="approver-receipt-links">
                                          {expense.documents.map((document) => (
                                            <a
                                              key={document.id}
                                              href={`/api/approver/documents/${encodeURIComponent(document.id)}`}
                                              target="_blank"
                                              rel="noreferrer"
                                            >
                                              View receipt · {document.fileName}
                                            </a>
                                          ))}
                                        </span>
                                      )}
                                    </td>
                                    <td>{expense.category}</td>
                                    <td>{formatDate(expense.expenseDate)}</td>
                                    <td>{expense.location || "—"}</td>
                                    <td>
                                      {formatMoney(Number(expense.amount), expense.currencyCode)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <label className="approver-comment-field">
                            <span>
                              Review comment <em>Required</em>
                            </span>
                            <textarea
                              value={reviewComment}
                              onChange={(event) => setReviewComment(event.target.value)}
                              rows={3}
                              maxLength={2000}
                              placeholder="Add the reason for your decision or feedback for the crew member…"
                            />
                          </label>
                          {actionError && (
                            <div className="approver-alert approver-alert--error" role="alert">
                              {actionError}
                            </div>
                          )}
                          <div className="approver-review-actions">
                            <span>{reviewComment.length}/2000 characters</span>
                            <div>
                              <button
                                type="button"
                                className="approver-button approver-button--reject"
                                disabled={saving || !reviewComment.trim()}
                                onClick={() => void submitDecision("reject")}
                              >
                                {saving ? "Saving…" : "Reject claim"}
                              </button>
                              <button
                                type="button"
                                className="approver-button approver-button--approve"
                                disabled={saving || !reviewComment.trim()}
                                onClick={() => void submitDecision("approve")}
                              >
                                {saving ? "Saving…" : "Approve claim"}
                              </button>
                            </div>
                          </div>
                        </div>
                        <section
                          className="approver-claim-conversation-section"
                          aria-label="Claim conversation"
                        >
                          <ClaimConversation claimId={claim.claimId} />
                        </section>
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          )}
          <PaginationBar
            pagination={pendingPagination}
            pageSize={pageSize}
            onPageChange={setPendingPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPendingPage(1);
              setHistoryPage(1);
            }}
          />
        </section>
      )}

      {view === "history" && (
        <section
          className="approver-section approver-section--history"
          id="history"
          aria-labelledby="approver-history-title"
        >
          <div className="approver-section__heading">
            <div>
              <span className="approver-section__eyebrow">DECISION RECORD</span>
              <h2 id="approver-history-title">Review history</h2>
              <p>Previously reviewed claims and the comments recorded with each decision.</p>
            </div>
            <div className="approver-history-controls">
              <label className="approver-search">
                <span className="sr-only">Search review history</span>
                <span aria-hidden="true">⌕</span>
                <input
                  value={historySearch}
                  onChange={(event) => {
                    setHistorySearch(event.target.value);
                    setHistoryPage(1);
                  }}
                  placeholder="Search history"
                />
              </label>
              <select
                aria-label="Filter review history by decision"
                value={historyStatus}
                onChange={(event) => {
                  setHistoryStatus(event.target.value as "ALL" | "APPROVED" | "REJECTED");
                  setHistoryPage(1);
                }}
              >
                <option value="ALL">All decisions</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <span className="approver-history-count">{historyPagination.total} decisions</span>
            </div>
          </div>
          {loading ? (
            <div className="approver-empty">Loading review history…</div>
          ) : history.length === 0 ? (
            <div className="approver-empty approver-empty--compact">
              <strong>No review history yet</strong>
              <p>Completed approval decisions will appear here.</p>
            </div>
          ) : (
            <div className="approver-history-list">
              {history.map((claim) => (
                <article className="approver-history-row" key={claim.claimId}>
                  <span
                    className={`approver-history-status ${claim.status === "APPROVED" ? "is-approved" : "is-rejected"}`}
                  >
                    {claim.status === "APPROVED" ? "✓ Approved" : "↩ Rejected"}
                  </span>
                  <div className="approver-history-row__details">
                    <strong>
                      {claim.crewName} {claim.crewLastName} · {claim.airlineName}{" "}
                      {claim.flightNumber}
                    </strong>
                    <span>
                      {claim.originCode} → {claim.destinationCode} · Reviewed{" "}
                      {formatDate(claim.updatedAt, true)}
                    </span>
                    {claim.latestComments?.[0] && (
                      <small>
                        Latest comment: “{claim.latestComments[0].comment}” —{" "}
                        {claim.latestComments[0].authorFirstName}{" "}
                        {claim.latestComments[0].authorLastName}
                      </small>
                    )}
                    <button
                      type="button"
                      className="approver-review-button"
                      onClick={() =>
                        setHistoryConversationId(
                          historyConversationId === claim.claimId ? null : claim.claimId,
                        )
                      }
                    >
                      {historyConversationId === claim.claimId
                        ? "Hide conversation"
                        : "View conversation"}
                    </button>
                    {historyConversationId === claim.claimId && (
                      <ClaimConversation claimId={claim.claimId} />
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
          <PaginationBar
            pagination={historyPagination}
            pageSize={pageSize}
            onPageChange={setHistoryPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPendingPage(1);
              setHistoryPage(1);
            }}
          />
        </section>
      )}
    </div>
  );
}

function PaginationBar({
  pagination,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  pagination: Pagination;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  if (pagination.total === 0) return null;
  const first = (pagination.page - 1) * pagination.pageSize + 1;
  const last = Math.min(pagination.page * pagination.pageSize, pagination.total);
  return (
    <div className="approver-pagination">
      <span>
        Showing{" "}
        <strong>
          {first}–{last}
        </strong>{" "}
        of <strong>{pagination.total.toLocaleString("en-IN")}</strong>
      </span>
      <label>
        Rows
        <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </label>
      <div className="approver-pagination__buttons">
        <button
          type="button"
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          Previous
        </button>
        <strong>
          Page {pagination.page} of {pagination.totalPages}
        </strong>
        <button
          type="button"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
