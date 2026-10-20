"use client";

import { Fragment, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

const optionFlightSchema = z.object({
  id: z.string(),
  flightNumber: z.string(),
  airlineName: z.string(),
  airlineCode: z.string(),
  originCode: z.string(),
  originCity: z.string(),
  destinationCode: z.string(),
  destinationCity: z.string(),
  scheduledDeparture: z.string(),
});
const optionCrewSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  badgeNumber: z.string(),
});
const optionDesignationSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
});
const optionsResponseSchema = z.object({
  options: z.object({
    flights: z.array(optionFlightSchema),
    crewMembers: z.array(optionCrewSchema),
    designations: z.array(optionDesignationSchema),
  }),
});
const flightSchema = z.object({
  id: z.string(),
  flightNumber: z.string(),
  airlineName: z.string(),
  airlineCode: z.string(),
  originCode: z.string(),
  originCity: z.string(),
  destinationCode: z.string(),
  destinationCity: z.string(),
  scheduledDeparture: z.string(),
  crewCount: z.number(),
});
const rowSchema = z.object({
  id: z.string(),
  crewMemberId: z.string(),
  crewMemberName: z.string(),
  badgeNumber: z.string(),
  designationId: z.number(),
  designationName: z.string(),
});
const listResponseSchema = z.object({
  rows: z.array(flightSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});
const manifestResponseSchema = z.object({ rows: z.array(rowSchema) });
const mutationResponseSchema = z.object({ ok: z.boolean() });
type AssignmentRow = z.infer<typeof rowSchema>;
type FlightSummary = z.infer<typeof flightSchema>;
type Options = z.infer<typeof optionsResponseSchema>["options"];

async function requestJson<T>(
  url: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("vilek:loading-start"));
  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...init?.headers,
      },
      cache: "no-store",
    });
    const responseText = await response.text();
    let body: unknown;
    try {
      body = responseText.trim() ? JSON.parse(responseText) : null;
    } catch {
      throw new Error(
        response.ok
          ? "The server returned an invalid response. Refresh and try again."
          : `Request failed (${response.status}); the server did not return valid JSON.`,
      );
    }

    if (!response.ok) {
      const parsed = z.object({ error: z.string().optional() }).safeParse(body);
      throw new Error(
        parsed.success
          ? (parsed.data.error ?? `Request failed (${response.status}).`)
          : `Request failed (${response.status}).`,
      );
    }
    if (body === null) {
      throw new Error(
        "The server returned an empty response. Refresh and try again.",
      );
    }
    return schema.parse(body);
  } finally {
    if (typeof window !== "undefined")
      window.dispatchEvent(new Event("vilek:loading-end"));
  }
}
const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

