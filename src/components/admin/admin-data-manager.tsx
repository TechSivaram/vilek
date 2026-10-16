"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import type { AdminField } from "@/lib/admin/resources";

type Row = Record<string, unknown> & { id: string | number };
type Option = {
  id: string | number;
  name?: string;
  code?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  iataCode?: string;
};
type Props = {
  resource: string;
  title: string;
  description: string;
  fields: AdminField[];
  canCreate?: boolean;
  canEdit?: boolean;
  canDeactivate?: boolean;
  syncUsers?: boolean;
};
const display = (value: unknown) =>
  value == null || value === "" ? "—" : String(value);
export function AdminDataManager({
  resource,
  title,
  description,
  fields,
  canCreate = true,
  canEdit = true,
  canDeactivate = true,
  syncUsers = false,
}: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [options, setOptions] = useState<Record<string, Option[]>>({});
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const load = useCallback(async () => {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/admin/${resource}?q=${encodeURIComponent(query)}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not load records.");
      setRows(data.rows ?? []);
      setOptions(data.options ?? {});
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load records.");
    } finally {
      setBusy(false);
    }
  }, [resource, query, refresh]);
  useEffect(() => {
    void load();
  }, [load]);
  const visibleFields = useMemo(
    () => fields.filter((f) => !f.readOnly || editing),
    [fields, editing],
  );
  const beginCreate = () => {
    setEditing(null);
    setValues(
      Object.fromEntries(
        fields
          .filter((f) => !f.readOnly)
          .map((f) => [
            f.name,
            f.kind === "boolean" ? true : f.kind === "number" ? "" : "",
          ]),
      ),
    );
    setCreating(true);
    setMessage("");
    setError("");
  };
  const beginEdit = (row: Row) => {
    setEditing(row);
    setValues(
      Object.fromEntries(
        fields.map((f) => [
          f.name,
          row[f.name] ?? (f.kind === "boolean" ? false : ""),
        ]),
      ),
    );
    setCreating(false);
    setMessage("");
    setError("");
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        editing
          ? `/api/admin/${resource}/${encodeURIComponent(String(editing.id))}`
          : `/api/admin/${resource}`,
        {
          method: editing ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Save failed.");
      setMessage(editing ? "Changes saved." : "Record created.");
      setCreating(false);
      setEditing(null);
      setRefresh((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };
  const deactivate = async (row: Row) => {
    if (
      !window.confirm(
        `Deactivate this ${title.toLowerCase()} record? Existing historical references will be preserved.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/${resource}/${encodeURIComponent(String(row.id))}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Deactivation failed.");
      setMessage("Record deactivated.");
      setRefresh((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deactivation failed.");
    } finally {
      setBusy(false);
    }
  };
  const sync = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/users/sync", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "TSCloak sync failed.");
      setMessage(data.message || "TSCloak sync completed.");
      setRefresh((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "TSCloak sync failed.");
    } finally {
      setBusy(false);
    }
  };
  const optionLabel = (o: Option) =>
    o.email
      ? `${o.firstName ?? ""} ${o.lastName ?? ""} (${o.email})`.trim()
      : `${o.iataCode ? o.iataCode + " — " : ""}${o.code ? o.code + " — " : ""}${o.name ?? o.id}`;
  const renderCell = (field: AdminField, row: Row) => {
    const value = row[field.name];
    if (field.kind === "boolean") {
      const isActive = value === true || value === 1 || value === "1" || value === "true";
      return (
        <span className={`admin-status-pill ${isActive ? "is-active" : "is-inactive"}`}>
          {isActive ? "Active" : "Inactive"}
        </span>
      );
    }
    // Foreign-key IDs are numeric, but must not be mistaken for booleans.
    // Resolve their display labels from the options returned by the API.
    const optionSet = field.name === "userId"
      ? options.users ?? []
      : field.name === "airlineId"
        ? options.airlines ?? []
        : field.name.toLowerCase().includes("airportid")
          ? options.airports ?? []
          : [];
    if (optionSet.length) {
      const matched = optionSet.find((option) => String(option.id) === String(value));
      if (matched) return optionLabel(matched);
    }
    if (field.kind === "datetime-local" && value != null && value !== "") {
      const date = new Date(String(value));
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
      }
    }
    return display(value);
  };
  return (
    <>
      <section className="admin-page-heading">
        <div>
          <div className="admin-eyebrow">ADMINISTRATION</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="admin-heading-actions">
          {syncUsers && (
            <button
              type="button"
              className="admin-secondary-button"
              onClick={sync}
              disabled={busy}
            >
              Sync TSCloak
            </button>
          )}
          {canCreate && (
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
              <h2>{editing ? `Edit ${title}` : `Add ${title}`}</h2>
              <p>Changes are validated by the server before saving.</p>
            </div>
            <button
              type="button"
              className="admin-icon-button"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              ✕
            </button>
          </div>
          <form className="admin-record-form" onSubmit={submit}>
            {visibleFields
              .filter((f) => !f.readOnly || editing)
              .map((field) => (
                <label
                  className={
                    field.kind === "boolean"
                      ? "admin-field admin-field-checkbox"
                      : "admin-field"
                  }
                  key={field.name}
                >
                  {field.kind === "boolean" ? (
                    <>
                      <input
                        type="checkbox"
                        checked={Boolean(values[field.name])}
                        onChange={(e) =>
                          setValues((v) => ({
                            ...v,
                            [field.name]: e.target.checked,
                          }))
                        }
                      />
                      <span>{field.label}</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {field.label}
                        {field.required ? " *" : ""}
                      </span>
                      {field.kind === "select" ? (
                        <select
                          required={field.required}
                          value={String(values[field.name] ?? "")}
                          onChange={(e) =>
                            setValues((v) => ({
                              ...v,
                              [field.name]: e.target.value,
                            }))
                          }
                        >
                          <option value="">Select…</option>
                          {(options.users && field.name === "userId"
                            ? options.users
                            : field.name === "airlineId"
                              ? (options.airlines ?? [])
                              : field.name.includes("AirportId")
                                ? (options.airports ?? [])
                                : []
                          ).map((o) => (
                            <option key={o.id} value={o.id}>
                              {optionLabel(o)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          required={field.required}
                          type={
                            field.kind === "number"
                              ? "number"
                              : field.kind === "email"
                                ? "email"
                                : field.kind === "date"
                                  ? "date"
                                  : field.kind === "datetime-local"
                                    ? "datetime-local"
                                    : "text"
                          }
                          min={field.kind === "number" ? 0 : undefined}
                          max={field.name === "minorUnits" ? 4 : undefined}
                          value={
                            field.kind === "datetime-local"
                              ? String(values[field.name] ?? "").slice(0, 16)
                              : String(values[field.name] ?? "")
                          }
                          readOnly={field.readOnly}
                          onChange={(e) =>
                            setValues((v) => ({
                              ...v,
                              [field.name]: e.target.value,
                            }))
                          }
                        />
                      )}
                      {field.help && <small>{field.help}</small>}
                    </>
                  )}
                </label>
              ))}
            <div className="admin-form-actions">
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() => {
                  setCreating(false);
                  setEditing(null);
                }}
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
              Records <span className="admin-count-badge">{rows.length}</span>
            </h2>
            <p>Live data from the ViLek database</p>
          </div>
          <div className="admin-record-tools">
            <input
              aria-label={`Search ${title}`}
              placeholder="Search records…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              className="admin-secondary-button"
              onClick={() => setRefresh((v) => v + 1)}
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
                {fields.map((f) => (
                  <th key={f.name}>{f.label}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row.id)}>
                  {fields.map((f) => (
                    <td key={f.name} data-label={f.label}>
                      {renderCell(f, row)}
                    </td>
                  ))}
                  <td data-label="Actions">
                    <div className="admin-row-actions">
                      {canEdit && (
                        <button
                          type="button"
                          className="admin-table-action"
                          onClick={() => beginEdit(row)}
                          disabled={busy}
                        >
                          Edit
                        </button>
                      )}
                      {canDeactivate &&
                        row.isActive !== false &&
                        row.isActive !== 0 && (
                          <button
                            type="button"
                            className="admin-table-action is-danger"
                            onClick={() => void deactivate(row)}
                            disabled={busy}
                          >
                            Deactivate
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={fields.length + 1} className="admin-table-empty">
                    {busy ? "Loading records…" : "No records found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
