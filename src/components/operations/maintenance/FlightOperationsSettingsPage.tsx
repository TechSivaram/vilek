"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

type Option = { value: string | number; label: string };
type Resource = {
  key: string;
  label: string;
  writable: boolean;
  columns: string[];
  displayColumns?: string[];
  rows: Record<string, unknown>[];
  options?: Record<string, Option[]>;
};
const fieldLabels: Record<string, string> = {
  crew_member_id: "Crew member",
  designation_id: "Designation",
  valid_from: "Valid from",
  valid_until: "Valid until",
  is_active: "Active",
  code: "Code",
  name: "Name",
  expiry_required: "Expiry required",
  qualification_type_id: "Qualification type",
  status: "Status",
  replaced_by_id: "Replaced by qualification",
  notes: "Notes",
  is_required: "Required",
  required_count: "Required crew count",
  flight_id: "Flight",
  reason: "Reason for override",
  setting_key: "Setting",
  value_json: "Setting value (JSON)",
  description: "Description",
  crew_qualification_id: "Crew qualification",
  alert_interval_days: "Alert interval (days)",
  due_at: "Due date",
  state: "Alert state",
  generated_at: "Generated at",
  resolved_at: "Resolved at",
  id: "Record ID",
  retention_days: "Retention period (days)",
  flight_number: "Flight",
  crew_name: "Crew member",
  designation_name: "Designation",
  qualification_name: "Qualification",
  badge_number: "Badge number",
  flight_route: "Route",
  actor_email_snapshot: "Changed by",
  action: "Action",
  created_at: "Created at",
  affected_count: "Affected records",
  format: "Format",
  row_count: "Rows exported",
  cutoff_at: "Cutoff date",
  setting_description: "Description",
};
const humanize = (key: string) =>
  fieldLabels[key] ?? key.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
const emptyValue = (key: string) =>
  ["is_active", "expiry_required", "is_required"].includes(key)
    ? "1"
    : key === "status"
      ? "ACTIVE"
      : key === "state"
        ? "PENDING"
        : key === "value_json"
          ? "{}"
          : "";
