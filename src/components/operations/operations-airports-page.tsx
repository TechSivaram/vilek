"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formSchema } from "@/lib/operations/features/airports/schema";
import type { AirportsFormDto } from "@/lib/operations/features/airports/dto";
import type {
  AirportsListRow,
  AirportsListResult,
} from "@/lib/operations/features/airports/dto";

async function requestJson<T = any>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error ?? "Request failed.");
  return d as T;
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
const PAGE = "/api/operations/airports";
export function OperationsAirportsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<AirportsListRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const form = useForm<AirportsFormDto>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      iataCode: "",
      icaoCode: "",
      name: "",
      city: "",
      country: "",
      timeZone: "Asia/Kolkata",
      isActive: true,
    },
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const list = useQuery<AirportsListResult>({
    queryKey: ["operations-airports", search, page, pageSize],
    queryFn: () =>
      requestJson(
        `${PAGE}?q=${encodeURIComponent(search)}&page=${page}&pageSize=${pageSize}`,
      ),
  });

  const save = useMutation({
    mutationFn: (args: { id?: string | number; values: unknown }) =>
      requestJson<{ success?: boolean; message?: string }>(
        args.id ? `${PAGE}/${encodeURIComponent(String(args.id))}` : PAGE,
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
      await qc.invalidateQueries({ queryKey: ["operations-airports"] });
    },
  });
  const deactivate = useMutation({
    mutationFn: (row: AirportsListRow) =>
      requestJson(`${PAGE}/${encodeURIComponent(String(row.id))}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      setMessage("Record deactivated.");
      await qc.invalidateQueries({ queryKey: ["operations-airports"] });
    },
  });

  const options = list.data?.options ?? {};
  const busy = list.isFetching || save.isPending || deactivate.isPending;
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
      iataCode: "",
      icaoCode: "",
      name: "",
      city: "",
      country: "",
      timeZone: "Asia/Kolkata",
      isActive: true,
    });
  };
  const beginEdit = (row: AirportsListRow) => {
    setEditing(row);
    setCreating(false);
    setMessage("");
    setError("");
    form.reset({
      iataCode: row.iataCode,
      icaoCode: row.icaoCode,
      name: row.name,
      city: row.city,
      country: row.country,
      timeZone: row.timeZone,
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
      const payload = formSchema.parse(values);
      await save.mutateAsync({ id: editing?.id, values: payload });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  });
  return (
    <>
      <section className="admin-page-heading">
        <div>
          <div className="admin-eyebrow">FLIGHT OPERATIONS</div>
          <h1>Airports</h1>
          <p>Maintain airport codes, locations and time zones.</p>
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
              <h2>{editing ? "Edit " : "Add "}Airports</h2>
              <p>Maintain airport codes, locations and time zones.</p>
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
              <span>IATA code *</span>
              <input type="text" {...form.register("iataCode")} />
              {form.formState.errors.iataCode?.message && (
                <small className="admin-field-error">
                  {String(form.formState.errors.iataCode?.message)}
                </small>
              )}
            </label>
            <label className="admin-field">
              <span>ICAO code *</span>
              <input type="text" {...form.register("icaoCode")} />
              {form.formState.errors.icaoCode?.message && (
                <small className="admin-field-error">
                  {String(form.formState.errors.icaoCode?.message)}
                </small>
              )}
            </label>
            <label className="admin-field">
              <span>Airport name *</span>
              <input type="text" {...form.register("name")} />
              {form.formState.errors.name?.message && (
                <small className="admin-field-error">
                  {String(form.formState.errors.name?.message)}
                </small>
              )}
            </label>
            <label className="admin-field">
              <span>City *</span>
              <input type="text" {...form.register("city")} />
              {form.formState.errors.city?.message && (
                <small className="admin-field-error">
                  {String(form.formState.errors.city?.message)}
                </small>
              )}
            </label>
            <label className="admin-field">
              <span>Country *</span>
              <input type="text" {...form.register("country")} />
              {form.formState.errors.country?.message && (
                <small className="admin-field-error">
                  {String(form.formState.errors.country?.message)}
                </small>
              )}
            </label>
            <label className="admin-field">
              <span>IANA time zone *</span>
              <input type="text" {...form.register("timeZone")} />
              {form.formState.errors.timeZone?.message && (
                <small className="admin-field-error">
                  {String(form.formState.errors.timeZone?.message)}
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
              aria-label="Search Airports"
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
                <th key="iataCode">IATA</th>
                <th key="icaoCode">ICAO</th>
                <th key="name">Airport</th>
                <th key="city">City</th>
                <th key="country">Country</th>
                <th key="timeZone">Time zone</th>
                <th key="isActive">Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(list.data?.rows ?? []).map((row: AirportsListRow) => (
                <tr key={String(row.id)}>
                  <td key="iataCode" data-label="IATA">
                    {row.iataCode ?? "—"}
                  </td>
                  <td key="icaoCode" data-label="ICAO">
                    {row.icaoCode ?? "—"}
                  </td>
                  <td key="name" data-label="Airport">
                    {row.name ?? "—"}
                  </td>
                  <td key="city" data-label="City">
                    {row.city ?? "—"}
                  </td>
                  <td key="country" data-label="Country">
                    {row.country ?? "—"}
                  </td>
                  <td key="timeZone" data-label="Time zone">
                    {row.timeZone ?? "—"}
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
                              window.confirm(`Deactivate this airports record?`)
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
                  <td colSpan={8} className="admin-table-empty">
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
