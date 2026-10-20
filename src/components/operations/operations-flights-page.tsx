"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  formSchema,
  flightMutationResponseSchema,
  flightOptionsResponseSchema,
  flightsListResponseSchema,
} from "@/lib/operations/features/flights/schema";
import type {
  FlightFormDto,
  FlightListRow,
  FlightMutationResponseDto,
  FlightOptionsResponseDto,
  FlightsListResponseDto,
} from "@/lib/operations/features/flights/dto";

async function requestJson<T>(
  url: string,
  responseSchema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const errorPayload = z
      .object({ error: z.string().optional() })
      .safeParse(body);
    throw new Error(
      errorPayload.success
        ? (errorPayload.data.error ?? "Request failed.")
        : "Request failed.",
    );
  }
  return responseSchema.parse(body);
}
const dateText = (v: string | null | undefined) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};
const toLocal = (v: string | null | undefined) => {
  if (!v) return "";
  const d = new Date(v);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const PAGE = "/api/operations/flights";
export function OperationsFlightsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<FlightListRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const form = useForm<FlightFormDto>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      airlineId: 0,
      flightNumber: "",
      originAirportId: 0,
      destinationAirportId: 0,
      scheduledDeparture: "",
      scheduledArrival: "",
      actualDeparture: "",
      actualArrival: "",
      isActive: true,
    },
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const list = useQuery<FlightsListResponseDto>({
    queryKey: ["operations-flights", search, page, pageSize],
    queryFn: () =>
      requestJson(
        `${PAGE}?q=${encodeURIComponent(search)}&page=${page}&pageSize=${pageSize}`,
        flightsListResponseSchema,
      ),
  });
  const flightOptions = useQuery<FlightOptionsResponseDto>({
    queryKey: ["flight-options"],
    queryFn: () =>
      requestJson(
        "/api/operations/flights/options",
        flightOptionsResponseSchema,
      ),
    enabled: creating || Boolean(editing),
  });
  const save = useMutation({
    mutationFn: (args: { id?: string | number; values: FlightFormDto }) =>
      requestJson<FlightMutationResponseDto>(
        args.id ? `${PAGE}/${encodeURIComponent(String(args.id))}` : PAGE,
        flightMutationResponseSchema,
        {
          method: args.id ? "PATCH" : "POST",
          body: JSON.stringify(args.values),
        },
      ),
    onSuccess: async (d) => {
      setMessage("Changes saved.");
      setError("");
      setCreating(false);
      setEditing(null);
      form.reset({});
      await qc.invalidateQueries({ queryKey: ["operations-flights"] });
    },
  });
  const deactivate = useMutation({
    mutationFn: (row: FlightListRow) =>
      requestJson(
        `${PAGE}/${encodeURIComponent(String(row.id))}`,
        flightMutationResponseSchema,
        { method: "DELETE" },
      ),
    onSuccess: async () => {
      setMessage("Record deactivated.");
      await qc.invalidateQueries({ queryKey: ["operations-flights"] });
    },
  });

  const options = flightOptions.data?.options ?? { airlines: [], airports: [] };
  const busy =
    list.isFetching ||
    flightOptions.isFetching ||
    save.isPending ||
    deactivate.isPending;
  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);
  useEffect(() => {
    const e = list.error ?? save.error ?? deactivate.error;
    if (e) setError(e.message);
  }, [list.error, save.error, deactivate.error]);
  const pagination = list.data?.pagination ?? {
    page,
    pageSize,
    total: 0,
    totalPages: 1,
  };
  const beginCreate = () => {
    setEditing(null);
    setCreating(true);
    setMessage("");
    setError("");
    form.reset({
      airlineId: 0,
      flightNumber: "",
      originAirportId: 0,
      destinationAirportId: 0,
      scheduledDeparture: "",
      scheduledArrival: "",
      actualDeparture: "",
      actualArrival: "",
      isActive: true,
    });
  };
  const beginEdit = (row: FlightListRow) => {
    setEditing(row);
    setCreating(false);
    setMessage("");
    setError("");
    form.reset({
      airlineId: row.airlineId,
      flightNumber: row.flightNumber,
      originAirportId: row.originAirportId,
      destinationAirportId: row.destinationAirportId,
      scheduledDeparture: toLocal(row.scheduledDeparture),
      scheduledArrival: toLocal(row.scheduledArrival),
      actualDeparture: toLocal(row.actualDeparture),
      actualArrival: toLocal(row.actualArrival),
      isActive: row.isActive,
    });
  };
  const cancel = () => {
    setCreating(false);
    setEditing(null);
    form.reset({});
  };
  const submit = form.handleSubmit(async (values) => {
    try {
      const payload = {
        ...values,
        scheduledDeparture: new Date(values.scheduledDeparture).toISOString(),
        scheduledArrival: new Date(values.scheduledArrival).toISOString(),
        actualDeparture: values.actualDeparture
          ? new Date(values.actualDeparture).toISOString()
          : null,
        actualArrival: values.actualArrival
          ? new Date(values.actualArrival).toISOString()
          : null,
      };
      const validatedPayload = formSchema.parse(payload);
      await save.mutateAsync({ id: editing?.id, values: validatedPayload });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  });
  return (
    <>
      <section className="admin-page-heading">
        <div>
          <div className="admin-eyebrow">FLIGHT OPERATIONS</div>
          <h1>Flights</h1>
          <p>Maintain scheduled flight records and operational details.</p>
        </div>
        <div className="admin-heading-actions">
          {true && (
            <button
              type="button"
              className="admin-primary-button"
              onClick={beginCreate}
              disabled={busy}
            >
              ＋ Add record
            </button>
          )}
        </div>
      </section>
      {message && (
        <div className="admin-alert admin-alert-success" role="status">
          {message}
        </div>
      )}
      {error && (
        <div className="admin-alert admin-alert-error" role="alert">
          {error}
        </div>
      )}
      {(creating || editing) && (
        <section className="admin-panel admin-editor">
          <div className="admin-panel-heading">
            <div>
              <h2>{editing ? "Edit " : "Add "}Flights</h2>
              <p>Maintain scheduled flight records and operational details.</p>
            </div>
            <button
              className="admin-icon-button"
              type="button"
              onClick={cancel}
            >
              ×
            </button>
          </div>
          <form className="admin-record-form" onSubmit={submit} noValidate>
            <label className="admin-field">
              <span>Airline *</span>
              <select
                {...form.register("airlineId", {
                  setValueAs: (v: string) => (v === "" ? undefined : Number(v)),
                })}
              >
                <option value="">Select…</option>
                {(options.airlines ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.iataCode} — {o.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.airlineId?.message && (
                <small className="admin-field-error">
                  {String(form.formState.errors.airlineId?.message)}
                </small>
              )}
            </label>
            <label className="admin-field">
              <span>Flight number *</span>
              <input type="text" {...form.register("flightNumber")} />
              {form.formState.errors.flightNumber?.message && (
                <small className="admin-field-error">
                  {String(form.formState.errors.flightNumber?.message)}
                </small>
              )}
            </label>
            <label className="admin-field">
              <span>Origin airport *</span>
              <select
                {...form.register("originAirportId", {
                  setValueAs: (v: string) => (v === "" ? undefined : Number(v)),
                })}
              >
                <option value="">Select…</option>
                {(options.airports ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.iataCode} — {o.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.originAirportId?.message && (
                <small className="admin-field-error">
                  {String(form.formState.errors.originAirportId?.message)}
                </small>
              )}
            </label>
            <label className="admin-field">
              <span>Destination airport *</span>
              <select
                {...form.register("destinationAirportId", {
                  setValueAs: (v: string) => (v === "" ? undefined : Number(v)),
                })}
              >
                <option value="">Select…</option>
                {(options.airports ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.iataCode} — {o.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.destinationAirportId?.message && (
                <small className="admin-field-error">
                  {String(form.formState.errors.destinationAirportId?.message)}
                </small>
              )}
            </label>
            <label className="admin-field">
              <span>Scheduled departure *</span>
              <input
                type="datetime-local"
                {...form.register("scheduledDeparture")}
              />
              {form.formState.errors.scheduledDeparture?.message && (
                <small className="admin-field-error">
                  {String(form.formState.errors.scheduledDeparture?.message)}
                </small>
              )}
            </label>
            <label className="admin-field">
              <span>Scheduled arrival *</span>
              <input
                type="datetime-local"
                {...form.register("scheduledArrival")}
              />
              {form.formState.errors.scheduledArrival?.message && (
                <small className="admin-field-error">
                  {String(form.formState.errors.scheduledArrival?.message)}
                </small>
              )}
            </label>
            <label className="admin-field">
              <span>Actual departure (optional)</span>
              <input
                type="datetime-local"
                {...form.register("actualDeparture")}
              />
              {form.formState.errors.actualDeparture?.message && (
                <small className="admin-field-error">
                  {String(form.formState.errors.actualDeparture?.message)}
                </small>
              )}
            </label>
            <label className="admin-field">
              <span>Actual arrival (optional)</span>
              <input
                type="datetime-local"
                {...form.register("actualArrival")}
              />
              {form.formState.errors.actualArrival?.message && (
                <small className="admin-field-error">
                  {String(form.formState.errors.actualArrival?.message)}
                </small>
              )}
            </label>
            <label className="admin-field admin-field-checkbox">
              <input type="checkbox" {...form.register("isActive")} />
              <span>Active</span>
            </label>
            <div className="admin-form-actions">
              <button
                type="button"
                className="admin-secondary-button"
                onClick={cancel}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="admin-primary-button"
                disabled={busy}
              >
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </section>
      )}
      <section className="admin-panel admin-records-panel">
        <div className="admin-record-toolbar">
          <div>
            <h2>
              Records{" "}
              <span className="admin-count-badge">{pagination.total}</span>
            </h2>
            <p>
              {pagination.total
                ? `Showing ${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(pagination.page * pagination.pageSize, pagination.total)} of ${pagination.total} records`
                : "No records to display"}
            </p>
          </div>
          <div className="admin-record-tools">
            <input
              aria-label="Search Flights"
              placeholder="Search records…"
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
        <div className="admin-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th key="airlineName">Airline</th>
                <th key="flightNumber">Flight number</th>
                <th key="originAirportName">Origin airport</th>
                <th key="destinationAirportName">Destination airport</th>
                <th key="scheduledDeparture">Scheduled departure</th>
                <th key="scheduledArrival">Scheduled arrival</th>
                <th key="actualDeparture">Actual departure</th>
                <th key="actualArrival">Actual arrival</th>
                <th key="isActive">Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(list.data?.rows ?? []).map((row: FlightListRow) => (
                <tr key={String(row.id)}>
                  <td key="airlineName" data-label="Airline">
                    {[row.airlineCode, row.airlineName]
                      .filter(Boolean)
                      .join(" — ") || "—"}
                  </td>
                  <td key="flightNumber" data-label="Flight number">
                    {row.flightNumber ?? "—"}
                  </td>
                  <td key="originAirportName" data-label="Origin airport">
                    {[
                      row.originAirportCode,
                      row.originAirportName,
                      row.originAirportCity,
                    ]
                      .filter(Boolean)
                      .join(" — ") || "—"}
                  </td>
                  <td
                    key="destinationAirportName"
                    data-label="Destination airport"
                  >
                    {[
                      row.destinationAirportCode,
                      row.destinationAirportName,
                      row.destinationAirportCity,
                    ]
                      .filter(Boolean)
                      .join(" — ") || "—"}
                  </td>
                  <td key="scheduledDeparture" data-label="Scheduled departure">
                    {dateText(row.scheduledDeparture)}
                  </td>
                  <td key="scheduledArrival" data-label="Scheduled arrival">
                    {dateText(row.scheduledArrival)}
                  </td>
                  <td key="actualDeparture" data-label="Actual departure">
                    {dateText(row.actualDeparture)}
                  </td>
                  <td key="actualArrival" data-label="Actual arrival">
                    {dateText(row.actualArrival)}
                  </td>
                  <td key="isActive" data-label="Status">
                    {row.isActive ? (
                      <span className="admin-status-pill is-active">
                        Active
                      </span>
                    ) : (
                      <span className="admin-status-pill is-inactive">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td data-label="Actions">
                    <div className="admin-row-actions">
                      <button
                        type="button"
                        className="admin-table-action"
                        onClick={() => beginEdit(row)}
                        disabled={busy}
                      >
                        Edit
                      </button>
                      {row.isActive && (
                        <button
                          type="button"
                          className="admin-table-action is-danger"
                          onClick={() => {
                            if (
                              window.confirm(`Deactivate this flights record?`)
                            )
                              deactivate.mutate(row);
                          }}
                          disabled={busy}
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!list.data?.rows.length && (
                <tr>
                  <td colSpan={10} className="admin-table-empty">
                    {busy ? "Loading records…" : "No records found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="admin-pagination">
          <label>
            Rows per page{" "}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
          <div className="admin-pagination-controls">
            <button
              type="button"
              className="admin-secondary-button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || busy}
            >
              Previous
            </button>
            <span>
              Page {pagination.page} of {Math.max(1, pagination.totalPages)}
            </span>
            <button
              type="button"
              className="admin-secondary-button"
              onClick={() =>
                setPage((p) => Math.min(pagination.totalPages, p + 1))
              }
              disabled={page >= pagination.totalPages || busy}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
