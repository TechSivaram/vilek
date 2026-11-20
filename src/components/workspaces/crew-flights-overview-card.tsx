"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

type NextFlight = {
  assignmentId: string;
  flightNumber: string;
  airlineName: string;
  airlineIata: string;
  originCode: string;
  originCity: string;
  destinationCode: string;
  destinationCity: string;
  scheduledDeparture: string;
  scheduledArrival: string;
  flightStatus: string;
  designation: string;
};

type FlightSummaryResponse = {
  summary: { total: number; upcoming: number; thisMonth: number };
  nextFlight: NextFlight | null;
};

function flightNumberLabel(flight: NextFlight) {
  const code = flight.airlineIata.trim();
  const number = flight.flightNumber.trim();
  return code && !number.toUpperCase().startsWith(`${code.toUpperCase()} `)
    ? `${code} ${number}`
    : number;
}

function dateTimeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function statusClass(status: string) {
  return status.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function CrewFlightsOverviewCard() {
  const query = useQuery<FlightSummaryResponse>({
    queryKey: ["crew-flight-summary"],
    queryFn: async () => {
      const response = await fetch("/api/crew/flights/summary", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to load flight summary.");
      return payload as FlightSummaryResponse;
    },
  });

  const data = query.data;
  const nextFlight = data?.nextFlight;
  const updatedAt = query.dataUpdatedAt
    ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(query.dataUpdatedAt)
    : null;

  return (
    <article className="role-dashboard-capability crew-flight-overview-card">
      <div className="crew-flight-overview-header">
        <div className="crew-flight-overview-title">
          <span className="role-dashboard-capability-icon" aria-hidden="true">✈</span>
          <h2>My flights</h2>
        </div>
        <div className="crew-flight-overview-refresh">
          <span aria-live="polite">
            {query.isFetching ? "Refreshing…" : updatedAt ? `Updated ${updatedAt}` : "Flight summary"}
          </span>
          <button
            type="button"
            className={query.isFetching ? "is-refreshing" : ""}
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
            aria-label="Refresh flight summary"
            title="Refresh flight summary"
          >
            <span aria-hidden="true">↻</span>
          </button>
        </div>
      </div>

      {query.isPending ? (
        <p className="crew-flight-overview-message">Loading your flight summary…</p>
      ) : query.isError && !data ? (
        <div className="crew-flight-overview-error" role="alert">
          <p>{query.error instanceof Error ? query.error.message : "Unable to load flight summary."}</p>
          <button type="button" onClick={() => void query.refetch()}>Try again</button>
        </div>
      ) : (
        <>
          <div className="crew-flight-overview-stats">
            <div><strong>{data?.summary.upcoming ?? 0}</strong><span>Upcoming</span></div>
            <div><strong>{data?.summary.thisMonth ?? 0}</strong><span>This month</span></div>
            <div><strong>{data?.summary.total ?? 0}</strong><span>Total flights</span></div>
          </div>
          <div className="crew-flight-overview-next">
            <span className="crew-flight-overview-section-label">Next assigned flight</span>
            {nextFlight ? (
              <>
                <div className="crew-flight-overview-flight-heading">
                  <div><strong>{flightNumberLabel(nextFlight)}</strong><span>{nextFlight.airlineName} · {nextFlight.designation}</span></div>
                  <span className={`crew-flight-status is-${statusClass(nextFlight.flightStatus)}`}>
                    {nextFlight.flightStatus.replaceAll("_", " ")}
                  </span>
                </div>
                <div className="crew-flight-overview-route">
                  <div><strong>{nextFlight.originCode}</strong><span>{nextFlight.originCity}</span></div>
                  <span aria-hidden="true">→</span>
                  <div><strong>{nextFlight.destinationCode}</strong><span>{nextFlight.destinationCity}</span></div>
                </div>
                <div className="crew-flight-overview-times">
                  <span>Departure</span><strong>{dateTimeLabel(nextFlight.scheduledDeparture)}</strong>
                </div>
              </>
            ) : (
              <p className="crew-flight-overview-message">You have no upcoming assigned flights.</p>
            )}
          </div>
          {query.isError && <p className="crew-flight-overview-stale" role="status">Refresh failed. Showing the last successfully loaded information.</p>}
        </>
      )}

      <Link href="/crew/flights" className="role-dashboard-capability-link">
        View all flight assignments <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
