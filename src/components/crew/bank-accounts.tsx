"use client";
import { useCallback, useEffect, useState } from "react";

type BankAccount = {
  id: string;
  accountHolderName: string;
  bankName: string;
  countryCode: string;
  currencyCode: string;
  accountNumberLast4: string;
  routingCodeMasked: string | null;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED" | "NEEDS_REVIEW";
  verificationMethod: string | null;
  isPrimary: boolean;
  verifiedAt: string | null;
};
const statusLabel: Record<BankAccount["verificationStatus"], string> = {
  PENDING: "Pending Finance review",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
  NEEDS_REVIEW: "Needs review",
};
function BankEvidenceUpload({
  accountId,
  onUploaded,
}: {
  accountId: string;
  onUploaded: () => void;
}) {
  const [evidenceType, setEvidenceType] = useState("CANCELLED_CHEQUE");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  function addFiles(incoming: FileList | File[]) {
    const allowed = new Set(["application/pdf", "image/jpeg", "image/png"]);
    const selected = Array.from(incoming);
    const invalid = selected.find(
      (file) => !allowed.has(file.type) || file.size > 10 * 1024 * 1024 || file.size === 0,
    );
    if (invalid) {
      setMessage(`${invalid.name}: choose a non-empty PDF, JPG or PNG file up to 10 MB.`);
      return;
    }
    setFiles((current) => {
      const merged = [...current];
      for (const file of selected) {
        if (
          !merged.some(
            (existing) =>
              existing.name === file.name &&
              existing.size === file.size &&
              existing.lastModified === file.lastModified,
          )
        )
          merged.push(file);
      }
      return merged;
    });
    setMessage("");
  }

  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (files.length === 0) {
      setMessage("Please select or drop at least one supporting document.");
      return;
    }
    setBusy(true);
    setMessage("");
    const uploadCount = files.length;
    try {
      for (const file of files) {
        const data = new FormData();
        data.set("file", file);
        data.set("evidenceType", evidenceType);
        const response = await fetch(`/api/crew/bank-accounts/${accountId}/evidence`, {
          method: "POST",
          body: data,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? `Upload failed for ${file.name}.`);
      }
      setFiles([]);
      const input = document.getElementById(
        `bank-evidence-${accountId}`,
      ) as HTMLInputElement | null;
      if (input) input.value = "";
      setMessage(`${uploadCount} supporting document(s) uploaded successfully.`);
      setIsExpanded(false);
      onUploaded();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Evidence upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={`crew-bank-evidence-section${isExpanded ? " is-expanded" : ""}`}
      aria-label="Verification evidence"
    >
      {!isExpanded ? (
        <>
          <button
            type="button"
            className="crew-bank-evidence-collapse-toggle crew-bank-evidence-upload-toggle"
            aria-expanded={false}
            aria-controls={`crew-evidence-upload-${accountId}`}
            onClick={() => {
              setIsExpanded(true);
              setMessage("");
            }}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="17"
              height="17"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 16V4m0 0L7 9m5-5 5 5" />
              <path d="M4 16.5v2A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-2" />
            </svg>
            <span>Upload additional evidence</span>
          </button>
          {message && (
            <small className="crew-bank-evidence-upload-message" role="status">
              {message}
            </small>
          )}
        </>
      ) : (
        <>
          <div className="crew-bank-evidence-section-heading">
            <span className="finance-eyebrow">DOCUMENT VERIFICATION</span>
            <strong>Verification evidence</strong>
            <p>Upload a cancelled cheque, bank passbook, or bank statement for Finance review.</p>
          </div>
          <button
            type="button"
            className="crew-bank-evidence-collapse-toggle crew-bank-evidence-upload-toggle"
            aria-expanded={true}
            aria-controls={`crew-evidence-upload-${accountId}`}
            onClick={() => {
              setIsExpanded(false);
              setFiles([]);
              setMessage("");
            }}
          >
            <span aria-hidden="true">−</span>
            Cancel upload
          </button>
          <form
            id={`crew-evidence-upload-${accountId}`}
            className="crew-bank-account-form crew-bank-evidence-upload-form"
            onSubmit={upload}
          >
            <div className="crew-bank-evidence-upload-heading">
              <strong>Upload additional evidence</strong>
              <span>PDF, JPG or PNG · Maximum 10 MB per file</span>
            </div>
            <label>
              Verification document
              <select value={evidenceType} onChange={(e) => setEvidenceType(e.target.value)}>
                <option value="CANCELLED_CHEQUE">Cancelled cheque</option>
                <option value="BANK_PASSBOOK">Bank passbook</option>
                <option value="BANK_STATEMENT">Bank statement</option>
              </select>
            </label>
            <div
              className={`crew-bank-evidence-dropzone${isDragging ? " is-dragging" : ""}`}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                if (!event.currentTarget.contains(event.relatedTarget as Node | null))
                  setIsDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                addFiles(event.dataTransfer.files);
              }}
            >
              <label
                htmlFor={`bank-evidence-${accountId}`}
                className="crew-bank-evidence-dropzone-label"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  width="25"
                  height="25"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 16V4m0 0L7 9m5-5 5 5" />
                  <path d="M20 16.5v2A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-2" />
                </svg>
                <strong>Drag and drop documents here</strong>
                <span>
                  or <u>browse files</u> · You can select multiple files
                </span>
              </label>
              <input
                id={`bank-evidence-${accountId}`}
                type="file"
                multiple
                accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
            {files.length > 0 && (
              <div className="crew-bank-evidence-selected-files">
                <div className="crew-bank-evidence-selected-heading">
                  <strong>{files.length} selected</strong>
                  <button type="button" onClick={() => setFiles([])}>
                    Clear all
                  </button>
                </div>
                <ul>
                  {files.map((file, index) => (
                    <li key={`${file.name}-${file.lastModified}-${index}`}>
                      <span>{file.name}</span>
                      <small>{(file.size / (1024 * 1024)).toFixed(2)} MB</small>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              className="finance-button finance-button-secondary"
              type="submit"
              disabled={busy || files.length === 0}
            >
              {busy
                ? "Uploading…"
                : `Upload ${files.length ? `${files.length} document(s)` : "documents"}`}
            </button>
            {message && <small role="status">{message}</small>}
          </form>
        </>
      )}
    </section>
  );
}

function EvidenceActionIcon({ kind }: { kind: "view" | "download" }) {
  return kind === "view" ? (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5M12 15V3" />
    </svg>
  );
}

type EvidenceItem = {
  id: string;
  fileName: string;
  evidenceType: string;
  uploadedAt: string;
};
function CrewEvidenceList({
  accountId,
  refreshToken,
  canDelete,
  onDeleted,
}: {
  accountId: string;
  refreshToken: number;
  canDelete: boolean;
  onDeleted: () => void;
}) {
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/crew/bank-accounts/${accountId}/evidence`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to load evidence.");
      setItems(result.evidence ?? []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load evidence.");
    }
  }, [accountId]);
  useEffect(() => {
    void load();
  }, [load, refreshToken]);
  return (
    <section
      className={`crew-bank-evidence-list${isExpanded ? " is-expanded" : ""}`}
      aria-label="Uploaded documents"
    >
      <button
        type="button"
        className="crew-bank-evidence-panel-toggle"
        aria-expanded={isExpanded}
        aria-controls={`crew-evidence-documents-${accountId}`}
        onClick={() => setIsExpanded((expanded) => !expanded)}
      >
        <span className="crew-bank-evidence-panel-title">
          <strong>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="17"
              height="17"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 3.75h7l4 4v12.5H7a2 2 0 0 1-2-2v-12.5a2 2 0 0 1 2-2Z" />
              <path d="M14 3.75v4h4M9 13h6M9 16.5h6" />
            </svg>
            Uploaded documents
          </strong>
          <span>Evidence submitted for beneficiary verification</span>
        </span>
        <span className="crew-bank-evidence-panel-actions">
          <span className="crew-bank-evidence-count">
            {items.length} {items.length === 1 ? "document" : "documents"}
          </span>
          <span className="crew-bank-evidence-collapse-toggle">
            <span aria-hidden="true">{isExpanded ? "▴" : "▾"}</span>
            {isExpanded ? "Hide documents" : "View documents"}
          </span>
        </span>
      </button>
      {isExpanded && (
        <div id={`crew-evidence-documents-${accountId}`}>
          {error && (
            <p className="crew-bank-evidence-error" role="alert">
              {error}
            </p>
          )}
          {items.length === 0 ? (
            <p className="crew-bank-evidence-empty">No supporting documents uploaded yet.</p>
          ) : (
            <ul>
              {items.map((item) => {
                const isPdf = item.fileName.toLowerCase().endsWith(".pdf");
                return (
                  <li key={item.id} className="crew-bank-evidence-item">
                    <span className="crew-bank-evidence-file-icon" aria-hidden="true">
                      {isPdf ? "PDF" : "IMG"}
                    </span>
                    <div className="crew-bank-evidence-file-info">
                      <strong title={item.fileName}>{item.fileName}</strong>
                      <span>
                        {item.evidenceType.replaceAll("_", " ")} ·{" "}
                        {new Date(item.uploadedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="crew-bank-evidence-actions">
                      <a
                        className="crew-bank-evidence-action crew-bank-evidence-action-view"
                        href={`/api/crew/bank-accounts/${accountId}/evidence?evidenceId=${encodeURIComponent(item.id)}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`View ${item.fileName}`}
                        title={`View ${item.fileName}`}
                      >
                        <EvidenceActionIcon kind="view" />
                        <span>View</span>
                      </a>
                      <a
                        className="crew-bank-evidence-action crew-bank-evidence-action-download"
                        href={`/api/crew/bank-accounts/${accountId}/evidence?evidenceId=${encodeURIComponent(item.id)}&download=1`}
                        aria-label={`Download ${item.fileName}`}
                        title={`Download ${item.fileName}`}
                      >
                        <EvidenceActionIcon kind="download" />
                        <span>Download</span>
                      </a>
                      {canDelete && (
                        <button
                          type="button"
                          className="crew-bank-evidence-action crew-bank-evidence-action-delete"
                          onClick={async () => {
                            if (!window.confirm(`Delete ${item.fileName}? This cannot be undone.`))
                              return;
                            const response = await fetch(
                              `/api/crew/bank-accounts/${accountId}/evidence?evidenceId=${encodeURIComponent(item.id)}`,
                              { method: "DELETE" },
                            );
                            const result = await response.json();
                            if (!response.ok) {
                              setError(result.error ?? "Unable to delete document.");
                              return;
                            }
                            await load();
                            onDeleted();
                          }}
                          aria-label={`Delete ${item.fileName}`}
                          title={`Delete ${item.fileName}`}
                        >
                          <span aria-hidden="true">🗑</span>
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export function CrewBankAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [crewProfileFound, setCrewProfileFound] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [evidenceRefresh, setEvidenceRefresh] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    accountHolderName: "",
    bankName: "",
    countryCode: "IN",
    currencyCode: "INR",
    accountNumber: "",
    routingCode: "",
  });
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/crew/bank-accounts", { cache: "no-store" });
      const j = await r.json();
      if (r.status === 404 && j.error === "Crew profile was not found.") {
        setCrewProfileFound(false);
        setAccounts([]);
        setError("");
        setNotice("");
        return;
      }
      if (!r.ok) throw new Error(j.error ?? "Unable to load bank accounts.");
      setCrewProfileFound(true);
      setAccounts(j.accounts ?? []);
      setEvidenceRefresh((token) => token + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load bank accounts.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  async function act(payload: Record<string, string>) {
    setError("");
    setNotice("");
    const r = await fetch("/api/crew/bank-accounts", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (!r.ok) {
      setError(j.error ?? "Action failed.");
      return;
    }
    setNotice("Bank account updated.");
    await refresh();
  }
  async function removeAccount(account: BankAccount) {
    const confirmed = window.confirm(
      `Delete the ${account.bankName} account ending ${account.accountNumberLast4}? This permanently removes the account.`,
    );
    if (!confirmed) return;
    setError("");
    setNotice("");
    const r = await fetch("/api/crew/bank-accounts", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: account.id }),
    });
    const j = await r.json();
    if (!r.ok) {
      setError(j.error ?? "Unable to delete bank account.");
      return;
    }
    setNotice("Bank account deleted successfully.");
    await refresh();
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const r = await fetch("/api/crew/bank-accounts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Unable to register account.");
      setNotice(
        j.verificationStatus === "VERIFIED"
          ? "Bank account verified automatically."
          : "Bank account registered and sent for verification.",
      );
      setForm({ ...form, accountNumber: "", routingCode: "" });
      setShowAddForm(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to register account.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="crew-bank-accounts">
      {error && (
        <div className="finance-alert finance-alert-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="finance-alert finance-alert-success" role="status">
          {notice}
        </div>
      )}
      {loading && crewProfileFound === null ? (
        <p className="finance-empty" role="status">
          Checking crew profile…
        </p>
      ) : crewProfileFound === false ? (
        <div className="finance-alert finance-alert-error" role="status">
          Your Crew profile could not be found. Bank account registration and management are
          unavailable until an administrator creates or links your Crew profile.
        </div>
      ) : (
        <>
          <section className="finance-panel">
            <div className="finance-panel-heading">
              <div>
                <span className="finance-eyebrow">BENEFICIARY ACCOUNTS</span>
                <h2>Your bank accounts</h2>
                <p>
                  Only verified active accounts can be selected for reimbursement. Account numbers
                  are encrypted and displayed in masked form.
                </p>
              </div>
              <button
                className="finance-button finance-button-secondary"
                onClick={() => void refresh()}
                disabled={loading}
              >
                Refresh
              </button>
            </div>
            {loading ? (
              <p className="finance-empty">Loading bank accounts…</p>
            ) : accounts.length === 0 ? (
              <p className="finance-empty">No bank accounts registered yet.</p>
            ) : (
              <div className="crew-bank-account-list">
                {accounts.map((a) => (
                  <article className="crew-bank-account" key={a.id}>
                    <div className="crew-bank-account-toolbar">
                      <div className="crew-bank-account-main">
                        <div>
                          <strong>{a.bankName}</strong>
                          <span>{a.accountHolderName}</span>
                          <small>
                            {a.countryCode} · {a.currencyCode} · •••• {a.accountNumberLast4}
                          </small>
                        </div>
                        <div className="crew-bank-account-tags">
                          <span
                            className={`finance-status finance-status-${a.verificationStatus === "VERIFIED" ? "paid" : a.verificationStatus === "PENDING" ? "processing" : "failed"}`}
                          >
                            {statusLabel[a.verificationStatus]}
                          </span>
                          {a.isPrimary && (
                            <span className="finance-status finance-status-ready">Primary</span>
                          )}
                          {a.verificationStatus !== "VERIFIED" && (
                            <span className="crew-bank-account-status-note">
                              Primary selection is available after verification.
                            </span>
                          )}
                        </div>
                      </div>
                      {a.verificationStatus === "VERIFIED" && !a.isPrimary && (
                        <button
                          className="finance-button finance-button-secondary"
                          onClick={() => void act({ id: a.id, action: "SET_PRIMARY" })}
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            width="17"
                            height="17"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m12 3 2.2 5.1 5.5.5-4.2 3.6 1.3 5.4-4.8-2.9-4.8 2.9 1.3-5.4-4.2-3.6 5.5-.5L12 3Z" />
                            <path d="M8 21h8" />
                          </svg>
                          <span>Make primary</span>
                        </button>
                      )}
                      <CrewEvidenceList
                        accountId={a.id}
                        refreshToken={evidenceRefresh}
                        canDelete={a.verificationStatus === "PENDING"}
                        onDeleted={() => setNotice("Evidence document deleted.")}
                      />
                      {a.verificationStatus === "PENDING" && (
                        <BankEvidenceUpload
                          accountId={a.id}
                          onUploaded={() => {
                            setNotice("Evidence submitted for Finance review.");
                            setEvidenceRefresh((v) => v + 1);
                          }}
                        />
                      )}
                      <div className="crew-bank-account-actions">
                        {a.isPrimary ? (
                          <small>Primary account cannot be deleted.</small>
                        ) : accounts.length <= 1 ? (
                          <small>At least one bank account must be retained.</small>
                        ) : (
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:border-red-300 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                            onClick={() => void removeAccount(a)}
                          >
                            <span aria-hidden="true">🗑</span>
                            Delete account
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
          <div className="crew-bank-account-add-action">
            <button
              type="button"
              className="finance-button finance-button-primary"
              onClick={() => {
                setShowAddForm((current) => !current);
                setError("");
                setNotice("");
              }}
              aria-expanded={showAddForm}
              aria-controls="crew-add-bank-account-form"
            >
              {showAddForm ? "Cancel" : "+ Add bank account"}
            </button>
          </div>
          {showAddForm && (
            <section className="finance-panel" id="crew-add-bank-account-form">
              <div className="finance-panel-heading">
                <div>
                  <span className="finance-eyebrow">ADD BENEFICIARY</span>
                  <h2>Register bank account</h2>
                  <p>Provide the account details exactly as held by your bank.</p>
                </div>
              </div>
              <form className="crew-bank-account-form" onSubmit={submit}>
                <label>
                  Account holder name
                  <input
                    required
                    maxLength={120}
                    value={form.accountHolderName}
                    onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
                  />
                </label>
                <label>
                  Bank name
                  <input
                    required
                    maxLength={120}
                    value={form.bankName}
                    onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  />
                </label>
                <label>
                  Country code
                  <input
                    required
                    minLength={2}
                    maxLength={2}
                    placeholder="IN"
                    value={form.countryCode}
                    onChange={(e) =>
                      setForm({ ...form, countryCode: e.target.value.toUpperCase() })
                    }
                  />
                </label>
                <label>
                  Account currency
                  <input
                    required
                    minLength={3}
                    maxLength={3}
                    placeholder="INR"
                    value={form.currencyCode}
                    onChange={(e) =>
                      setForm({ ...form, currencyCode: e.target.value.toUpperCase() })
                    }
                  />
                </label>
                <label>
                  Account number
                  <input
                    required
                    autoComplete="off"
                    maxLength={34}
                    value={form.accountNumber}
                    onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                  />
                </label>
                <label>
                  IFSC / SWIFT / routing code
                  <input
                    autoComplete="off"
                    maxLength={40}
                    value={form.routingCode}
                    onChange={(e) => setForm({ ...form, routingCode: e.target.value })}
                  />
                </label>
                <div className="crew-bank-account-form-note">
                  Verification will be attempted automatically when a bank verification provider is
                  configured. Otherwise, Finance will review the account manually.
                </div>
                <div className="crew-bank-account-form-actions">
                  <button
                    className="finance-button finance-button-secondary"
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    className="finance-button finance-button-primary"
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? "Registering…" : "Register bank account"}
                  </button>
                </div>
              </form>
            </section>
          )}
        </>
      )}
    </div>
  );
}
