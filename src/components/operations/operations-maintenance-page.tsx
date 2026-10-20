"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

type Resource = { key: string; label: string; writable: boolean; columns: string[]; rows: Record<string, unknown>[] };
const resources = [
  ["crew-designation-assignments", "Crew designation assignments"],
  ["qualification-types", "Qualification types"],
  ["crew-qualifications", "Crew qualifications"],
  ["designation-qualification-requirements", "Designation qualification requirements"],
  ["crew-complement-defaults", "Default crew complement"],
  ["flight-crew-requirements", "Flight-specific crew requirements"],
  ["flight-operations-settings", "Flight Operations settings"],
  ["qualification-alerts", "Qualification alerts"],
  ["audit-retention-policy", "Audit retention policy"],
  ["flight-crew-audit", "Flight crew assignment audit (read-only)"],
  ["batch-requests", "Crew batch requests (read-only)"],
  ["audit-exports", "Audit export history (read-only)"],
  ["audit-retention-actions", "Audit retention actions (read-only)"],
] as const;
const fieldLabels: Record<string, string> = {
  crew_member_id: "Crew member ID", designation_id: "Designation ID", valid_from: "Valid from (YYYY-MM-DD)", valid_until: "Valid until (YYYY-MM-DD)", is_active: "Active (1 or 0)", code: "Code", name: "Name", expiry_required: "Expiry required (1 or 0)", qualification_type_id: "Qualification type ID", status: "Status (ACTIVE / SUSPENDED / REVOKED)", replaced_by_id: "Replaced by qualification ID", notes: "Notes", is_required: "Required (1 or 0)", required_count: "Required count", flight_id: "Flight ID", reason: "Reason for override", setting_key: "Setting key", value_json: "Setting value (valid JSON)", description: "Description", crew_qualification_id: "Crew qualification ID", alert_interval_days: "Alert interval (days)", due_at: "Due at (ISO date/time)", state: "State", generated_at: "Generated at", resolved_at: "Resolved at", id: "ID", retention_days: "Retention days (blank means indefinite)",
};
function humanize(key: string) { return fieldLabels[key] ?? key.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()); }
function emptyValue(key: string) { if (["is_active", "expiry_required", "is_required"].includes(key)) return "1"; if (key === "status") return "ACTIVE"; if (key === "state") return "PENDING"; if (key === "value_json") return "{}"; return ""; }

