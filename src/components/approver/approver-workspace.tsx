"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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

export function ApproverWorkspace() {
  const [pending, setPending] = useState<Claim[]>([]);
  const [history, setHistory] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [pendingResponse, historyResponse] = await Promise.all([
        fetch("/api/approver/claims", { cache: "no-store" }),
        fetch("/api/approver/history", { cache: "no-store" }),
      ]);
      const pendingData = await pendingResponse.json();
      const historyData = await historyResponse.json();
      if (!pendingResponse.ok)
        throw new Error(pendingData.error || "Unable to load pending claims.");
      if (!historyResponse.ok)
        throw new Error(historyData.error || "Unable to load review history.");
      setPending(Array.isArray(pendingData.claims) ? pendingData.claims : []);
      setHistory(Array.isArray(historyData.claims) ? historyData.claims : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load the approval workspace.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredPending = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return pending;
    return pending.filter((claim) =>
      [
        claim.crewName,
        claim.crewLastName,
        claim.crewEmail,
        claim.flightNumber,
        claim.airlineName,
        claim.originCode,
        claim.destinationCode,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [pending, search]);

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
      <section className="approver-metrics" aria-label="Approval summary">
        <article className="approver-metric approver-metric--pending">
          <span className="approver-metric__icon" aria-hidden="true">
            ▤
          </span>
          <span className="approver-metric__label">Awaiting review</span>
          <strong>{loading ? "—" : pending.length}</strong>
          <small>Claims submitted by crew</small>
        </article>
        <article className="approver-metric approver-metric--approved">
          <span className="approver-metric__icon" aria-hidden="true">
            ✓
          </span>
          <span className="approver-metric__label">Approved</span>
          <strong>
            {loading ? "—" : history.filter((claim) => claim.status === "APPROVED").length}
          </strong>
          <small>Recorded review decisions</small>
        </article>
        <article className="approver-metric approver-metric--rejected">
          <span className="approver-metric__icon" aria-hidden="true">
            ↩
          </span>
          <span className="approver-metric__label">Returned for correction</span>
          <strong>
            {loading ? "—" : history.filter((claim) => claim.status === "REJECTED").length}
          </strong>
          <small>Claims requiring crew action</small>
        </article>
      </section>

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

      <section className="approver-section" id="pending" aria-labelledby="approver-pending-title">
        <div className="approver-section__heading">
          <div>
            <span className="approver-section__eyebrow">ACTION REQUIRED</span>
            <h2 id="approver-pending-title">Pending approvals</h2>
            <p>Review submitted expenses and record an approval decision.</p>
          </div>
          <label className="approver-search">
            <span className="sr-only">Search pending claims</span>
            <span aria-hidden="true">⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search crew or flight"
            />
          </label>
        </div>

        {loading ? (
          <div className="approver-empty">
            <span className="approver-spinner" />
            Loading approval queue…
          </div>
        ) : filteredPending.length === 0 ? (
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
            {filteredPending.map((claim) => {
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
                          {claim.destinationAirportName} <strong>({claim.destinationCode})</strong>
                        </span>
                      </div>
                      <div className="approver-flight-times">
                        <div className="approver-flight-time">
                          <span>Scheduled departure</span>
                          <strong>{formatDate(claim.scheduledDeparture, true)}</strong>
                        </div>
                        <div className="approver-flight-time">
                          <span>Actual departure</span>
                          <strong className={claim.actualDeparture ? "is-recorded" : "is-pending"}>
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
                                <td>{formatMoney(Number(expense.amount), expense.currencyCode)}</td>
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
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

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
          <span className="approver-history-count">{history.length} decisions</span>
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
                    {claim.crewName} {claim.crewLastName} · {claim.airlineName} {claim.flightNumber}
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
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