export function OperationsFlightCrewPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [groupBy, setGroupBy] = useState<"date-flight-designation" | "none">(
    "date-flight-designation",
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const [expandedFlights, setExpandedFlights] = useState<Set<string>>(
    () => new Set(),
  );
  const [manifests, setManifests] = useState<Record<string, AssignmentRow[]>>(
    {},
  );
  const [manifestErrors, setManifestErrors] = useState<Record<string, string>>(
    {},
  );
  const [loadingManifests, setLoadingManifests] = useState<Set<string>>(
    () => new Set(),
  );
  const toggleGroup = (key: string) =>
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const [creating, setCreating] = useState(false);
  const [flightId, setFlightId] = useState("");
  const [crewMemberId, setCrewMemberId] = useState("");
  const [designationId, setDesignationId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const list = useQuery({
    queryKey: ["operations-flight-crew", search, page, pageSize, groupBy],
    queryFn: () =>
      requestJson(
        `/api/operations/flight-crew?q=${encodeURIComponent(search)}&page=${page}&pageSize=${pageSize}`,
        listResponseSchema,
      ),
  });
  const optionsQuery = useQuery({
    queryKey: ["operations-flight-crew-options"],
    queryFn: () =>
      requestJson("/api/operations/flight-crew/options", optionsResponseSchema),
  });
  const options: Options = optionsQuery.data?.options ?? {
    flights: [],
    crewMembers: [],
    designations: [],
  };
  const selectedFlight = options.flights.find(
    (flight) => flight.id === flightId,
  );

  const create = useMutation({
    mutationFn: () =>
      requestJson("/api/operations/flight-crew", mutationResponseSchema, {
        method: "POST",
        body: JSON.stringify({
          flightId,
          crewMemberId,
          designationId: Number(designationId),
        }),
      }),
    onSuccess: async () => {
      setNotice("Crew assignment created.");
      setError("");
      setCreating(false);
      setFlightId("");
      setCrewMemberId("");
      setDesignationId("");
      await queryClient.invalidateQueries({
        queryKey: ["operations-flight-crew"],
      });
    },
    onError: (e) => {
      setError(e.message);
      setNotice("");
    },
  });
  const remove = useMutation({
    mutationFn: (input: { row: AssignmentRow; reason: string }) =>
      requestJson(
        `/api/operations/flight-crew/${encodeURIComponent(input.row.id)}`,
        mutationResponseSchema,
        { method: "DELETE", body: JSON.stringify({ reason: input.reason }) },
      ),
    onSuccess: async () => {
      setNotice("Crew assignment removed and recorded in audit history.");
      setError("");
      await queryClient.invalidateQueries({
        queryKey: ["operations-flight-crew"],
      });
    },
    onError: (e) => {
      setError(e.message);
      setNotice("");
    },
  });
  const removeAssignment = (row: AssignmentRow) => {
    if (!window.confirm(`Remove ${row.crewMemberName} from this flight?`))
      return;
    const reason = window.prompt(
      "Enter the reason for removing this crew assignment (required):",
      "",
    );
    if (reason === null) return;
    if (reason.trim().length < 5) {
      setError("Enter a removal reason of at least 5 characters.");
      setNotice("");
      return;
    }
    setError("");
    setNotice("");
    remove.mutate({ row, reason: reason.trim() });
  };

  useEffect(() => {
    setPage(1);
  }, [search]);
  useEffect(() => {
    if (list.error) setError(list.error.message);
  }, [list.error]);
  const pagination = list.data?.pagination ?? {
    page,
    pageSize,
    total: 0,
    totalPages: 1,
  };
  const displayedFlights: FlightSummary[] = list.data?.rows ?? [];
  const groupedRows =
    groupBy === "date-flight-designation"
      ? (() => {
          const dates: Array<{
            key: string;
            label: string;
            flights: FlightSummary[];
          }> = [];
          for (const flight of displayedFlights) {
            const date = new Date(flight.scheduledDeparture);
            const dateKey = Number.isNaN(date.getTime())
              ? flight.scheduledDeparture.slice(0, 10)
              : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            const dateLabel = Number.isNaN(date.getTime())
              ? dateKey
              : date.toLocaleDateString(undefined, { dateStyle: "full" });
            let group = dates.find((item) => item.key === dateKey);
            if (!group) {
              group = { key: dateKey, label: dateLabel, flights: [] };
              dates.push(group);
            }
            group.flights.push(flight);
          }
          return dates;
        })()
      : [];
  const toggleFlight = async (flightId: string) => {
    if (expandedFlights.has(flightId)) {
      setExpandedFlights((current) => {
        const next = new Set(current);
        next.delete(flightId);
        return next;
      });
      return;
    }
    setExpandedFlights((current) => new Set(current).add(flightId));
    if (manifests[flightId] || loadingManifests.has(flightId)) return;
    setLoadingManifests((current) => new Set(current).add(flightId));
    setManifestErrors((current) => {
      const next = { ...current };
      delete next[flightId];
      return next;
    });
    try {
      const result = await requestJson(
        `/api/operations/flight-crew?flightId=${encodeURIComponent(flightId)}`,
        manifestResponseSchema,
      );
      setManifests((current) => ({ ...current, [flightId]: result.rows }));
    } catch (e) {
      setManifestErrors((current) => ({
        ...current,
        [flightId]:
          e instanceof Error
            ? e.message
            : "Could not load this flight manifest.",
      }));
    } finally {
      setLoadingManifests((current) => {
        const next = new Set(current);
        next.delete(flightId);
        return next;
      });
    }
  };
  const busy =
    list.isFetching ||
    optionsQuery.isFetching ||
    create.isPending ||
    remove.isPending;

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <div className="admin-eyebrow">FLIGHT OPERATIONS</div>
          <h1>Flight Crew</h1>
          <p>
            Assign eligible crew members to flights and maintain the flight crew
            manifest.
          </p>
        </div>
      </section>
      {notice && (
        <div className="admin-alert admin-alert-success" role="status">
          {notice}
        </div>
      )}
      {error && (
        <div className="admin-alert admin-alert-error" role="alert">
          {error}
        </div>
      )}

      {creating && (
        <div
          className="flight-crew-assignment-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCreating(false);
          }}
        >
          <section
            className="admin-panel admin-editor flight-crew-assignment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="flight-crew-assignment-title"
          >
            <div className="admin-panel-heading">
              <div>
                <h2 id="flight-crew-assignment-title">
                  New flight crew assignment
                </h2>
                <p>
                  Choose an active crew member and their designation for this
                  flight.
                </p>
              </div>
              <button
                className="admin-icon-button"
                type="button"
                onClick={() => setCreating(false)}
                aria-label="Close form"
              >
                ×
              </button>
            </div>
            {optionsQuery.isError && (
              <div className="admin-alert admin-alert-error">
                Could not load assignment options. Refresh and try again.
              </div>
            )}
            <form
              className="admin-record-form"
              onSubmit={(event) => {
                event.preventDefault();
                setNotice("");
                setError("");
                if (!flightId || !crewMemberId || !designationId) {
                  setError("Select a crew member and designation.");
                  return;
                }
                create.mutate();
              }}
            >
              <div className="admin-field flight-crew-selected-flight-field">
                <span>Flight</span>
                <div className="flight-crew-selected-flight">
                  {selectedFlight ? (
                    <>
                      <strong>
                        {selectedFlight.airlineName} —{" "}
                        {selectedFlight.flightNumber}
                      </strong>
                      <span>
                        {selectedFlight.originCode} ({selectedFlight.originCity}
                        ) → {selectedFlight.destinationCode} (
                        {selectedFlight.destinationCity})
                      </span>
                      <small>
                        Departure:{" "}
                        {formatDate(selectedFlight.scheduledDeparture)}
                      </small>
                    </>
                  ) : (
                    <strong>Selected flight</strong>
                  )}
                </div>
              </div>
              <label className="admin-field">
                <span>Crew member *</span>
                <select
                  value={crewMemberId}
                  onChange={(e) => setCrewMemberId(e.target.value)}
                  required
                >
                  <option value="">Select crew member…</option>
                  {options.crewMembers.map((crew) => (
                    <option key={crew.id} value={crew.id}>
                      {crew.name} · {crew.badgeNumber} ({crew.email})
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span>Designation *</span>
                <select
                  value={designationId}
                  onChange={(e) => setDesignationId(e.target.value)}
                  required
                >
                  <option value="">Select designation…</option>
                  {options.designations.map((designation) => (
                    <option key={designation.id} value={designation.id}>
                      {designation.name} ({designation.code})
                    </option>
                  ))}
                </select>
              </label>
              {options.flights.length === 0 && (
                <p>
                  No active flights are available. Create or activate a flight
                  first.
                </p>
              )}
              {options.crewMembers.length === 0 && (
                <p>
                  No active crew members are available. Register a user as a
                  crew member first.
                </p>
              )}
              {options.designations.length === 0 && (
                <p>
                  No active crew designations are available. Add a designation
                  first.
                </p>
              )}
              <div className="admin-form-actions">
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={() => setCreating(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-primary-button"
                  disabled={
                    busy ||
                    !options.flights.length ||
                    !options.crewMembers.length ||
                    !options.designations.length
                  }
                >
                  {create.isPending ? "Assigning…" : "Create assignment"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <section className="admin-panel admin-records-panel">
        <div className="admin-record-toolbar">
          <div>
            <h2>
              Flights{" "}
              <span className="admin-count-badge">{pagination.total}</span>
            </h2>
            <p>
              {pagination.total
                ? `Showing ${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(pagination.page * pagination.pageSize, pagination.total)} of ${pagination.total} flights`
                : "No matching flights to display"}
            </p>
          </div>
          <div className="admin-record-tools flight-crew-record-tools">
            <label className="admin-field flight-crew-group-select">
              <span>Group by</span>
              <select
                aria-label="Group assignments by"
                value={groupBy}
                onChange={(e) =>
                  setGroupBy(
                    e.target.value as "date-flight-designation" | "none",
                  )
                }
              >
                <option value="date-flight-designation">
                  Date → Time → Airline → Flight → Designation
                </option>
                <option value="none">None</option>
              </select>
            </label>
            <input
              aria-label="Search flight crew assignments"
              placeholder="Search flight, crew, badge, designation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="button"
              className="admin-secondary-button"
              onClick={() => void list.refetch()}
              disabled={busy}
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="admin-table-wrap flight-crew-table-wrap">
          <table className="admin-data-table flight-crew-table">
            <thead>
              <tr>
                <th>Flight / route</th>
                <th>Crew member</th>
                <th className="flight-crew-actions-heading">Actions</th>
              </tr>
            </thead>
            <tbody>
              {groupBy === "date-flight-designation"
                ? groupedRows.map((dateGroup) => (
                    <Fragment key={dateGroup.key}>
                      <tr className="flight-crew-group-heading">
                        <td
                          colSpan={3}
                          style={{
                            background: "#f1f5f8",
                            borderLeft: "3px solid #9aafbd",
                            padding: "6px 12px",
                            whiteSpace: "normal",
                          }}
                        >
                          <button
                            type="button"
                            className="flight-crew-group-toggle"
                            aria-expanded={
                              !collapsedGroups.has(`date:${dateGroup.key}`)
                            }
                            onClick={() => toggleGroup(`date:${dateGroup.key}`)}
                          >
                            <span
                              aria-hidden="true"
                              className="flight-crew-tree-icon"
                            >
                              {collapsedGroups.has(`date:${dateGroup.key}`)
                                ? "+"
                                : "−"}
                            </span>
                            <strong>{dateGroup.label}</strong>
                            <small>
                              {dateGroup.flights.length} flight
                              {dateGroup.flights.length === 1 ? "" : "s"}
                            </small>
                          </button>
                        </td>
                      </tr>
                      {!collapsedGroups.has(`date:${dateGroup.key}`) &&
                        dateGroup.flights.map((flight) => (
                          <Fragment key={flight.id}>
                            <tr className="flight-crew-flight-heading">
                              <td
                                colSpan={2}
                                style={{
                                  background: "#ffffff",
                                  borderLeft: "3px solid #dfe7ec",
                                  padding: "5px 12px 5px 48px",
                                  whiteSpace: "normal",
                                }}
                              >
                                <button
                                  type="button"
                                  className="flight-crew-group-toggle flight-crew-flight-toggle"
                                  aria-expanded={expandedFlights.has(flight.id)}
                                  onClick={() => void toggleFlight(flight.id)}
                                >
                                  <span
                                    aria-hidden="true"
                                    className="flight-crew-tree-icon"
                                  >
                                    {expandedFlights.has(flight.id) ? "−" : "+"}
                                  </span>
                                  <strong>
                                    {flight.airlineName} — {flight.flightNumber}
                                  </strong>
                                  <span>
                                    {flight.originCode} ({flight.originCity}) →{" "}
                                    {flight.destinationCode} (
                                    {flight.destinationCity})
                                  </span>
                                  <span>
                                    Departure:{" "}
                                    {formatDate(flight.scheduledDeparture)}
                                  </span>
                                  <small>Crew: {flight.crewCount}</small>
                                </button>
                              </td>
                              <td
                                className="flight-crew-flight-action-cell"
                                data-label="Actions"
                                style={{
                                  background: "#ffffff",
                                  whiteSpace: "nowrap",
                                  textAlign: "right",
                                  padding: "5px 12px",
                                }}
                              >
                                <button
                                  type="button"
                                  className="admin-secondary-button flight-crew-inline-assign"
                                  onClick={() => {
                                    setFlightId(flight.id);
                                    setCreating(true);
                                    setNotice("");
                                    setError("");
                                  }}
                                  disabled={busy}
                                >
                                  ＋ Assign
                                </button>
                              </td>
                            </tr>
                            {expandedFlights.has(flight.id) &&
                              (loadingManifests.has(flight.id) ? (
                                <tr>
                                  <td
                                    colSpan={3}
                                    style={{
                                      padding: "12px 48px",
                                      color: "#607487",
                                    }}
                                  >
                                    Loading crew manifest…
                                  </td>
                                </tr>
                              ) : manifestErrors[flight.id] ? (
                                <tr>
                                  <td
                                    colSpan={3}
                                    style={{
                                      padding: "12px 48px",
                                      color: "#b42318",
                                    }}
                                  >
                                    {manifestErrors[flight.id]}{" "}
                                    <button
                                      type="button"
                                      className="admin-secondary-button"
                                      onClick={() => {
                                        setManifests((current) => {
                                          const next = { ...current };
                                          delete next[flight.id];
                                          return next;
                                        });
                                        void toggleFlight(flight.id);
                                      }}
                                    >
                                      Retry
                                    </button>
                                  </td>
                                </tr>
                              ) : (manifests[flight.id] ?? []).length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={3}
                                    style={{
                                      padding: "12px 48px",
                                      color: "#607487",
                                    }}
                                  >
                                    No crew assigned to this flight yet.
                                  </td>
                                </tr>
                              ) : (
                                (() => {
                                  const rows = manifests[flight.id] ?? [];
                                  const designations = Array.from(
                                    new Set(
                                      rows.map((row) => row.designationId),
                                    ),
                                  );
                                  return designations.map((designationId) => {
                                    const members = rows.filter(
                                      (row) =>
                                        row.designationId === designationId,
                                    );
                                    return (
                                      <Fragment key={designationId}>
                                        <tr className="flight-crew-group-heading">
                                          <td
                                            colSpan={3}
                                            style={{
                                              background: "#fafbfd",
                                              borderLeft: "3px solid #e7edf2",
                                              padding: "5px 78px",
                                              whiteSpace: "normal",
                                            }}
                                          >
                                            <span
                                              aria-hidden="true"
                                              className="flight-crew-tree-marker"
                                            >
                                              •
                                            </span>
                                            <strong>
                                              {members[0].designationName}
                                            </strong>
                                            <small style={{ marginLeft: 8 }}>
                                              {members.length} member
                                              {members.length === 1 ? "" : "s"}
                                            </small>
                                          </td>
                                        </tr>
                                        {members.map((row) => (
                                          <tr key={row.id}>
                                            <td data-label="Flight / route" />
                                            <td data-label="Crew member">
                                              <div>{row.crewMemberName}</div>
                                              <small>
                                                Badge: {row.badgeNumber}
                                              </small>
                                            </td>
                                            <td data-label="Actions">
                                              <div className="admin-row-actions">
                                                <button
                                                  type="button"
                                                  className="admin-table-action is-danger"
                                                  disabled={busy}
                                                  onClick={() => {
                                                    removeAssignment(row);
                                                  }}
                                                >
                                                  Remove
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </Fragment>
                                    );
                                  });
                                })()
                              ))}
                          </Fragment>
                        ))}
                    </Fragment>
                  ))
                : displayedFlights.map((flight) => (
                    <Fragment key={flight.id}>
                      <tr>
                        <td>
                          <strong>
                            {flight.airlineName} — {flight.flightNumber}
                          </strong>
                          <small style={{ display: "block" }}>
                            {flight.originCode} → {flight.destinationCode}
                          </small>
                        </td>
                        <td>{flight.crewCount} crew members</td>
                        <td>
                          <button
                            type="button"
                            className="admin-secondary-button"
                            onClick={() => void toggleFlight(flight.id)}
                          >
                            {expandedFlights.has(flight.id)
                              ? "Hide crew"
                              : "Load crew"}
                          </button>
                        </td>
                      </tr>
                      {expandedFlights.has(flight.id) &&
                        (manifests[flight.id] ?? []).map((row) => (
                          <tr key={row.id}>
                            <td />
                            <td>
                              {row.crewMemberName}{" "}
                              <small>Badge: {row.badgeNumber}</small>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="admin-table-action is-danger"
                                onClick={() => removeAssignment(row)}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                    </Fragment>
                  ))}
              {!list.isFetching && (list.data?.rows.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={3} className="admin-table-empty">
                    {search
                      ? "No flights match your search."
                      : "No crew assignments exist for these flights yet. Select Assign crew to create an assignment."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flight-crew-mobile-view">
          {groupBy === "date-flight-designation"
            ? groupedRows.map((dateGroup) => (
                <section
                  className="flight-crew-mobile-date"
                  key={dateGroup.key}
                >
                  <button
                    type="button"
                    className="flight-crew-mobile-date-toggle"
                    aria-expanded={
                      !collapsedGroups.has(`date:${dateGroup.key}`)
                    }
                    onClick={() => toggleGroup(`date:${dateGroup.key}`)}
                  >
                    <span className="flight-crew-tree-icon" aria-hidden="true">
                      {collapsedGroups.has(`date:${dateGroup.key}`) ? "+" : "−"}
                    </span>
                    <span>{dateGroup.label}</span>
                    <small>
                      {dateGroup.flights.length} flight
                      {dateGroup.flights.length === 1 ? "" : "s"}
                    </small>
                  </button>
                  {!collapsedGroups.has(`date:${dateGroup.key}`) && (
                    <div className="flight-crew-mobile-date-content">
                      {dateGroup.flights.map((flight) => (
                        <article
                          className="flight-crew-mobile-flight"
                          key={flight.id}
                        >
                          <button
                            type="button"
                            className="flight-crew-mobile-flight-toggle"
                            aria-expanded={expandedFlights.has(flight.id)}
                            onClick={() => void toggleFlight(flight.id)}
                          >
                            <span
                              className="flight-crew-tree-icon"
                              aria-hidden="true"
                            >
                              {expandedFlights.has(flight.id) ? "−" : "+"}
                            </span>
                            <span className="flight-crew-mobile-flight-title">
                              {flight.airlineName} — {flight.flightNumber}
                            </span>
                            <span className="flight-crew-mobile-route">
                              {flight.originCode} ({flight.originCity}) →{" "}
                              {flight.destinationCode} ({flight.destinationCity}
                              )
                            </span>
                            <span className="flight-crew-mobile-meta">
                              <span>
                                {formatDate(flight.scheduledDeparture)}
                              </span>
                              <span>{flight.crewCount} crew</span>
                            </span>
                          </button>
                          <div className="flight-crew-mobile-flight-actions">
                            <button
                              type="button"
                              className="admin-secondary-button flight-crew-mobile-assign"
                              onClick={() => {
                                setFlightId(flight.id);
                                setCreating(true);
                                setNotice("");
                                setError("");
                              }}
                              disabled={busy}
                            >
                              ＋ Assign crew
                            </button>
                          </div>
                          {expandedFlights.has(flight.id) && (
                            <div className="flight-crew-mobile-manifest">
                              {loadingManifests.has(flight.id) ? (
                                <p className="flight-crew-mobile-message">
                                  Loading crew manifest…
                                </p>
                              ) : manifestErrors[flight.id] ? (
                                <p className="flight-crew-mobile-message is-error">
                                  {manifestErrors[flight.id]}{" "}
                                  <button
                                    type="button"
                                    className="admin-secondary-button"
                                    onClick={() => {
                                      setManifests((current) => {
                                        const next = { ...current };
                                        delete next[flight.id];
                                        return next;
                                      });
                                      void toggleFlight(flight.id);
                                    }}
                                  >
                                    Retry
                                  </button>
                                </p>
                              ) : (manifests[flight.id] ?? []).length === 0 ? (
                                <p className="flight-crew-mobile-message">
                                  No crew assigned to this flight yet.
                                </p>
                              ) : (
                                (() => {
                                  const rows = manifests[flight.id] ?? [];
                                  const designations = Array.from(
                                    new Set(
                                      rows.map((row) => row.designationId),
                                    ),
                                  );
                                  return designations.map((designationId) => {
                                    const members = rows.filter(
                                      (row) =>
                                        row.designationId === designationId,
                                    );
                                    return (
                                      <section
                                        className="flight-crew-mobile-designation"
                                        key={designationId}
                                      >
                                        <div className="flight-crew-mobile-designation-heading">
                                          <span aria-hidden="true">•</span>
                                          <strong>
                                            {members[0].designationName}
                                          </strong>
                                          <small>
                                            {members.length} member
                                            {members.length === 1 ? "" : "s"}
                                          </small>
                                        </div>
                                        <div className="flight-crew-mobile-members">
                                          {members.map((row) => (
                                            <article
                                              className="flight-crew-mobile-member"
                                              key={row.id}
                                            >
                                              <div className="flight-crew-mobile-member-info">
                                                <strong>
                                                  {row.crewMemberName}
                                                </strong>
                                                <span>
                                                  Badge: {row.badgeNumber}
                                                </span>
                                              </div>
                                              <button
                                                type="button"
                                                className="admin-table-action is-danger"
                                                disabled={busy}
                                                onClick={() => {
                                                  removeAssignment(row);
                                                }}
                                              >
                                                Remove
                                              </button>
                                            </article>
                                          ))}
                                        </div>
                                      </section>
                                    );
                                  });
                                })()
                              )}
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              ))
            : displayedFlights.map((flight) => (
                <article className="flight-crew-mobile-flight" key={flight.id}>
                  <div className="flight-crew-mobile-flight-title">
                    {flight.airlineName} — {flight.flightNumber}
                  </div>
                  <div className="flight-crew-mobile-route">
                    {flight.originCode} → {flight.destinationCode}
                  </div>
                  <div className="flight-crew-mobile-meta">
                    {flight.crewCount} crew members
                  </div>
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={() => void toggleFlight(flight.id)}
                  >
                    {expandedFlights.has(flight.id) ? "Hide crew" : "Load crew"}
                  </button>
                  {expandedFlights.has(flight.id) &&
                    (manifests[flight.id] ?? []).map((row) => (
                      <article
                        className="flight-crew-mobile-member"
                        key={row.id}
                      >
                        <div className="flight-crew-mobile-member-info">
                          <strong>{row.crewMemberName}</strong>
                          <span>Badge: {row.badgeNumber}</span>
                        </div>
                        <button
                          type="button"
                          className="admin-table-action is-danger"
                          onClick={() => removeAssignment(row)}
                        >
                          Remove
                        </button>
                      </article>
                    ))}
                </article>
              ))}
          {!list.isFetching && (list.data?.rows.length ?? 0) === 0 && (
            <div className="flight-crew-mobile-empty">
              {search
                ? "No flights match your search."
                : "No crew assignments exist for these flights yet. Select Assign crew to create an assignment."}
            </div>
          )}
        </div>
        <div className="admin-pagination">
          <label>
            Flights per page{" "}
            <select
              aria-label="Flights per page"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="admin-row-actions">
            <button
              type="button"
              className="admin-secondary-button"
              disabled={page <= 1 || busy}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="admin-secondary-button"
              disabled={page >= pagination.totalPages || busy}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
