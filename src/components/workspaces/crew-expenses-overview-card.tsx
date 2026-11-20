"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
type Summary = {
  total: number;
  thisMonth: number;
  unclaimed: number;
  recent: { description: string; amount: string; expenseDate: string; currencyCode: string } | null;
  amountByCurrency: { code: string; amount: string }[];
};
type ResponseData = { summary: Summary };
const amountLabel = (amount: string, currency: string) =>
  `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(Number(amount) || 0)} ${currency}`;
const dateLabel = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(d);
};
export function CrewExpensesOverviewCard() {
  const query = useQuery<ResponseData>({
    queryKey: ["crew-expense-summary"],
    queryFn: async () => {
      const r = await fetch("/api/crew/expenses?page=1&pageSize=10", { cache: "no-store" });
      const p = await r.json();
      if (!r.ok) throw new Error(p.error ?? "Unable to load expense summary.");
      return p as ResponseData;
    },
  });
  const summary = query.data?.summary;
  const updated = query.dataUpdatedAt
    ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
        query.dataUpdatedAt,
      )
    : null;
  return (
    <article className="role-dashboard-capability crew-expense-overview-card">
      <div className="crew-expense-overview-header">
        <div className="crew-expense-overview-title">
          <span className="role-dashboard-capability-icon" aria-hidden="true">
            ↗
          </span>
          <h2>My expenses</h2>
        </div>
        <div className="crew-expense-overview-refresh">
          <span aria-live="polite">
            {query.isFetching ? "Refreshing…" : updated ? `Updated ${updated}` : "Expense summary"}
          </span>
          <button
            type="button"
            className={query.isFetching ? "is-refreshing" : ""}
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
            aria-label="Refresh expense summary"
            title="Refresh expense summary"
          >
            <span aria-hidden="true">↻</span>
          </button>
        </div>
      </div>
      {query.isPending ? (
        <p className="crew-expense-overview-message">Loading your expense summary…</p>
      ) : query.isError && !summary ? (
        <div className="crew-expense-overview-error" role="alert">
          <p>
            {query.error instanceof Error ? query.error.message : "Unable to load expense summary."}
          </p>
          <button type="button" onClick={() => void query.refetch()}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="crew-expense-overview-stats">
            <div>
              <strong>{summary?.total ?? 0}</strong>
              <span>Total expenses</span>
            </div>
            <div>
              <strong>{summary?.thisMonth ?? 0}</strong>
              <span>This month</span>
            </div>
            <div>
              <strong>{summary?.unclaimed ?? 0}</strong>
              <span>Unclaimed</span>
            </div>
          </div>
          <div className="crew-expense-overview-recent">
            <span className="crew-expense-overview-section-label">Recent expense</span>
            {summary?.recent ? (
              <div className="crew-expense-overview-recent-row">
                <div>
                  <strong>{summary.recent.description}</strong>
                  <span>{dateLabel(summary.recent.expenseDate)}</span>
                </div>
                <strong>{amountLabel(summary.recent.amount, summary.recent.currencyCode)}</strong>
              </div>
            ) : (
              <p className="crew-expense-overview-message">
                You have not recorded any expenses yet.
              </p>
            )}
          </div>
          {summary?.amountByCurrency?.length ? (
            <div className="crew-expense-overview-totals">
              <span>Total amount</span>
              <div>
                {summary.amountByCurrency.map((x) => (
                  <strong key={x.code}>{amountLabel(x.amount, x.code)}</strong>
                ))}
              </div>
            </div>
          ) : null}
          {query.isError ? (
            <p className="crew-expense-overview-stale" role="status">
              Refresh failed. Showing the last successfully loaded information.
            </p>
          ) : null}
        </>
      )}
      <Link href="/crew/expenses" className="role-dashboard-capability-link">
        View all expenses <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
