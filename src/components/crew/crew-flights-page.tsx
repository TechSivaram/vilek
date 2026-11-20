"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProfileMenu } from "@/components/workspaces/profile-menu";
import { WorkspaceSwitcher } from "@/components/workspaces/workspace-switcher";
import "./crew-flights.css";

type CrewFlight = {
  assignmentId: string;
  flightId: string;
  flightNumber: string;
  airlineName: string;
  airlineIata: string;
  originCode: string;
  originCity: string;
  originCountry: string;
  destinationCode: string;
  destinationCity: string;
  destinationCountry: string;
  scheduledDeparture: string;
  scheduledArrival: string;
  actualDeparture: string | null;
  actualArrival: string | null;
  flightStatus: string;
  designation: string;
};
type FlightResponse = {
  flights: CrewFlight[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  summary: { total: number; upcoming: number; completed: number };
};
type Filters = {
  search: string; status: string; fromDate: string; toDate: string;
  sortBy: "departure" | "arrival" | "flightNumber" | "airline";
  sortOrder: "asc" | "desc"; pageSize: number;
};

function dateLabel(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
function displayFlightNumber(airlineIata: string, flightNumber: string) {
  const code = airlineIata.trim();
  const number = flightNumber.trim();
  if (!code || number.toUpperCase().startsWith(`${code.toUpperCase()} `) || number.toUpperCase() === code.toUpperCase()) return number;
  return `${code} ${number}`;
}
function statusClass(status: string) { return status.toLowerCase().replace(/[^a-z0-9]+/g, "-"); }

export function CrewFlightsPage({ roleCodes, firstName, lastName, email }: { roleCodes: string[]; firstName: string; lastName: string; email: string }) {
  const [filters, setFilters] = useState<Filters>({ search: "", status: "", fromDate: "", toDate: "", sortBy: "departure", sortOrder: "desc", pageSize: 20 });
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearchInput(filters.search); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [filters.search]);

  const query = useQuery<FlightResponse>({
    queryKey: ["crew-flights", { status: filters.status, fromDate: filters.fromDate, toDate: filters.toDate, sortBy: filters.sortBy, sortOrder: filters.sortOrder, pageSize: filters.pageSize, page, search: searchInput }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page), pageSize: String(filters.pageSize), search: searchInput,
        status: filters.status, fromDate: filters.fromDate, toDate: filters.toDate,
        sortBy: filters.sortBy, sortOrder: filters.sortOrder,
      });
      const response = await fetch(`/api/crew/flights?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to load your flights.");
      return payload as FlightResponse;
    },
    placeholderData: (previous) => previous,
  });

  const data = query.data;
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };
  const resetFilters = () => {
    setFilters({ search: "", status: "", fromDate: "", toDate: "", sortBy: "departure", sortOrder: "desc", pageSize: 20 });
    setSearchInput(""); setPage(1);
  };
  const flightLabel = (flight: CrewFlight) => displayFlightNumber(flight.airlineIata, flight.flightNumber);

  return (
    <div className="role-dashboard role-dashboard--crew crew-flights-shell">
      <aside className="role-dashboard-sidebar">
        <Link href="/crew" className="role-dashboard-brand" aria-label="ViLek dashboard"><Image src="/Branding/logo.png" alt="ViLek" width={118} height={48} priority /></Link>
        <div className="role-dashboard-sidebar-label">WORKSPACE</div>
        <div className="role-dashboard-current"><span>✈</span><strong>Crew workspace</strong></div>
        <nav className="role-dashboard-nav" aria-label="Crew navigation">
          <Link href="/crew"><span>◫</span> Overview</Link>
          <Link href="/crew/flights" className="is-active"><span>✈</span> My flights</Link>
          <Link href="/crew#expenses"><span>₹</span> My expenses</Link>
          <Link href="/crew/claims"><span>▤</span> My claims</Link>
        </nav>
        <div className="role-dashboard-sidebar-bottom"><div className="role-dashboard-help"><strong>Need a hand?</strong><p>Contact your ViLek administrator if you need help with this workspace.</p></div></div>
      </aside>
      <div className="role-dashboard-main">
        <header className="role-dashboard-topbar">
          <div className="role-dashboard-breadcrumb"><Link href="/crew">Crew workspace</Link><span>/</span><strong>My flights</strong></div>
          <div className="role-dashboard-topbar-actions"><WorkspaceSwitcher roleCodes={roleCodes} currentRole="CREW" /><ProfileMenu firstName={firstName} lastName={lastName} email={email} /></div>
        </header>
        <main className="role-dashboard-content crew-flights-content">
          <div className="role-dashboard-heading"><div><span className="role-dashboard-eyebrow">FLIGHT ASSIGNMENTS · SCHEDULE</span><h1>My flights</h1><p>Search and manage your assigned flight schedule.</p></div><span className="role-dashboard-heading-icon" aria-hidden="true">✈</span></div>
          {query.isError && <div className="crew-flights-alert" role="alert">{query.error instanceof Error ? query.error.message : "Unable to load your flights."}</div>}
          <section className="crew-flights-summary" aria-label="Flight summary">
            <article><span>All assignments</span><strong>{data?.summary.total ?? "—"}</strong></article>
            <article><span>Upcoming / in progress</span><strong>{data?.summary.upcoming ?? "—"}</strong></article>
            <article><span>Completed / cancelled</span><strong>{data?.summary.completed ?? "—"}</strong></article>
          </section>
          <section className="crew-flights-panel">
            <div className="crew-flights-panel-heading"><div><h2>Flight assignments</h2><p>{data ? `${data.pagination.total} assignment${data.pagination.total === 1 ? "" : "s"} found` : "Your assignments linked to your ViLek crew profile."}</p></div></div>
            <div className="crew-flights-toolbar">
              <label className="crew-flights-search"><span>Search flights</span><input value={filters.search} onChange={(event) => update("search", event.target.value)} placeholder="Flight, airline, airport or city" /></label>
              <label><span>Status</span><select value={filters.status} onChange={(event) => update("status", event.target.value)}><option value="">All statuses</option><option value="SCHEDULED">Scheduled</option><option value="BOARDING">Boarding</option><option value="DEPARTED">Departed</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></select></label>
              <label><span>From date</span><input type="date" value={filters.fromDate} onChange={(event) => update("fromDate", event.target.value)} /></label>
              <label><span>To date</span><input type="date" value={filters.toDate} min={filters.fromDate || undefined} onChange={(event) => update("toDate", event.target.value)} /></label>
              <label><span>Sort by</span><select value={filters.sortBy} onChange={(event) => update("sortBy", event.target.value as Filters["sortBy"])}><option value="departure">Departure date</option><option value="arrival">Arrival date</option><option value="flightNumber">Flight number</option><option value="airline">Airline</option></select></label>
              <label><span>Order</span><select value={filters.sortOrder} onChange={(event) => update("sortOrder", event.target.value as Filters["sortOrder"])}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
              <button type="button" className="crew-flights-reset" onClick={resetFilters}>Reset</button>
            </div>
            {query.isPending ? <div className="crew-flights-empty">Loading your flight assignments…</div> : !data || data.flights.length === 0 ? (
              <div className="crew-flights-empty">{data?.pagination.total === 0 ? "No flight assignments match your search." : "No flight assignments are linked to your crew profile yet."}</div>
            ) : <>
              <div className="crew-flights-table-wrap">
                <table className="crew-flights-table">
                  <thead><tr><th>Flight</th><th>Route</th><th>Departure</th><th>Arrival</th><th>Designation</th><th>Status</th></tr></thead>
                  <tbody>{data.flights.map((flight) => <tr key={flight.assignmentId}>
                    <td><strong>{flightLabel(flight)}</strong><span>{flight.airlineName}</span></td>
                    <td><strong>{flight.originCode} → {flight.destinationCode}</strong><span>{flight.originCity} → {flight.destinationCity}</span></td>
                    <td><strong>{dateLabel(flight.scheduledDeparture)}</strong>{flight.actualDeparture && <span>Actual: {dateLabel(flight.actualDeparture)}</span>}</td>
                    <td><strong>{dateLabel(flight.scheduledArrival)}</strong>{flight.actualArrival && <span>Actual: {dateLabel(flight.actualArrival)}</span>}</td>
                    <td>{flight.designation}</td>
                    <td><span className={`crew-flight-status is-${statusClass(flight.flightStatus)}`}>{flight.flightStatus.replaceAll("_", " ")}</span></td>
                  </tr>)}</tbody>
                </table>
              </div>
              <div className="crew-flights-mobile-list">{data.flights.map((flight) => <article className="crew-flight-mobile-card" key={flight.assignmentId}>
                <div className="crew-flight-mobile-top"><div><strong>{flightLabel(flight)}</strong><span>{flight.airlineName} · {flight.designation}</span></div><span className={`crew-flight-status is-${statusClass(flight.flightStatus)}`}>{flight.flightStatus.replaceAll("_", " ")}</span></div>
                <div className="crew-flight-mobile-route"><div><strong>{flight.originCode}</strong><span>{flight.originCity}</span></div><span aria-hidden="true">→</span><div><strong>{flight.destinationCode}</strong><span>{flight.destinationCity}</span></div></div>
                <div className="crew-flight-mobile-times"><div><span>Departure</span><strong>{dateLabel(flight.scheduledDeparture)}</strong></div><div><span>Arrival</span><strong>{dateLabel(flight.scheduledArrival)}</strong></div></div>
                {(flight.actualDeparture || flight.actualArrival) && <div className="crew-flight-mobile-actual">Actual: {flight.actualDeparture ? dateLabel(flight.actualDeparture) : "Not departed"} – {flight.actualArrival ? dateLabel(flight.actualArrival) : "Not arrived"}</div>}
              </article>)}</div>
              <div className="crew-flights-pagination"><span>Showing {(page - 1) * filters.pageSize + 1}–{Math.min(page * filters.pageSize, data.pagination.total)} of {data.pagination.total}</span><div><label>Rows <select value={filters.pageSize} onChange={(event) => update("pageSize", Number(event.target.value))}><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select></label><button type="button" disabled={page <= 1 || query.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button><span>Page {page} of {data.pagination.totalPages}</span><button type="button" disabled={page >= data.pagination.totalPages || query.isFetching} onClick={() => setPage((current) => Math.min(data.pagination.totalPages, current + 1))}>Next</button></div></div>
            </>}
          </section>
        </main>
        <footer className="role-dashboard-footer"><span>© {new Date().getFullYear()} ViLek</span><span>Crew workspace</span></footer>
      </div>
    </div>
  );
}
