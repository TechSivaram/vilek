"use client";
import { useCallback, useEffect, useState } from "react";

function BankAccountDetailsReveal({
  accountId,
  workspace,
}: {
  accountId: string;
  workspace: "crew" | "finance";
}) {
  const [details, setDetails] = useState<{
    accountHolderName: string;
    bankName: string;
    countryCode: string;
    currencyCode: string;
    accountNumber: string;
    routingCode: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function toggle() {
    if (details) {
      setDetails(null);
      setError("");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/${workspace}/bank-accounts/${encodeURIComponent(accountId)}/details`,
        {
          cache: "no-store",
          headers: { "cache-control": "no-cache" },
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to reveal account details.");
      setDetails(result.details);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to reveal account details.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="bank-account-sensitive-details">
      <button
        type="button"
        className="bank-account-reveal-button bank-account-reveal-icon-button"
        onClick={() => void toggle()}
        disabled={busy}
        aria-label={
          busy
            ? "Loading account details"
            : details
              ? "Hide account details"
              : "Reveal account details"
        }
        title={
          busy
            ? "Loading account details"
            : details
              ? "Hide account details"
              : "Reveal account details"
        }
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {details ? (
            <>
              <path d="M3 3l18 18" />
              <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
              <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a15 15 0 0 1-3.1 3.8M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7c1 0 2-.2 2.8-.5" />
            </>
          ) : (
            <>
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
      </button>
      {error && (
        <p className="bank-account-reveal-error" role="alert">
          {error}
        </p>
      )}
      {details && (
        <dl className="bank-account-reveal-grid">
          <div>
            <dt>Account holder</dt>
            <dd>{details.accountHolderName}</dd>
          </div>
          <div>
            <dt>Bank</dt>
            <dd>{details.bankName}</dd>
          </div>
          <div>
            <dt>Account number</dt>
            <dd className="bank-account-sensitive-value">{details.accountNumber}</dd>
          </div>
          <div>
            <dt>IFSC / SWIFT / routing code</dt>
            <dd className="bank-account-sensitive-value">
              {details.routingCode || "Not provided"}
            </dd>
          </div>
          <div>
            <dt>Country / currency</dt>
            <dd>
              {details.countryCode} · {details.currencyCode}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}

type EvidenceItem = {
  id: string;
  fileName: string;
  evidenceType: string;
  uploadedAt: string;
  contentType?: string;
  fileSizeBytes?: number;
};

function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) return "";
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

function FinanceEvidenceList({
  accountId,
  refreshToken,
}: {
  accountId: string;
  refreshToken: number;
}) {
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/finance/bank-accounts/${accountId}/evidence`, {
      cache: "no-store",
      headers: { "cache-control": "no-cache" },
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Unable to load evidence.");
        return result;
      })
      .then((result) => {
        if (!active) return;
        setItems(result.evidence ?? []);
        setError("");
      })
      .catch((cause) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "Unable to load evidence.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accountId, refreshToken]);

  const documentUrl = (id: string, download = false) =>
    `/api/finance/bank-accounts/${accountId}/evidence?evidenceId=${encodeURIComponent(id)}${download ? "&download=1" : ""}`;

  return (
    <section
      className={`crew-bank-evidence-list${isExpanded ? " is-expanded" : ""}`}
      aria-label="Uploaded documents"
    >
      <button
        type="button"
        className="crew-bank-evidence-panel-toggle"
        aria-expanded={isExpanded}
        aria-controls={`finance-evidence-documents-${accountId}`}
        onClick={() => setIsExpanded((expanded) => !expanded)}
      >
        <span className="crew-bank-evidence-panel-title">
          <strong>Uploaded documents</strong>
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
        <div id={`finance-evidence-documents-${accountId}`}>
          {loading ? (
            <p className="crew-bank-evidence-empty">Loading uploaded documents…</p>
          ) : error ? (
            <p className="crew-bank-evidence-error" role="alert">
              {error}
            </p>
          ) : items.length === 0 ? (
            <p className="crew-bank-evidence-empty">No supporting documents uploaded yet.</p>
          ) : (
            <ul>
              {items.map((item) => {
                const url = documentUrl(item.id);
                const uploaded = new Date(item.uploadedAt);
                return (
                  <li className="crew-bank-evidence-item" key={item.id}>
                    <span className="crew-bank-evidence-file-icon" aria-hidden="true">
                      {item.contentType === "application/pdf" ? "PDF" : "IMG"}
                    </span>
                    <div className="crew-bank-evidence-file-info">
                      <strong title={item.fileName}>{item.fileName}</strong>
                      <span>
                        {item.evidenceType.replaceAll("_", " ")} ·{" "}
                        {Number.isNaN(uploaded.getTime())
                          ? "Date unavailable"
                          : uploaded.toLocaleString()}
                        {item.fileSizeBytes
                          ? ` · ${(item.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`
                          : ""}
                      </span>
                    </div>
                    <div className="crew-bank-evidence-actions">
                      <a
                        className="crew-bank-evidence-action crew-bank-evidence-action-view"
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`View ${item.fileName}`}
                        title={`View ${item.fileName}`}
                      >
                        <EvidenceActionIcon kind="view" />
                        <span>View</span>
                      </a>
                      <a
                        className="crew-bank-evidence-action crew-bank-evidence-action-download"
                        href={documentUrl(item.id, true)}
                        aria-label={`Download ${item.fileName}`}
                        title={`Download ${item.fileName}`}
                      >
                        <EvidenceActionIcon kind="download" />
                        <span>Download</span>
                      </a>
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
type Account = {
  id: string;
  crewMemberId: string;
  accountHolderName: string;
  bankName: string;
  countryCode: string;
  currencyCode: string;
  accountNumberLast4: string;
  verificationStatus: string;
  verificationMethod: string | null;
  createdAt: string;
};
export function FinanceBankAccountReview() {
  const [items, setItems] = useState<Account[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [evidenceRefreshToken, setEvidenceRefreshToken] = useState(0);
  const load = useCallback(async () => {
    const r = await fetch("/api/finance/bank-accounts", { cache: "no-store" });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    setItems(j.accounts ?? []);
    // Refresh each account's evidence list after the account query completes.
    setEvidenceRefreshToken((token) => token + 1);
  }, []);
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);
  async function decide(id: string, action: "VERIFY" | "REJECT") {
    setBusy(id);
    setError("");
    try {
      const r = await fetch(`/api/finance/bank-accounts/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update verification.");
    } finally {
      setBusy("");
    }
  }
  return (
    <section className="finance-panel">
      <div className="finance-panel-heading">
        <div>
          <span className="finance-eyebrow">BENEFICIARY CONTROL</span>
          <h2>Bank account verification</h2>
          <p>
            Review accounts requiring manual verification. Only masked account details are available
            here.
          </p>
        </div>
        <button
          type="button"
          className="finance-button finance-button-secondary finance-refresh-button"
          disabled={refreshing}
          onClick={async () => {
            setRefreshing(true);
            setError("");
            try {
              await load();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Unable to refresh bank accounts.");
            } finally {
              setRefreshing(false);
            }
          }}
          aria-label={refreshing ? "Refreshing bank accounts" : "Refresh bank accounts"}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={refreshing ? "finance-refresh-icon is-spinning" : "finance-refresh-icon"}
          >
            <path d="M20 7v5h-5" />
            <path d="M4 17v-5h5" />
            <path d="M5.6 9a7 7 0 0 1 11.55-2.6L20 12M4 12l2.85 5.6A7 7 0 0 0 18.4 15" />
          </svg>
          <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
        </button>
      </div>
      {error && <div className="finance-alert finance-alert-error">{error}</div>}
      <div className="crew-bank-account-list">
        {items
          .filter((x) => ["PENDING", "NEEDS_REVIEW"].includes(x.verificationStatus))
          .map((a) => (
            <article className="crew-bank-account finance-bank-account-row" key={a.id}>
              <div className="crew-bank-account-toolbar">
                <div className="crew-bank-account-main">
                  <div>
                    <strong>
                      {a.bankName} · {a.accountHolderName}
                    </strong>
                    <span>
                      {a.countryCode} · {a.currencyCode} · •••• {a.accountNumberLast4}
                    </span>
                    <small>
                      Verification: {a.verificationStatus} · {a.verificationMethod ?? "Manual"}
                    </small>
                  </div>
                  <BankAccountDetailsReveal accountId={a.id} workspace="finance" />
                </div>
                <FinanceEvidenceList accountId={a.id} refreshToken={evidenceRefreshToken} />
                <div className="finance-dialog-actions">
                  <button
                    className="finance-button finance-button-secondary"
                    disabled={busy === a.id}
                    onClick={() => decide(a.id, "REJECT")}
                  >
                    Reject
                  </button>
                  <button
                    className="finance-button finance-button-primary"
                    disabled={busy === a.id}
                    onClick={() => decide(a.id, "VERIFY")}
                  >
                    {busy === a.id ? "Saving…" : "Verify account"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        {items.every((x) => !["PENDING", "NEEDS_REVIEW"].includes(x.verificationStatus)) && (
          <p className="finance-empty">No bank accounts require manual review.</p>
        )}
      </div>
    </section>
  );
}
