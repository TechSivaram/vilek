"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type Obj = Record<string, unknown>;
function PageHeading({ title, description }: { title: string; description: string }) {
  return (
    <section className="admin-page-heading">
      <div>
        <div className="admin-eyebrow">ADMINISTRATION</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </section>
  );
}
function Notice({ message, error }: { message: string; error: string }) {
  return (
    <>
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
    </>
  );
}
export function UserRoleAssignments() {
  const [data, setData] = useState<{
    rows: Obj[];
    options: { users: Obj[]; roles: Obj[] };
  }>({ rows: [], options: { users: [], roles: [] } });
  const [userId, setUserId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/user-roles", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not load assignments.");
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load assignments.");
    }
  }, [refresh]);
  useEffect(() => {
    void load();
  }, [load]);
  async function assign(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/api/admin/user-roles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, roleId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Assignment failed.");
      setMessage("Role assigned.");
      setUserId("");
      setRoleId("");
      setRefresh((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Assignment failed.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(row: Obj) {
    if (!window.confirm("Remove this local ViLek role assignment?")) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/user-roles/${row.id}`, {
        method: "DELETE",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not remove assignment.");
      setMessage("Role assignment removed.");
      setRefresh((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove assignment.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title="User Role Assignments"
        description="Assign local ViLek roles to existing users. These assignments are not sourced from identity provider."
      />
      <Notice message={message} error={error} />
      <section className="admin-panel admin-editor">
        <div className="admin-panel-heading">
          <div>
            <h2>Assign a role</h2>
            <p>Duplicate assignments are rejected by the database.</p>
          </div>
        </div>
        <form className="admin-record-form admin-assignment-form" onSubmit={assign}>
          <label className="admin-field">
            <span>User *</span>
            <select required value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Choose a user…</option>
              {data.options.users.map((u) => (
                <option
                  key={String(u.id)}
                  value={String(u.id)}
                >{`${u.firstName} ${u.lastName} (${u.email})`}</option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span>Role *</span>
            <select required value={roleId} onChange={(e) => setRoleId(e.target.value)}>
              <option value="">Choose a role…</option>
              {data.options.roles.map((r) => (
                <option key={String(r.id)} value={String(r.id)}>{`${r.code} — ${r.name}`}</option>
              ))}
            </select>
          </label>
          <div className="admin-form-actions">
            <button className="admin-primary-button" disabled={busy || !userId || !roleId}>
              Assign role
            </button>
          </div>
        </form>
      </section>
      <section className="admin-panel admin-records-panel">
        <div className="admin-record-toolbar">
          <div>
            <h2>
              Current assignments <span className="admin-count-badge">{data.rows.length}</span>
            </h2>
            <p>Changes apply immediately to ViLek authorization.</p>
          </div>
          <button
            className="admin-secondary-button"
            onClick={() => setRefresh((x) => x + 1)}
            disabled={busy}
          >
            Refresh
          </button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Assigned at</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={String(r.id)}>
                  <td data-label="Name">
                    {String(r.firstName ?? "")} {String(r.lastName ?? "")}
                  </td>
                  <td data-label="Email">{String(r.email ?? "")}</td>
                  <td data-label="Role">
                    <span className="admin-status-pill is-active">
                      {String(r.roleCode ?? "")} — {String(r.roleName ?? "")}
                    </span>
                  </td>
                  <td data-label="Created">{String(r.createdAt ?? "—")}</td>
                  <td data-label="Action">
                    <button
                      className="admin-table-action is-danger"
                      onClick={() => void remove(r)}
                      disabled={busy}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {!data.rows.length && (
                <tr>
                  <td colSpan={5} className="admin-table-empty">
                    No role assignments found.
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
export function SystemSettingsManager() {
  const [settings, setSettings] = useState<Obj | null>(null);
  const [currencies, setCurrencies] = useState<Obj[]>([]);
  const [currency, setCurrency] = useState("");
  const [size, setSize] = useState("10485760");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/system-settings", {
        cache: "no-store",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not load settings.");
      setSettings(d.settings);
      setCurrencies(d.currencyOptions || []);
      setCurrency(String(d.settings?.defaultCurrencyId ?? d.currencyOptions?.[0]?.id ?? ""));
      setSize(String(d.settings?.maxUploadSizeBytes ?? 10485760));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load settings.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/api/admin/system-settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          defaultCurrencyId: currency,
          maxUploadSizeBytes: size,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save failed.");
      setMessage("System settings saved.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title="System Settings"
        description="Configure the deployment's default currency and maximum upload size."
      />
      <Notice message={message} error={error} />
      <section className="admin-panel admin-editor">
        <div className="admin-panel-heading">
          <div>
            <h2>Application settings</h2>
            <p>
              {settings
                ? `Last updated: ${String(settings.updatedAt ?? "unknown")}`
                : "No settings row exists yet; saving creates it."}
            </p>
          </div>
        </div>
        <form className="admin-record-form" onSubmit={save}>
          <label className="admin-field">
            <span>Default currency *</span>
            <select required value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="">Choose currency…</option>
              {currencies.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {String(c.code ?? "")} — {String(c.name ?? "")}
                </option>
              ))}
            </select>
            {!currencies.length && (
              <small>Add an active currency before configuring settings.</small>
            )}
          </label>
          <label className="admin-field">
            <span>Maximum upload size (bytes) *</span>
            <input
              required
              type="number"
              min={1024}
              max={104857600}
              value={size}
              onChange={(e) => setSize(e.target.value)}
            />
            <small>
              Allowed range: 1 KB to 100 MB. Upload API enforcement must use this setting too.
            </small>
          </label>
          <div className="admin-form-actions">
            <button className="admin-primary-button" disabled={busy || !currency}>
              {busy ? "Saving…" : "Save settings"}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
export function FileTypesManager() {
  const [rows, setRows] = useState<Obj[]>([]);
  const [settingId, setSettingId] = useState<unknown>(null);
  const [notice, setNotice] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/file-types", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not load file types.");
      setRows(d.rows || []);
      setSettingId(d.settingId);
      setNotice(d.notice || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load file types.");
    }
  }, [refresh]);
  useEffect(() => {
    void load();
  }, [load]);
  async function add(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/admin/file-types", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileType: value }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not add extension.");
      setValue("");
      setMessage("Allowed file type added.");
      setRefresh((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add extension.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: unknown) {
    if (
      !window.confirm(
        "Remove this allowed file extension? Upload enforcement must also honor this policy.",
      )
    )
      return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/file-types/${id}`, {
        method: "DELETE",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not remove extension.");
      setMessage("Allowed file type removed.");
      setRefresh((x) => x + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove extension.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Allowed File Types"
        description="Manage file extensions allowed by the deployment policy."
      />
      <Notice message={message} error={error} />
      {notice && <div className="admin-alert admin-alert-warning">{notice}</div>}
      <section className="admin-panel admin-editor">
        <div className="admin-panel-heading">
          <div>
            <h2>Add file extension</h2>
            <p>Enter an extension, including the dot, such as .pdf or .jpg.</p>
          </div>
        </div>
        <form className="admin-record-form admin-inline-form" onSubmit={add}>
          <label className="admin-field">
            <span>Extension *</span>
            <input
              required
              pattern="\.[A-Za-z0-9]{1,10}"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder=".pdf"
            />
          </label>
          <div className="admin-form-actions">
            <button className="admin-primary-button" disabled={busy || !settingId}>
              Add extension
            </button>
          </div>
        </form>
      </section>
      <section className="admin-panel admin-records-panel">
        <div className="admin-record-toolbar">
          <div>
            <h2>
              Allowed extensions <span className="admin-count-badge">{rows.length}</span>
            </h2>
            <p>These records are stored in the database.</p>
          </div>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Extension</th>
                <th>Setting ID</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={String(r.id)}>
                  <td data-label="Extension">
                    <code>{String(r.fileType ?? "")}</code>
                  </td>
                  <td data-label="Setting ID">{String(r.systemSettingId)}</td>
                  <td data-label="Action">
                    <button
                      className="admin-table-action is-danger"
                      onClick={() => void remove(r.id)}
                      disabled={busy}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={3} className="admin-table-empty">
                    No allowed file types configured.
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
export function IdentityProviderPanel() {
  const [data, setData] = useState<Obj | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/identity-provider", {
        cache: "no-store",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not load provider status.");
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load provider status.");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const items: [string, unknown][] = [
    ["OIDC issuer", data?.issuer ?? "Not configured"],
    ["OIDC client ID", data?.clientId ?? "Not configured"],
    ["SCIM provisioning enabled", data?.scimEnabled],
    ["SCIM credentials configured", data?.scimCredentialsConfigured],
    ["SCIM base URL", data?.scimBaseUrl ?? "Defaults to issuer + /scim/v2"],
    ["SCIM token URL override", data?.scimTokenUrl ?? "Defaults to issuer + /token"],
    ["Password setup capability configured", data?.passwordSetupConfigured],
    ["MFA capability configured", data?.mfaConfigured],
  ];
  return (
    <>
      <PageHeading
        title="Identity Provider"
        description="Review safe identity provider OIDC and SCIM configuration metadata. Secrets are never returned to the browser."
      />
      <Notice message="" error={error} />
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>identity provider integration</h2>
            <p>
              Configuration presence only; this page does not expose client secrets or assert live
              health.
            </p>
          </div>
          <button className="admin-secondary-button" onClick={() => void load()}>
            Refresh
          </button>
        </div>
        <div className="admin-settings-list">
          {items.map(([label, value]) => (
            <div className="admin-settings-row" key={label}>
              <span>{label}</span>
              <strong>
                {typeof value === "boolean" ? (
                  <span className={`admin-status-pill ${value ? "is-active" : "is-inactive"}`}>
                    {value ? "Configured / enabled" : "Not configured / disabled"}
                  </span>
                ) : (
                  String(value)
                )}
              </strong>
            </div>
          ))}
        </div>
        <div className="admin-alert admin-alert-warning">
          ViLek stores one external identifier in oidc_subject. SCIM resource IDs and OIDC sub
          claims may differ: first-login linking requires a verified email claim, and SCIM updates
          resolve the remote resource by email. Keep provider emails unique and stable. Local ViLek
          roles are preserved during SCIM synchronization.
        </div>
      </section>
    </>
  );
}
export function AuditLogPanel() {
  const [rows, setRows] = useState<Obj[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/admin/audit-log", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Could not load outbox.");
        setRows(d.rows || []);
        setNotice(d.notice || "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load outbox."));
  }, []);
  return (
    <>
      <PageHeading
        title="Audit Log"
        description="Inspect the available audit outbox events; this is not a complete audit trail."
      />
      <Notice message="" error={error} />
      <div className="admin-alert admin-alert-warning">{notice || "Loading event scope…"}</div>
      <section className="admin-panel admin-records-panel">
        <div className="admin-record-toolbar">
          <div>
            <h2>
              Recent outbox events <span className="admin-count-badge">{rows.length}</span>
            </h2>
            <p>Latest 200 records, newest first.</p>
          </div>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Entity</th>
                <th>Event</th>
                <th>Actor</th>
                <th>Delivery</th>
                <th>Attempts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={String(r.id)}>
                  <td data-label="Created">{String(r.createdAt ?? "—")}</td>
                  <td data-label="Entity">
                    {String(r.entityType)} / {String(r.entityId)}
                  </td>
                  <td data-label="Event">{String(r.eventType)}</td>
                  <td data-label="Actor">{String(r.actorUserId ?? "System/unknown")}</td>
                  <td data-label="Delivery">
                    {r.processedAt
                      ? `Processed ${String(r.processedAt)}`
                      : r.lastError
                        ? `Error: ${String(r.lastError)}`
                        : "Pending"}
                  </td>
                  <td data-label="Attempts">{String(r.attemptCount ?? 0)}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={6} className="admin-table-empty">
                    No outbox events found.
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
export function OperationsPanel() {
  const [data, setData] = useState<{
    rows: Obj[];
    pending: number;
    failed: number;
    notice: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    fetch("/api/admin/operations", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Could not load operations.");
        setData(d);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load operations."));
  }, [refresh]);
  return (
    <>
      <PageHeading
        title="Operations"
        description="Review the available audit outbox delivery state. No unsupported background-job health is inferred."
      />
      <Notice message="" error={error} />
      <section className="admin-metrics-grid">
        <div className="admin-metric-card">
          <span>Pending outbox items</span>
          <strong className="admin-metric-value">{data?.pending ?? "—"}</strong>
        </div>
        <div className="admin-metric-card">
          <span>Items with last error</span>
          <strong className="admin-metric-value">{data?.failed ?? "—"}</strong>
        </div>
      </section>
      <div className="admin-alert admin-alert-warning">
        {data?.notice ?? "Loading outbox status…"}
      </div>
      <section className="admin-panel admin-records-panel">
        <div className="admin-record-toolbar">
          <div>
            <h2>Recent operations</h2>
            <p>
              Latest outbox records only; retry controls are not exposed without a worker
              implementation.
            </p>
          </div>
          <button className="admin-secondary-button" onClick={() => setRefresh((x) => x + 1)}>
            Refresh
          </button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Created</th>
                <th>Event</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Next attempt</th>
              </tr>
            </thead>
            <tbody>
              {(data?.rows ?? []).map((r) => (
                <tr key={String(r.id)}>
                  <td data-label="Created">{String(r.createdAt ?? "—")}</td>
                  <td data-label="Event">{String(r.eventType)}</td>
                  <td data-label="Status">
                    {r.processedAt ? "Processed" : r.lastError ? String(r.lastError) : "Pending"}
                  </td>
                  <td data-label="Attempts">{String(r.attemptCount ?? 0)}</td>
                  <td data-label="Next attempt">{String(r.nextAttemptAt ?? "—")}</td>
                </tr>
              ))}
              {data && !data.rows.length && (
                <tr>
                  <td colSpan={5} className="admin-table-empty">
                    No operations records found.
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