export function FlightOperationsSettingsPage() {
  const selected = "flight-operations-settings";
  const [data, setData] = useState<Resource | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    window.dispatchEvent(new Event("vilek:loading-start"));
    try {
      const r = await fetch("/api/operations/flight-operations-settings", {
        cache: "no-store",
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Unable to load records.");
      setData({ key: selected, ...j });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load records.");
      setData(null);
    } finally {
      setLoading(false);
      window.dispatchEvent(new Event("vilek:loading-end"));
    }
  }, []);
  useEffect(() => {
    void load();
    setForm({});
    setEditingId(null);
    setFormOpen(false);
    setPage(1);
    setNotice("");
  }, [load]);
  const columns = useMemo(() => data?.columns ?? [], [data]);
  const displayColumns = useMemo(
    () =>
      (data?.displayColumns ?? (data?.rows?.[0] ? Object.keys(data.rows[0]) : [])).filter(
        (k) => !["id", "record_id"].includes(k),
      ),
    [data],
  );
  const label = "Flight Operations settings";
  const rows = data?.rows ?? [];
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const filteredRows = normalizedSearch
    ? rows.filter((row) =>
        Object.values(row).some(
          (value) =>
            value !== null &&
            value !== undefined &&
            String(value).toLocaleLowerCase().includes(normalizedSearch),
        ),
      )
    : rows;
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  function edit(row: Record<string, unknown>) {
    setEditingId(row.id as string | number);
    setForm(Object.fromEntries(columns.map((c) => [c, row[c] == null ? "" : String(row[c])])));
    setNotice("");
    setError("");
    setFormOpen(true);
  }
  function create() {
    setEditingId(null);
    setForm(Object.fromEntries(columns.map((c) => [c, emptyValue(c)])));
    setNotice("");
    setError("");
    setFormOpen(true);
  }
  async function save() {
    setSaving(true);
    setError("");
    setNotice("");
    window.dispatchEvent(new Event("vilek:loading-start"));
    try {
      const body: Record<string, unknown> = {};
      for (const c of columns) {
        const v = form[c] ?? "";
        if (v !== "")
          body[c] =
            [
              "crew_member_id",
              "designation_id",
              "qualification_type_id",
              "flight_id",
              "crew_qualification_id",
              "replaced_by_id",
              "required_count",
              "expiry_required",
              "is_active",
              "is_required",
              "alert_interval_days",
              "retention_days",
              "id",
            ].includes(c) && Number.isFinite(Number(v))
              ? Number(v)
              : v;
      }
      const endpoint = "/api/operations/flight-operations-settings";
      const r = await fetch(editingId === null ? endpoint : `${endpoint}/${editingId}`, {
        method: editingId === null ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Save failed.");
      setNotice(
        editingId === null ? "Record created successfully." : "Changes saved successfully.",
      );
      setForm({});
      setEditingId(null);
      setFormOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
      window.dispatchEvent(new Event("vilek:loading-end"));
    }
  }
  return (
    <main className="ops-maintenance">
      <header className="admin-page-heading">
        <div>
          <div className="admin-eyebrow">FLIGHT OPERATIONS · CONFIGURATION</div>
          <h1>Operational data &amp; settings</h1>
          <p>
            Manage crew eligibility, qualifications, complement planning, operational rules, and
            audit history.
          </p>
        </div>
      </header>
      {error && (
        <div role="alert" className="ops-message error">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="ops-message success">
          {notice}
        </div>
      )}
      {formOpen && data?.writable && (
        <div
          className="ops-modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) setFormOpen(false);
          }}
        >
          <section
            className="ops-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ops-form-title"
          >
            <div className="ops-panel-heading">
              <div>
                <h2 id="ops-form-title">
                  {editingId === null
                    ? `Add ${label.toLowerCase()}`
                    : `Edit ${label.toLowerCase()}`}
                </h2>
                <p>Choose linked records by name. Existing values are preselected when editing.</p>
              </div>
              <button
                type="button"
                aria-label="Close form"
                className="ops-modal-close ops-action-button"
                onClick={() => setFormOpen(false)}
                disabled={saving}
              >
                ×
              </button>
            </div>
            {error && (
              <div role="alert" className="ops-message error">
                {error}
              </div>
            )}
            <div className="ops-form-grid">
              {columns
                .filter((c) => !(editingId === null && c === "id"))
                .map((c) => (
                  <label key={c}>
                    <span>
                      {humanize(c)}
                      {[
                        "crew_member_id",
                        "designation_id",
                        "qualification_type_id",
                        "valid_from",
                        "code",
                        "name",
                        "flight_id",
                        "required_count",
                        "setting_key",
                        "value_json",
                        "crew_qualification_id",
                        "alert_interval_days",
                        "due_at",
                      ].includes(c)
                        ? " *"
                        : ""}
                    </span>
                    {data?.options?.[c] ? (
                      <select
                        value={form[c] ?? ""}
                        onChange={(e) => setForm((o) => ({ ...o, [c]: e.target.value }))}
                      >
                        <option value="">Select {humanize(c).toLowerCase()}</option>
                        {data.options[c].map((option) => (
                          <option key={String(option.value)} value={String(option.value)}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : ["is_active", "expiry_required", "is_required"].includes(c) ? (
                      <select
                        value={form[c] ?? "1"}
                        onChange={(e) => setForm((o) => ({ ...o, [c]: e.target.value }))}
                      >
                        <option value="1">Yes / Active</option>
                        <option value="0">No / Inactive</option>
                      </select>
                    ) : c === "status" ? (
                      <select
                        value={form[c] ?? "ACTIVE"}
                        onChange={(e) => setForm((o) => ({ ...o, [c]: e.target.value }))}
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="EXPIRED">Expired</option>
                        <option value="SUSPENDED">Suspended</option>
                        <option value="REVOKED">Revoked</option>
                      </select>
                    ) : c === "state" ? (
                      <select
                        value={form[c] ?? "PENDING"}
                        onChange={(e) => setForm((o) => ({ ...o, [c]: e.target.value }))}
                      >
                        <option value="PENDING">Pending</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="DISMISSED">Dismissed</option>
                      </select>
                    ) : ["notes", "description", "reason", "value_json"].includes(c) ? (
                      <textarea
                        rows={c === "value_json" ? 4 : 2}
                        value={form[c] ?? ""}
                        onChange={(e) => setForm((o) => ({ ...o, [c]: e.target.value }))}
                      />
                    ) : (
                      <input
                        value={form[c] ?? ""}
                        type={
                          c.startsWith("valid_") || c === "due_at" || c === "cutoff_at"
                            ? "date"
                            : c === "retention_days" ||
                                c.includes("count") ||
                                c.endsWith("_days") ||
                                c === "alert_interval_days"
                              ? "number"
                              : "text"
                        }
                        onChange={(e) => setForm((o) => ({ ...o, [c]: e.target.value }))}
                      />
                    )}
                  </label>
                ))}
            </div>
            <div className="ops-form-actions">
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="admin-button-primary ops-action-button ops-button-primary"
              >
                {saving ? "Saving…" : editingId === null ? "Create record" : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                disabled={saving}
                className="admin-button-secondary ops-action-button ops-button-secondary"
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}
      <section className="admin-panel ops-maintenance-panel">
        <div className="ops-panel-heading">
          <div>
            <h2>{label}</h2>
            <p>
              {normalizedSearch
                ? `${filteredRows.length} matching records of ${rows.length}`
                : `${rows.length} total records`}
              {filteredRows.length
                ? ` · showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filteredRows.length)}`
                : ""}
            </p>
          </div>
          <div className="ops-list-actions">
            {data?.writable && (
              <button
                type="button"
                onClick={create}
                className="admin-button-primary ops-action-button ops-button-primary"
              >
                + New record
              </button>
            )}
            <button
              type="button"
              onClick={() => void load()}
              className="admin-button-secondary ops-action-button ops-button-secondary"
              disabled={loading}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
        <div className="ops-grid-search">
          <label htmlFor="ops-grid-search">Search records</label>
          <input
            id="ops-grid-search"
            type="search"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Search all columns…"
            aria-label="Search all grid columns"
          />
          <button
            type="button"
            className="admin-button-secondary ops-action-button ops-button-secondary"
            onClick={() => {
              setSearchTerm("");
              setPage(1);
            }}
            disabled={!searchTerm}
          >
            Clear
          </button>
        </div>
        {loading ? (
          <p>Loading records…</p>
        ) : !data || !filteredRows.length ? (
          <p>{searchTerm ? "No records match your search." : "No records found."}</p>
        ) : (
          <>
            <div className="ops-table-wrap">
              <table className="admin-table ops-readable-table">
                <thead>
                  <tr>
                    {displayColumns.map((k) => (
                      <th key={k}>{humanize(k)}</th>
                    ))}
                    {data.writable && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row, i) => (
                    <tr key={String(row.id ?? i)}>
                      {displayColumns.map((k) => (
                        <td key={k}>
                          {row[k] === null || row[k] === undefined || row[k] === ""
                            ? "—"
                            : typeof row[k] === "number" &&
                                ["is_active", "expiry_required", "is_required"].includes(k)
                              ? row[k] === 1
                                ? "Yes"
                                : "No"
                              : String(row[k])}
                        </td>
                      ))}
                      {data.writable && (
                        <td>
                          <button
                            type="button"
                            className="admin-button-secondary ops-action-button ops-button-edit"
                            onClick={() => edit(row)}
                          >
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ops-mobile-records">
              {visibleRows.map((row, i) => (
                <article className="ops-mobile-record" key={String(row.id ?? i)}>
                  {displayColumns.map((k) => (
                    <div className="ops-mobile-field" key={k}>
                      <span>{humanize(k)}</span>
                      <strong>
                        {row[k] === null || row[k] === undefined || row[k] === ""
                          ? "—"
                          : typeof row[k] === "number" &&
                              ["is_active", "expiry_required", "is_required"].includes(k)
                            ? row[k] === 1
                              ? "Yes"
                              : "No"
                            : String(row[k])}
                      </strong>
                    </div>
                  ))}
                  {data.writable && (
                    <button
                      type="button"
                      className="admin-button-secondary ops-action-button ops-button-edit"
                      onClick={() => edit(row)}
                    >
                      Edit
                    </button>
                  )}
                </article>
              ))}
            </div>
            <nav className="ops-pagination" aria-label="Table pagination">
              <div className="ops-pagination-summary">
                <span>
                  Page {page} of {pageCount}
                </span>
                <label className="ops-page-size">
                  Rows per page
                  <select
                    aria-label="Rows per page"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </label>
              </div>
              <div className="ops-pagination-buttons">
                <button
                  type="button"
                  className="admin-button-secondary ops-action-button ops-button-pagination"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="admin-button-secondary ops-action-button ops-button-pagination"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page >= pageCount}
                >
                  Next
                </button>
              </div>
            </nav>
          </>
        )}
      </section>
      <style jsx>{`
        .ops-maintenance {
          color: #1d2b3a;
          font-size: 15px;
        }
        .ops-maintenance p {
          color: #46586b;
          opacity: 1;
          line-height: 1.55;
        }
        .ops-maintenance-panel {
          padding: 20px;
          margin-bottom: 16px;
        }
        .ops-maintenance-panel h2 {
          margin: 0;
          font-size: 19px;
          color: #1b2b3b;
        }
        .ops-panel-heading p {
          margin: 5px 0;
          color: #46586b;
          font-size: 14px;
        }
        .ops-form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
          gap: 15px;
          margin-top: 20px;
        }
        .ops-form-grid label {
          display: grid;
          gap: 7px;
          color: #26384b;
          font-weight: 600;
          font-size: 14px;
        }
        .ops-form-grid input,
        .ops-form-grid textarea,
        .ops-form-grid select {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          padding: 11px 12px;
          border: 1px solid #aebdca;
          border-radius: 7px;
          background: #fff;
          color: #1b2938;
          font: inherit;
        }
        .ops-form-grid input:focus,
        .ops-form-grid textarea:focus,
        .ops-form-grid select:focus {
          outline: 2px solid #138c83;
          outline-offset: 1px;
        }
        .ops-form-actions {
          display: flex;
          gap: 10px;
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid #e1e8ed;
        }
        .ops-form-actions .ops-action-button {
          min-width: 116px;
          min-height: 42px;
        }
        .ops-form-actions .ops-button-secondary {
          background: #fff !important;
          border: 1px solid #9aabba !important;
          color: #24384b !important;
        }
        .ops-panel-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
        }
        .ops-grid-search {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 16px 0;
        }
        .ops-grid-search label {
          font-size: 14px;
          font-weight: 650;
          color: #26384b;
          white-space: nowrap;
        }
        .ops-grid-search input {
          width: min(420px, 100%);
          min-height: 40px;
          padding: 9px 12px;
          border: 1px solid #aebdca;
          border-radius: 7px;
          background: #fff;
          color: #1b2938;
          font: inherit;
        }
        .ops-grid-search input::placeholder {
          color: #6b7b8a;
        }
        .ops-grid-search input:focus {
          outline: 2px solid #138c83;
          outline-offset: 1px;
        }
        .ops-table-wrap {
          overflow: auto;
        }
        .ops-readable-table {
          min-width: 680px;
        }
        .ops-readable-table th {
          color: #25394d;
          font-size: 12px;
          font-weight: 700;
          background: #f0f4f7;
          padding: 13px 12px;
          white-space: nowrap;
        }
        .ops-readable-table td {
          color: #2b3d50;
          font-size: 14px;
          padding: 13px 12px;
          border-top: 1px solid #dce3e9;
          max-width: 360px;
          overflow-wrap: anywhere;
        }
        .ops-message {
          padding: 13px 16px;
          border-radius: 8px;
          margin: 12px 0;
          font-weight: 600;
        }
        .ops-message.error {
          background: #fff0ef;
          border: 1px solid #e5aaa5;
          color: #922d25;
        }
        .ops-message.success {
          background: #eaf8f0;
          border: 1px solid #a5d8b8;
          color: #17663a;
        }
        .ops-list-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ops-maintenance .ops-action-button {
          appearance: none;
          -webkit-appearance: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 38px;
          padding: 8px 14px;
          border-radius: 7px;
          font-size: 14px;
          font-weight: 650;
          line-height: 1.2;
          white-space: nowrap;
          cursor: pointer;
          transition:
            background-color 0.15s ease,
            border-color 0.15s ease,
            box-shadow 0.15s ease;
        }
        .ops-action-button:focus-visible {
          outline: 2px solid #087f78;
          outline-offset: 2px;
        }
        .ops-button-primary {
          background: #087f78 !important;
          border: 1px solid #087f78 !important;
          color: #fff !important;
          box-shadow: 0 1px 2px rgba(15, 40, 55, 0.12);
        }
        .ops-button-primary:hover {
          background: #066b66 !important;
          border-color: #066b66 !important;
        }
        .ops-button-secondary {
          background: #fff !important;
          border: 1px solid #b8c6d2 !important;
          color: #24384b !important;
          box-shadow: 0 1px 2px rgba(15, 40, 55, 0.08);
        }
        .ops-button-secondary:hover {
          background: #edf7f6 !important;
          border-color: #087f78 !important;
          color: #075e59 !important;
        }
        .ops-button-edit {
          min-width: 64px;
          background: #fff !important;
          border: 1px solid #087f78 !important;
          color: #075e59 !important;
          box-shadow: 0 1px 2px rgba(15, 40, 55, 0.08);
        }
        .ops-button-edit:hover {
          background: #e3f5f2 !important;
          border-color: #066b66 !important;
          color: #064e4a !important;
        }
        .ops-button-pagination {
          min-width: 92px;
          background: #fff !important;
          border: 1px solid #9aabba !important;
          color: #24384b !important;
        }
        .ops-button-pagination:not(:disabled):last-child {
          background: #087f78 !important;
          border-color: #087f78 !important;
          color: #fff !important;
        }
        .ops-button-pagination:not(:disabled):last-child:hover {
          background: #066b66 !important;
          border-color: #066b66 !important;
        }
        .ops-button-pagination:disabled {
          background: #f1f4f6 !important;
          border-color: #d4dce3 !important;
          color: #8795a2 !important;
          opacity: 1 !important;
        }
        .ops-action-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .ops-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding-top: 16px;
          color: #33475b;
          font-size: 14px;
        }
        .ops-pagination-summary,
        .ops-pagination-buttons {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ops-pagination-buttons {
          gap: 8px;
        }
        .ops-page-size {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #33475b;
          font-size: 14px;
        }
        .ops-page-size select {
          min-width: 72px;
          padding: 8px 10px;
          border: 1px solid #aebdca;
          border-radius: 7px;
          background: #fff;
          color: #1b2938;
          font: inherit;
        }
        .ops-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(13, 29, 43, 0.58);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .ops-modal {
          width: min(900px, 100%);
          max-height: calc(100dvh - 40px);
          overflow: auto;
          background: #fff;
          border-radius: 14px;
          padding: 24px;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.28);
        }
        .ops-maintenance .ops-modal-close {
          flex: 0 0 40px;
          width: 40px;
          height: 40px;
          padding: 0;
          border: 1px solid #b7c5d1 !important;
          background: #f3f6f8 !important;
          color: #24384b !important;
          border-radius: 9px;
          font-size: 25px;
          line-height: 1;
          box-shadow: 0 1px 2px rgba(15, 40, 55, 0.12);
        }
        .ops-maintenance .ops-modal-close:hover {
          background: #e2ebf0 !important;
          border-color: #8298a9 !important;
          color: #102b40 !important;
        }
        .ops-maintenance .ops-modal-close:focus-visible {
          outline: 3px solid #087f78;
          outline-offset: 2px;
        }
        .ops-mobile-records {
          display: none;
        }
        .ops-mobile-record {
          border: 1px solid #dce3e9;
          border-radius: 10px;
          padding: 14px;
          margin-bottom: 10px;
        }
        .ops-mobile-field {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          padding: 7px 0;
          border-bottom: 1px solid #edf1f4;
        }
        .ops-mobile-field span {
          color: #526579;
          font-size: 13px;
        }
        .ops-mobile-field strong {
          text-align: right;
          overflow-wrap: anywhere;
          font-size: 13px;
          color: #23384c;
        }
        .ops-mobile-record > button {
          margin-top: 12px;
        }
        @media (max-width: 760px) {
          .ops-modal-backdrop {
            padding: 8px;
            align-items: flex-end;
          }
          .ops-modal {
            width: 100%;
            max-height: calc(100dvh - 16px);
            padding: 16px;
            border-radius: 14px 14px 8px 8px;
          }
          .ops-form-grid {
            grid-template-columns: 1fr;
          }
          .ops-form-actions {
            position: sticky;
            bottom: -16px;
            background: #fff;
            padding: 12px 0 4px;
          }
          .ops-table-wrap {
            display: none;
          }
          .ops-mobile-records {
            display: block;
          }
          .ops-pagination {
            align-items: flex-start;
            flex-direction: column;
          }
          .ops-pagination-summary {
            width: 100%;
            justify-content: space-between;
            flex-wrap: wrap;
          }
          .ops-pagination-buttons {
            width: 100%;
          }
          .ops-pagination-buttons button {
            flex: 1;
          }
          .ops-list-actions {
            width: 100%;
          }
          .ops-list-actions button {
            flex: 1;
          }
          .ops-grid-search {
            width: 100%;
            flex-wrap: wrap;
          }
          .ops-grid-search input {
            flex: 1;
            min-width: 140px;
          }
        }
        @media (max-width: 420px) {
          .ops-maintenance-panel {
            padding: 12px;
          }
          .ops-modal h2 {
            font-size: 18px;
          }
        }
      `}</style>
    </main>
  );
}
