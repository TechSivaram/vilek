"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type FinanceClaim = {
  claimId: string;
  createdAt: string;
  crewFirstName: string;
  crewLastName: string;
  crewEmail: string;
  flightNumber: string;
  airlineName: string;
  currencyTotals: { currencyCode: string; amount: number }[];
  canPay: boolean;
  activePayment: { status: string; paymentNumber: string } | null;
};
type FinancePayment = {
  id: string;
  paymentNumber: string;
  mode: "MANUAL" | "BANK";
  status: "PROCESSING" | "PAID" | "FAILED";
  currencyCode: string;
  amount: string;
  paymentReference: string | null;
  providerReference: string | null;
  paidAt: string | null;
  failureReason: string | null;
  createdAt: string;
  initiatedBy: string | null;
  claims: { claimId: string }[];
};
type FinanceData = {
  overview: {
    approvedClaims: number;
    paidPayments: number;
    processingPayments: number;
    failedPayments: number;
  };
  approvedClaims: FinanceClaim[];
  payments: FinancePayment[];
};

const money = (amount: number | string, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount));
const dateLabel = (value: string | null) => (value ? new Date(value).toLocaleString() : "—");

type FinanceView = "overview" | "approved-claims" | "payment-history";

export function FinanceWorkspace({ view = "overview" }: { view?: FinanceView }) {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<"MANUAL" | "BANK">("MANUAL");
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 16));
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/finance/payments", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to load Finance data.");
      setData(result as FinanceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Finance data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedClaims = useMemo(
    () => data?.approvedClaims.filter((claim) => selected.includes(claim.claimId)) ?? [],
    [data, selected],
  );
  const batchCurrencies = new Set(
    selectedClaims.map((claim) => claim.currencyTotals[0]?.currencyCode),
  );
  const canSubmit =
    selectedClaims.length > 0 &&
    selectedClaims.every((claim) => claim.canPay) &&
    batchCurrencies.size === 1 &&
    (mode === "BANK" || reference.trim().length > 0);

  const toggleClaim = (id: string, checked: boolean) =>
    setSelected((current) => (checked ? [...current, id] : current.filter((item) => item !== id)));

  async function submitPayment() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/finance/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          claimIds: selected,
          mode,
          paymentReference: mode === "MANUAL" ? reference.trim() : undefined,
          paidAt: mode === "MANUAL" ? new Date(paidAt).toISOString() : undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok && response.status !== 202)
        throw new Error(result.error ?? "Payment could not be processed.");
      setNotice(result.warning ?? `${result.paymentNumber} created with status ${result.status}.`);
      setSelected([]);
      setReference("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment could not be processed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="finance-workspace">
      {view === "overview" && (
        <section className="finance-kpi-grid" aria-label="Finance summary">
          <article className="finance-kpi">
            <span>Approved claims</span>
            <strong>{data?.overview.approvedClaims ?? "—"}</strong>
            <small>Ready for finance review</small>
          </article>
          <article className="finance-kpi">
            <span>Payments processing</span>
            <strong>{data?.overview.processingPayments ?? "—"}</strong>
            <small>{data ? "Across payment currencies" : "Awaiting confirmation"}</small>
          </article>
          <article className="finance-kpi">
            <span>Paid payments</span>
            <strong>{data?.overview.paidPayments ?? "—"}</strong>
            <small>{data ? "Across payment currencies" : "Completed reimbursements"}</small>
          </article>
          <article className="finance-kpi">
            <span>Failed payments</span>
            <strong>{data?.overview.failedPayments ?? "—"}</strong>
            <small>Require finance attention</small>
          </article>
        </section>
      )}

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

      {view === "overview" && (
        <section className="finance-shortcuts" aria-label="Finance sections">
          <Link href="/finance/approved-claims" className="finance-shortcut">
            <span className="finance-shortcut-icon">₹</span>
            <span>
              <strong>Approved claims</strong>
              <small>Review eligible claims and process single or batch payments.</small>
            </span>
            <span className="finance-shortcut-arrow" aria-hidden="true">
              →
            </span>
          </Link>
          <Link href="/finance/payment-history" className="finance-shortcut">
            <span className="finance-shortcut-icon">↗</span>
            <span>
              <strong>Payment history</strong>
              <small>Review completed, processing and failed transactions.</small>
            </span>
            <span className="finance-shortcut-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </section>
      )}

      {view === "approved-claims" && (
        <section className="finance-panel" id="approved">
          <div className="finance-panel-heading">
            <div>
              <span className="finance-eyebrow">PAYMENT QUEUE</span>
              <h2>Approved claims</h2>
              <p>Select one claim for a single payment or multiple claims for a batch.</p>
            </div>
            <button
              className="finance-button finance-button-secondary"
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  <th aria-label="Select claim"></th>
                  <th>Crew member</th>
                  <th>Flight</th>
                  <th>Claim</th>
                  <th>Approved amount</th>
                  <th>Payment state</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="finance-empty">
                      Loading approved claims…
                    </td>
                  </tr>
                )}
                {!loading && data?.approvedClaims.length === 0 && (
                  <tr>
                    <td colSpan={6} className="finance-empty">
                      No approved claims are awaiting payment.
                    </td>
                  </tr>
                )}
                {data?.approvedClaims.map((claim) => {
                  const total = claim.currencyTotals.length === 1 ? claim.currencyTotals[0] : null;
                  return (
                    <tr key={claim.claimId}>
                      <td>
                        <input
                          aria-label={`Select claim ${claim.claimId}`}
                          type="checkbox"
                          checked={selected.includes(claim.claimId)}
                          disabled={!claim.canPay}
                          onChange={(event) => toggleClaim(claim.claimId, event.target.checked)}
                        />
                      </td>
                      <td>
                        <strong>
                          {claim.crewFirstName} {claim.crewLastName}
                        </strong>
                        <small>{claim.crewEmail}</small>
                      </td>
                      <td>
                        {claim.airlineName}
                        <small>{claim.flightNumber}</small>
                      </td>
                      <td>
                        <code>{claim.claimId.slice(0, 8).toUpperCase()}</code>
                        <small>{dateLabel(claim.createdAt)}</small>
                      </td>
                      <td>
                        {total ? (
                          money(total.amount, total.currencyCode)
                        ) : (
                          <span className="finance-status finance-status-failed">
                            Multiple currencies
                          </span>
                        )}
                      </td>
                      <td>
                        {claim.activePayment ? (
                          <span className="finance-status finance-status-processing">
                            {claim.activePayment.status}
                          </span>
                        ) : claim.canPay ? (
                          <span className="finance-status finance-status-ready">Ready</span>
                        ) : (
                          <span className="finance-status finance-status-failed">
                            Review required
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="finance-payment-composer">
            <div className="finance-composer-summary">
              <strong>
                {selectedClaims.length === 1
                  ? "Single claim payment"
                  : selectedClaims.length > 1
                    ? "Batch payment"
                    : "No claims selected"}
              </strong>
              <span>
                {selectedClaims.length} claim{selectedClaims.length === 1 ? "" : "s"} selected
              </span>
              {selectedClaims.length > 0 && batchCurrencies.size === 1 && (
                <b>
                  {money(
                    selectedClaims.reduce((sum, claim) => sum + claim.currencyTotals[0].amount, 0),
                    [...batchCurrencies][0]!,
                  )}
                </b>
              )}
            </div>
            <div className="finance-payment-fields">
              <label>
                Payment execution
                <select
                  value={mode}
                  onChange={(event) => setMode(event.target.value as "MANUAL" | "BANK")}
                >
                  <option value="MANUAL">Manual transfer (record completed payment)</option>
                  <option value="BANK">Bank gateway (initiate transfer)</option>
                </select>
              </label>
              {mode === "MANUAL" ? (
                <>
                  <label>
                    Bank / transaction reference
                    <input
                      value={reference}
                      onChange={(event) => setReference(event.target.value)}
                      placeholder="Enter UTR or transaction reference"
                      maxLength={120}
                    />
                  </label>
                  <label>
                    Payment date
                    <input
                      type="datetime-local"
                      value={paidAt}
                      onChange={(event) => setPaidAt(event.target.value)}
                    />
                  </label>
                </>
              ) : (
                <p className="finance-integration-note">
                  Bank execution requires VILEK_BANK_PAYMENT_URL and an adapter-compatible bank
                  endpoint. Unknown responses remain in Processing for reconciliation.
                </p>
              )}
            </div>
            <div className="finance-composer-actions">
              <button
                className="finance-button finance-button-secondary"
                type="button"
                onClick={() => setSelected([])}
                disabled={!selected.length || submitting}
              >
                Clear selection
              </button>
              <button
                className="finance-button finance-button-primary"
                type="button"
                onClick={() => void submitPayment()}
                disabled={!canSubmit || submitting}
              >
                {submitting
                  ? "Processing…"
                  : mode === "BANK"
                    ? "Initiate bank payment"
                    : selectedClaims.length > 1
                      ? "Record batch payment"
                      : "Record payment"}
              </button>
            </div>
            {selectedClaims.length > 1 && batchCurrencies.size > 1 && (
              <p className="finance-validation">
                Batch payments must use one currency. Select claims with the same currency.
              </p>
            )}
          </div>
        </section>
      )}

      {view === "payment-history" && (
        <section className="finance-panel" id="payments">
          <div className="finance-panel-heading">
            <div>
              <span className="finance-eyebrow">TRANSACTION REGISTER</span>
              <h2>Payment history</h2>
              <p>Recent manual and bank-initiated reimbursement transactions.</p>
            </div>
          </div>
          <div className="finance-table-wrap">
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Payment</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Claims</th>
                  <th>Status</th>
                  <th>Reference</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {!loading && data?.payments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="finance-empty">
                      No payments have been recorded yet.
                    </td>
                  </tr>
                )}
                {data?.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <strong>{payment.paymentNumber}</strong>
                      <small>{payment.initiatedBy ?? "Former user"}</small>
                    </td>
                    <td>{payment.mode === "BANK" ? "Bank gateway" : "Manual"}</td>
                    <td>{money(payment.amount, payment.currencyCode)}</td>
                    <td>{payment.claims.length}</td>
                    <td>
                      <span
                        className={`finance-status finance-status-${payment.status.toLowerCase()}`}
                      >
                        {payment.status}
                      </span>
                      {payment.failureReason && <small>{payment.failureReason}</small>}
                    </td>
                    <td>{payment.paymentReference ?? payment.providerReference ?? "—"}</td>
                    <td>{dateLabel(payment.paidAt ?? payment.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
