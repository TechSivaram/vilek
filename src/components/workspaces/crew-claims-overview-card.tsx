"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

type ClaimAssignment = { claimId: string | null; claimStatus: string | null };
type ClaimsResponse = { assignments: ClaimAssignment[] };

export function CrewClaimsOverviewCard() {
  const query = useQuery<ClaimsResponse>({
    queryKey: ["crew-claims-overview"],
    queryFn: async () => {
      const response = await fetch("/api/crew/claims", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to load claims summary.");
      return payload as ClaimsResponse;
    },
  });
  const assignments = query.data?.assignments ?? [];
  const claims = assignments.filter((item) => item.claimId);
  const count = (statuses: string[]) => claims.filter((item) => statuses.includes(item.claimStatus ?? "")).length;
  const updated = query.dataUpdatedAt
    ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(query.dataUpdatedAt)
    : null;

  return (
    <article className="role-dashboard-capability crew-claims-overview-card">
      <div className="crew-claims-overview-header">
        <div className="crew-claims-overview-title">
          <span className="role-dashboard-capability-icon" aria-hidden="true">▤</span>
          <h2>My claims</h2>
        </div>
        <div className="crew-claims-overview-refresh">
          <span aria-live="polite">{query.isFetching ? "Refreshing…" : updated ? `Updated ${updated}` : "Claims summary"}</span>
          <button type="button" onClick={() => void query.refetch()} disabled={query.isFetching} aria-label="Refresh claims summary" title="Refresh claims summary">↻</button>
        </div>
      </div>
      {query.isPending ? (
        <p className="crew-claims-overview-message">Loading your claims summary…</p>
      ) : query.isError && !query.data ? (
        <div className="crew-claims-overview-error" role="alert">
          <p>{query.error instanceof Error ? query.error.message : "Unable to load claims summary."}</p>
          <button type="button" onClick={() => void query.refetch()}>Try again</button>
        </div>
      ) : (
        <>
          <div className="crew-claims-overview-stats">
            <div><strong>{claims.length}</strong><span>Total claims</span></div>
            <div><strong>{count(["SUBMITTED"])}</strong><span>Submitted</span></div>
            <div><strong>{count(["REVISION_REQUIRED", "REJECTED"])}</strong><span>Needs attention</span></div>
          </div>
          <div className="crew-claims-overview-statuses">
            <div><span className="is-approved" />Approved <strong>{count(["APPROVED"])}</strong></div>
            <div><span className="is-paid" />Paid <strong>{count(["PAID"])}</strong></div>
            <div><span className="is-draft" />Draft <strong>{count(["DRAFT"])}</strong></div>
          </div>
          {query.isError ? <p className="crew-claims-overview-message">Refresh failed. Showing the last loaded information.</p> : null}
        </>
      )}
      <Link href="/crew/claims" className="role-dashboard-capability-link">View all claims <span aria-hidden="true">→</span></Link>
    </article>
  );
}