export function OperationsMaintenancePage() {
  const [selected, setSelected] = useState<string>(resources[0][0]);
  const [data, setData] = useState<Resource | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const currentLabel = resources.find(([key]) => key === selected)?.[1] ?? selected;

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const response = await fetch(`/api/operations/maintenance/${selected}`, { cache: "no-store" }); const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Unable to load records."); setData({ key: selected, ...result }); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load records."); setData(null); }
    finally { setLoading(false); }
  }, [selected]);
  useEffect(() => { void load(); setForm({}); setEditingId(null); setNotice(""); }, [load]);

  const formColumns = useMemo(() => data?.columns ?? [], [data]);
  function startEdit(row: Record<string, unknown>) { const id = row.id as string | number; setEditingId(id); setForm(Object.fromEntries(formColumns.map((col) => [col, row[col] === null || row[col] === undefined ? "" : String(row[col])]))); setNotice(""); }
  function startCreate() { setEditingId(null); setForm(Object.fromEntries(formColumns.map((col) => [col, emptyValue(col)]))); setNotice(""); }
  async function save() {
    setSaving(true); setError(""); setNotice("");
    try {
      const body: Record<string, unknown> = {};
      for (const col of formColumns) { const value = form[col] ?? ""; if (value !== "") { body[col] = ["id", "designation_id", "qualification_type_id", "required_count", "expiry_required", "is_active", "is_required", "alert_interval_days", "retention_days"].includes(col) ? (Number.isFinite(Number(value)) ? Number(value) : value) : value; } }
      const response = await fetch(`/api/operations/maintenance/${selected}`, { method: editingId === null ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingId === null ? body : { id: editingId, ...body }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Save failed."); setNotice(editingId === null ? "Record created." : "Record updated."); setForm({}); setEditingId(null); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed."); }
    finally { setSaving(false); }
  }

  return <>
    <section className="admin-page-heading"><div><div className="admin-eyebrow">FLIGHT OPERATIONS · CONFIGURATION</div><h1>Operational data &amp; settings</h1><p>Maintain the Flight Operations tables added for crew eligibility, qualifications, complement planning, settings, and audit visibility.</p></div></section>
    <section className="admin-panel" style={{ padding: "1rem", marginBottom: "1rem" }}>
      <label htmlFor="ops-maintenance-resource" style={{ display: "block", fontWeight: 600, marginBottom: ".5rem" }}>Data area</label>
      <select id="ops-maintenance-resource" value={selected} onChange={(e) => setSelected(e.target.value)} style={{ width: "100%", maxWidth: 620, padding: ".7rem", border: "1px solid var(--admin-border, #ccd2dc)", borderRadius: 8, background: "var(--admin-card, white)" }}>{resources.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select>
      <p style={{ marginBottom: 0, opacity: .75, fontSize: ".9rem" }}>Reference fields use database IDs. Audit and processing history are intentionally read-only.</p>
    </section>
    {error && <div role="alert" className="admin-panel" style={{ borderLeft: "4px solid #c0392b", padding: "1rem", marginBottom: "1rem" }}>{error}</div>}
    {notice && <div role="status" className="admin-panel" style={{ padding: "1rem", marginBottom: "1rem" }}>{notice}</div>}
    {data?.writable && <section className="admin-panel" style={{ padding: "1rem", marginBottom: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}><div><h2 style={{ margin: 0 }}>{editingId === null ? `Add ${currentLabel.toLowerCase()}` : `Edit ${currentLabel.toLowerCase()}`}</h2><p style={{ margin: ".3rem 0 0", opacity: .7, fontSize: ".9rem" }}>Required relationships must reference existing records.</p></div><button type="button" onClick={startCreate} className="admin-button-secondary">New record</button></div>
      {formColumns.length > 0 && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: ".8rem", marginTop: "1rem" }}>{formColumns.filter((col) => !(editingId === null && col === "id" && selected !== "audit-retention-policy")).map((col) => <label key={col} style={{ display: "grid", gap: ".35rem", fontSize: ".9rem" }}><span>{humanize(col)}{["crew_member_id", "designation_id", "qualification_type_id", "valid_from", "code", "name", "flight_id", "required_count", "setting_key", "value_json", "crew_qualification_id", "alert_interval_days", "due_at"].includes(col) ? " *" : ""}</span>{col === "notes" || col === "description" || col === "reason" || col === "value_json" ? <textarea rows={col === "value_json" ? 3 : 2} value={form[col] ?? ""} onChange={(e) => setForm((old) => ({ ...old, [col]: e.target.value }))} /> : <input value={form[col] ?? ""} disabled={col === "id" && selected === "audit-retention-policy" && editingId !== null} type={col.includes("valid_") ? "date" : col.includes("_at") ? "text" : "text"} onChange={(e) => setForm((old) => ({ ...old, [col]: e.target.value }))} />}</label>)}</div>}
      <div style={{ display: "flex", gap: ".6rem", marginTop: "1rem" }}><button type="button" onClick={() => void save()} disabled={saving} className="admin-button-primary">{saving ? "Saving…" : editingId === null ? "Create record" : "Save changes"}</button><button type="button" onClick={() => { setForm({}); setEditingId(null); }} className="admin-button-secondary">Cancel</button></div>
    </section>}
    <section className="admin-panel" style={{ padding: "1rem" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: ".5rem", marginBottom: "1rem" }}><div><h2 style={{ margin: 0 }}>{currentLabel}</h2><p style={{ margin: ".3rem 0 0", opacity: .7 }}>{data?.rows.length ?? 0} records shown (up to 500).</p></div><button type="button" onClick={() => void load()} className="admin-button-secondary" disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button></div>
      {loading ? <p>Loading records…</p> : !data || data.rows.length === 0 ? <p>No records found.</p> : <div style={{ overflowX: "auto" }}><table className="admin-table" style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{Object.keys(data.rows[0]).map((key) => <th key={key} style={{ textAlign: "left", padding: ".65rem", whiteSpace: "nowrap" }}>{humanize(key)}</th>)}{data.writable && <th>Actions</th>}</tr></thead><tbody>{data.rows.map((row, i) => <tr key={String(row.id ?? i)}>{Object.keys(row).map((key) => <td key={key} style={{ padding: ".65rem", borderTop: "1px solid var(--admin-border, #e3e6eb)", maxWidth: 320, overflowWrap: "anywhere" }}>{row[key] === null ? "—" : String(row[key])}</td>)}{data.writable && <td style={{ padding: ".65rem", borderTop: "1px solid var(--admin-border, #e3e6eb)" }}><button type="button" className="admin-button-secondary" onClick={() => startEdit(row)}>Edit</button></td>}</tr>)}</tbody></table></div>}
    </section>
  </>;
}
