"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type FinanceView = "overview" | "approved-claims" | "payment-history";

type FinanceExpense = {
  amount: string | number;
  currencyCode: string;
  category: string;
  description: string | null;
};

type FinanceClaim = {
  claimId: string;
  createdAt: string;
  crewFirstName: string;
  crewLastName: string;
  crewEmail: string;
  crewMemberId: string;
  flightNumber: string;
  airlineName: string;
  expenses: FinanceExpense[];
  currencyTotals: { currencyCode: string; amount: number }[];
  primaryPayoutCurrency: string | null;
  payableCurrencyCode: string | null;
  payableAmount: number | null;
  currencyResolution: {
    payoutCurrencyCode: string;
    convertedAmount: number;
    rateSource: string;
    effectiveDate: string;
    rates: Record<string, number>;
  } | null;
  hasInvalidAmounts: boolean;
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

type BeneficiaryDetails = {
  accountHolderName: string;
  bankName: string;
  countryCode: string;
  currencyCode: string;
  accountNumber: string;
  routingCode: string | null;
  verificationStatus: string;
};

type FinanceData = {
  overview: {
    approvedClaims: number;
    paidPayments: number;
    processingPayments: number;
    failedPayments: number;
  };
  approvedClaims: {
    items: FinanceClaim[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  payments: {
    items: FinancePayment[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

const money = (amount: number | string, currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount));

const dateLabel = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

const localDateTimeInputValue = (date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

export function FinanceWorkspace({ view = "overview" }: { view?: FinanceView }) {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedClaimCache, setSelectedClaimCache] = useState<Record<string, FinanceClaim>>({});
  const [expandedClaims, setExpandedClaims] = useState<string[]>([]);
  const [mode, setMode] = useState<"MANUAL" | "BANK">("MANUAL");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [beneficiaries, setBeneficiaries] = useState<Record<string, BeneficiaryDetails>>({});
  const [revealingClaim, setRevealingClaim] = useState("");
  const [confirmingPaymentId, setConfirmingPaymentId] = useState("");
  const [confirmationReference, setConfirmationReference] = useState("");
  const [confirmationDate, setConfirmationDate] = useState(localDateTimeInputValue());
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(10);
  const [listSearch, setListSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("ALL");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(listPage),
        pageSize: String(listPageSize),
        search: listSearch,
        status: paymentStatus === "ALL" ? "" : paymentStatus,
      });
      const response = await fetch(`/api/finance/payments?${params.toString()}`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to load Finance data.");
      setData(result as FinanceData);
      setSelectedClaimCache((current) => {
        const next = { ...current };
        for (const claim of result.approvedClaims.items as FinanceClaim[]) {
          if (claim.canPay) next[claim.claimId] = claim;
          else delete next[claim.claimId];
        }
        return next;
      });
      setSelected((current) =>
        current.filter((id) => {
          const visible = (result.approvedClaims.items as FinanceClaim[]).find(
            (claim) => claim.claimId === id,
          );
          return visible ? visible.canPay : true;
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Finance data.");
    } finally {
      setLoading(false);
    }
  }, [listPage, listPageSize, listSearch, paymentStatus]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedClaims = useMemo(
    () =>
      selected
        .map((id) => selectedClaimCache[id])
        .filter((claim): claim is FinanceClaim => Boolean(claim)),
    [selected, selectedClaimCache],
  );
  const batchCurrencies = new Set(
    selectedClaims
      .map((claim) => claim.payableCurrencyCode)
      .filter((code): code is string => Boolean(code)),
  );
  const totalAmount = selectedClaims.reduce((sum, claim) => sum + (claim.payableAmount ?? 0), 0);
  const canSubmit =
    selectedClaims.length > 0 &&
    selectedClaims.every((claim) => claim.canPay && Boolean(claim.payableCurrencyCode)) &&
    batchCurrencies.size === 1 &&
    (mode === "BANK" || selectedClaims.length === 1);

  const toggleClaim = (id: string, checked: boolean) => {
    setSelected((current) =>
      checked
        ? [...current.filter((item) => item !== id), id]
        : current.filter((item) => item !== id),
    );
    if (!checked)
      setSelectedClaimCache((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
  };

  const toggleClaimDetails = (id: string) =>
    setExpandedClaims((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );

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
        }),
      });
      const result = await response.json();
      if (!response.ok && response.status !== 202) {
        throw new Error(result.error ?? "Payment could not be processed.");
      }
      setNotice(result.warning ?? `${result.paymentNumber} created with status ${result.status}.`);
      setSelected([]);
      setSelectedClaimCache({});
      setConfirmOpen(false);
      await refresh();
    } catch (err) {
      setConfirmOpen(false);
      setError(err instanceof Error ? err.message : "Payment could not be processed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function revealBeneficiary(claimId: string) {
    setRevealingClaim(claimId);
    setError("");
    try {
      const response = await fetch(
        `/api/finance/claims/${encodeURIComponent(claimId)}/beneficiary`,
        {
          cache: "no-store",
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to retrieve beneficiary details.");
      setBeneficiaries((current) => ({ ...current, [claimId]: result as BeneficiaryDetails }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to retrieve beneficiary details.");
    } finally {
      setRevealingClaim("");
    }
  }

  async function saveCurrencyResolution(
    claimId: string,
    rates: Record<string, number>,
    rateSource: string,
    effectiveDate: string,
    correctionReason?: string,
  ) {
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/finance/claims/${encodeURIComponent(claimId)}/currency-resolution`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ rates, rateSource, effectiveDate, correctionReason }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to save currency resolution.");
      setNotice(
        `Currency resolution approved: ${money(result.convertedAmount, result.payoutCurrencyCode)}.`,
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save currency resolution.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmManualTransfer(paymentId: string) {
    if (!confirmationReference.trim() || !confirmationDate || submitting) return;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/finance/payments/${encodeURIComponent(paymentId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          paymentReference: confirmationReference.trim(),
          paidAt: new Date(confirmationDate).toISOString(),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to confirm transfer.");
      setNotice("Manual transfer confirmed and claim marked as paid.");
      setConfirmationReference("");
      setConfirmingPaymentId("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to confirm transfer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="finance-workspace">
      {view === "overview" && (
        <>
          <section className="finance-kpi-grid" aria-label="Finance summary">
            <article className="finance-kpi">
              <span>Approved claims</span>
              <strong>{data?.overview.approvedClaims ?? "—"}</strong>
              <small>Awaiting finance processing</small>
            </article>
            <article className="finance-kpi">
              <span>Payments processing</span>
              <strong>{data?.overview.processingPayments ?? "—"}</strong>
              <small>Awaiting bank confirmation</small>
            </article>
            <article className="finance-kpi">
              <span>Paid payments</span>
              <strong>{data?.overview.paidPayments ?? "—"}</strong>
              <small>Completed reimbursements</small>
            </article>
            <article className="finance-kpi">
              <span>Failed payments</span>
              <strong>{data?.overview.failedPayments ?? "—"}</strong>
              <small>Require finance attention</small>
            </article>
          </section>

          <section className="finance-shortcuts" aria-label="Finance sections">
            <Link href="/finance/approved-claims" className="finance-shortcut">
              <span className="finance-shortcut-icon" aria-hidden="true">
                ₹
              </span>
              <span>
                <strong>Approved claims</strong>
                <small>Review eligible claims and process single or batch reimbursements.</small>
              </span>
              <span className="finance-shortcut-arrow" aria-hidden="true">
                →
              </span>
            </Link>
            <Link href="/finance/payment-history" className="finance-shortcut">
              <span className="finance-shortcut-icon" aria-hidden="true">
                ↗
              </span>
              <span>
                <strong>Payment history</strong>
                <small>Track completed, processing and failed transactions.</small>
              </span>
              <span className="finance-shortcut-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </section>
        </>
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

      {view === "approved-claims" && (
        <section className="finance-panel" id="approved">
          <div className="finance-panel-heading">
            <div>
              <span className="finance-eyebrow">PAYMENT QUEUE</span>
              <h2>Approved claims</h2>
              <p>
                Review the approved amount and verified beneficiary details before preparing a
                manual transfer or initiating a bank payment.
              </p>
            </div>
            <button
              className="finance-button finance-button-secondary"
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          <div className="finance-list-toolbar">
            <label className="finance-list-search">
              <span className="sr-only">Search approved claims</span>
              <input
                value={listSearch}
                onChange={(event) => {
                  setListSearch(event.target.value);
                  setListPage(1);
                  setSelected([]);
                  setSelectedClaimCache({});
                }}
                placeholder="Search claim, crew or flight…"
              />
            </label>
            <label className="finance-page-size">
              Rows per page
              <select
                value={listPageSize}
                onChange={(event) => {
                  setListPageSize(Number(event.target.value));
                  setListPage(1);
                  setSelected([]);
                  setSelectedClaimCache({});
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
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
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="finance-empty">
                      Loading approved claims…
                    </td>
                  </tr>
                )}
                {!loading && data?.approvedClaims.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="finance-empty">
                      No approved claims are awaiting payment.
                    </td>
                  </tr>
                )}
                {data?.approvedClaims.items.map((claim) => {
                  const total =
                    claim.payableCurrencyCode && claim.payableAmount !== null
                      ? { currencyCode: claim.payableCurrencyCode, amount: claim.payableAmount }
                      : null;
                  const isExpanded = expandedClaims.includes(claim.claimId);
                  const multiCurrency = claim.currencyTotals.length > 1;
                  return (
                    <FragmentRow
                      key={claim.claimId}
                      claim={claim}
                      total={total}
                      isExpanded={isExpanded}
                      multiCurrency={multiCurrency}
                      selected={selected.includes(claim.claimId)}
                      onSelect={(checked) => toggleClaim(claim.claimId, checked)}
                      onToggleDetails={() => toggleClaimDetails(claim.claimId)}
                      beneficiary={beneficiaries[claim.claimId] ?? null}
                      revealing={revealingClaim === claim.claimId}
                      onRevealBeneficiary={() => void revealBeneficiary(claim.claimId)}
                      onResolveCurrency={saveCurrencyResolution}
                      resolving={submitting}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
          <FinancePagination
            page={data?.approvedClaims.page ?? listPage}
            totalPages={data?.approvedClaims.totalPages ?? 1}
            total={data?.approvedClaims.total ?? 0}
            pageSize={listPageSize}
            onPage={setListPage}
          />

          {selectedClaims.length > 0 && (
            <div className="finance-payment-composer">
              <div className="finance-composer-summary">
                <strong>
                  {selectedClaims.length === 1 ? "Single claim payment" : "Batch payment"}
                </strong>
                <span>
                  {selectedClaims.length} claim{selectedClaims.length === 1 ? "" : "s"} selected
                </span>
                {batchCurrencies.size === 1 && (
                  <b>{money(totalAmount, [...batchCurrencies][0]!)}</b>
                )}
              </div>
              <div className="finance-payment-fields">
                <label>
                  Payment execution
                  <select
                    value={mode}
                    onChange={(event) => setMode(event.target.value as "MANUAL" | "BANK")}
                  >
                    <option value="MANUAL">Manual bank transfer</option>
                    <option value="BANK">Bank gateway (initiate transfer)</option>
                  </select>
                </label>
                {mode === "MANUAL" ? (
                  <p className="finance-integration-note">
                    Prepare a single-crew transfer, reveal the verified beneficiary details below,
                    complete the transfer in your bank portal, then confirm it in Payment History
                    with the UTR. The claim will not be marked paid until that confirmation.
                  </p>
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
                  disabled={submitting}
                >
                  Clear selection
                </button>
                <button
                  className="finance-button finance-button-primary"
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  disabled={!canSubmit || submitting}
                >
                  {mode === "BANK"
                    ? "Review bank payment"
                    : selectedClaims.length > 1
                      ? "Review batch payment"
                      : "Review payment"}
                </button>
              </div>
              {mode === "MANUAL" && selectedClaims.length > 1 && (
                <p className="finance-validation">
                  Manual bank transfers are prepared one crew member at a time. Select a single
                  claim.
                </p>
              )}
              {selectedClaims.length > 1 && batchCurrencies.size > 1 && (
                <p className="finance-validation">
                  Batch payments must use one currency. Select claims with the same currency.
                </p>
              )}
            </div>
          )}
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
            <button
              className="finance-button finance-button-secondary"
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          <div className="finance-list-toolbar">
            <label className="finance-list-search">
              <span className="sr-only">Search payment history</span>
              <input
                value={listSearch}
                onChange={(event) => {
                  setListSearch(event.target.value);
                  setListPage(1);
                }}
                placeholder="Search payment, reference or user…"
              />
            </label>
            <label className="finance-page-size">
              Status
              <select
                value={paymentStatus}
                onChange={(event) => {
                  setPaymentStatus(event.target.value);
                  setListPage(1);
                }}
              >
                <option value="ALL">All</option>
                <option value="PROCESSING">Processing</option>
                <option value="PAID">Paid</option>
                <option value="FAILED">Failed</option>
              </select>
            </label>
            <label className="finance-page-size">
              Rows per page
              <select
                value={listPageSize}
                onChange={(event) => {
                  setListPageSize(Number(event.target.value));
                  setListPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>
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
                {loading && (
                  <tr>
                    <td colSpan={7} className="finance-empty">
                      Loading payment history…
                    </td>
                  </tr>
                )}
                {!loading && data?.payments.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="finance-empty">
                      No payments have been recorded yet.
                    </td>
                  </tr>
                )}
                {data?.payments.items.map((payment) => (
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
                    <td>
                      {payment.paymentReference ?? payment.providerReference ?? "—"}
                      {payment.mode === "MANUAL" && payment.status === "PROCESSING" && (
                        <div className="finance-manual-confirm">
                          {confirmingPaymentId === payment.id ? (
                            <>
                              <input
                                aria-label="UTR or transaction reference"
                                value={confirmationReference}
                                onChange={(event) => setConfirmationReference(event.target.value)}
                                placeholder="Enter UTR"
                                maxLength={120}
                              />
                              <input
                                aria-label="Transfer date and time"
                                type="datetime-local"
                                value={confirmationDate}
                                onChange={(event) => setConfirmationDate(event.target.value)}
                              />
                              <button
                                className="finance-button finance-button-primary"
                                type="button"
                                disabled={!confirmationReference.trim() || submitting}
                                onClick={() => void confirmManualTransfer(payment.id)}
                              >
                                Confirm transfer
                              </button>
                            </>
                          ) : (
                            <button
                              className="finance-inline-link"
                              type="button"
                              onClick={() => {
                                setConfirmingPaymentId(payment.id);
                                setConfirmationReference("");
                                setConfirmationDate(localDateTimeInputValue());
                              }}
                            >
                              Record completed transfer
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td>{dateLabel(payment.paidAt ?? payment.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <FinancePagination
            page={data?.payments.page ?? listPage}
            totalPages={data?.payments.totalPages ?? 1}
            total={data?.payments.total ?? 0}
            pageSize={listPageSize}
            onPage={setListPage}
          />
        </section>
      )}

      {confirmOpen && (
        <div className="finance-dialog-backdrop" role="presentation">
          <section
            className="finance-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="finance-confirm-title"
            aria-describedby="finance-confirm-description"
          >
            <span className="finance-eyebrow">PAYMENT CONFIRMATION</span>
            <h2 id="finance-confirm-title">
              {mode === "BANK" ? "Initiate bank payment?" : "Record this payment?"}
            </h2>
            <p id="finance-confirm-description">
              You are about to {mode === "BANK" ? "initiate" : "prepare"} a
              {selectedClaims.length === 1
                ? " payment for one claim"
                : ` batch payment for ${selectedClaims.length} claims`}
              . Confirm the details before continuing.
            </p>
            <dl className="finance-confirm-details">
              <div>
                <dt>Claims</dt>
                <dd>{selectedClaims.length}</dd>
              </div>
              <div>
                <dt>Total amount</dt>
                <dd>
                  {batchCurrencies.size === 1
                    ? money(totalAmount, [...batchCurrencies][0]!)
                    : "Mixed currencies"}
                </dd>
              </div>
              <div>
                <dt>Execution</dt>
                <dd>{mode === "BANK" ? "Bank gateway" : "Manual transfer"}</dd>
              </div>
            </dl>
            <div className="finance-dialog-warning">
              {mode === "BANK"
                ? "The bank may process this transfer immediately. Do not submit it again if the response is uncertain; reconcile the transaction first."
                : "This prepares a manual transfer and keeps the claim approved. Complete the transfer in your bank portal, then confirm the UTR in Payment History to mark it paid."}
            </div>
            <div className="finance-dialog-actions">
              <button
                className="finance-button finance-button-secondary"
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
              >
                Go back
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
                    ? "Confirm and initiate"
                    : "Prepare transfer"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function FinancePagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (page: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return (
    <nav className="finance-pagination" aria-label="List pagination">
      <span>
        Showing {start}–{end} of {total}
      </span>
      <div>
        <button
          type="button"
          className="finance-button finance-button-secondary"
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="finance-button finance-button-secondary"
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </nav>
  );
}

function FragmentRow({
  claim,
  total,
  isExpanded,
  multiCurrency,
  selected,
  onSelect,
  onToggleDetails,
  beneficiary,
  revealing,
  onRevealBeneficiary,
  onResolveCurrency,
  resolving,
}: {
  claim: FinanceClaim;
  total: { currencyCode: string; amount: number } | null;
  isExpanded: boolean;
  multiCurrency: boolean;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onToggleDetails: () => void;
  beneficiary: BeneficiaryDetails | null;
  revealing: boolean;
  onRevealBeneficiary: () => void;
  onResolveCurrency: (
    claimId: string,
    rates: Record<string, number>,
    rateSource: string,
    effectiveDate: string,
    correctionReason?: string,
  ) => void;
  resolving: boolean;
}) {
  const [rates, setRates] = useState<Record<string, string>>(
    claim.currencyResolution
      ? Object.fromEntries(
          Object.entries(claim.currencyResolution.rates).map(([code, rate]) => [
            code,
            String(rate),
          ]),
        )
      : {},
  );
  const [rateSource, setRateSource] = useState(claim.currencyResolution?.rateSource ?? "");
  const [effectiveDate, setEffectiveDate] = useState(
    claim.currencyResolution?.effectiveDate ?? new Date().toISOString().slice(0, 10),
  );
  const [correctionReason, setCorrectionReason] = useState("");
  const [editingRates, setEditingRates] = useState(false);
  return (
    <>
      <tr>
        <td>
          <input
            aria-label={`Select claim ${claim.claimId}`}
            type="checkbox"
            checked={selected}
            disabled={!claim.canPay}
            onChange={(event) => onSelect(event.target.checked)}
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
            <span className="finance-status finance-status-failed">Multiple currencies</span>
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
            <span className="finance-status finance-status-failed">Review required</span>
          )}
        </td>
        <td>
          <button
            className="finance-inline-link"
            type="button"
            onClick={onToggleDetails}
            aria-expanded={isExpanded}
          >
            {isExpanded
              ? "Hide details"
              : multiCurrency
                ? claim.currencyResolution
                  ? "View conversion"
                  : "Resolve currencies"
                : "View details"}
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr className="finance-claim-detail-row">
          <td colSpan={7}>
            <div className="finance-claim-details">
              <div className="finance-claim-detail-heading">
                <strong>Claim expense breakdown</strong>
                {multiCurrency &&
                  (claim.currencyResolution ? (
                    <span className="finance-status finance-status-ready">
                      Currency resolved · {claim.currencyResolution.payoutCurrencyCode}
                    </span>
                  ) : (
                    <span className="finance-status finance-status-failed">
                      Payment blocked until currency amounts are resolved
                    </span>
                  ))}
              </div>
              {claim.currencyTotals.length > 0 ? (
                <div className="finance-currency-breakdown">
                  {claim.currencyTotals.map((item) => (
                    <div key={item.currencyCode}>
                      <span>{item.currencyCode}</span>
                      <strong>{money(item.amount, item.currencyCode)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="finance-validation">
                  No payable expense totals were found for this claim.
                </p>
              )}
              {multiCurrency &&
                claim.primaryPayoutCurrency &&
                (!claim.currencyResolution || editingRates) &&
                claim.activePayment?.status !== "PROCESSING" && (
                  <section className="finance-fx-editor" aria-label="Resolve claim currencies">
                    <div className="finance-fx-editor-header">
                      <div>
                        <span className="finance-fx-eyebrow">Foreign exchange</span>
                        <h3>
                          {claim.currencyResolution ? "Correct approved rates" : "Convert expenses"}{" "}
                          to {claim.primaryPayoutCurrency}
                        </h3>
                        <p>
                          {claim.currencyResolution
                            ? "Update an incorrectly entered rate. The previous approved values remain in the audit history."
                            : "Enter the Finance-approved rate for each source currency. The beneficiary currency is fixed at 1. Original expenses are never changed."}
                        </p>
                      </div>
                      <span className="finance-status finance-status-processing">
                        {claim.currencyResolution ? "Correction" : "Approval required"}
                      </span>
                    </div>

                    <div className="finance-fx-rate-list">
                      {claim.currencyTotals.map((item) => {
                        const isPayoutCurrency = item.currencyCode === claim.primaryPayoutCurrency;
                        const rateText = isPayoutCurrency ? "1" : (rates[item.currencyCode] ?? "");
                        const rate = isPayoutCurrency ? 1 : Number(rateText);
                        const hasRate = Number.isFinite(rate) && rate > 0;
                        const converted = hasRate ? item.amount * rate : null;
                        return (
                          <div className="finance-fx-rate-card" key={item.currencyCode}>
                            <div className="finance-fx-source">
                              <span className="finance-fx-field-label">Original expense</span>
                              <strong>{money(item.amount, item.currencyCode)}</strong>
                              <small>{item.currencyCode}</small>
                            </div>
                            <div className="finance-fx-rate-input">
                              <label htmlFor={`fx-rate-${claim.claimId}-${item.currencyCode}`}>
                                {`1 ${item.currencyCode} equals`}
                              </label>
                              <div className="finance-fx-input-wrap">
                                <span>{claim.primaryPayoutCurrency}</span>
                                <input
                                  id={`fx-rate-${claim.claimId}-${item.currencyCode}`}
                                  aria-label={`Exchange rate from ${item.currencyCode} to ${claim.primaryPayoutCurrency}`}
                                  type="number"
                                  inputMode="decimal"
                                  min="0.00000001"
                                  step="any"
                                  placeholder="Enter rate"
                                  value={rateText}
                                  disabled={isPayoutCurrency}
                                  onChange={(event) =>
                                    setRates((current) => ({
                                      ...current,
                                      [item.currencyCode]: event.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <small>
                                {isPayoutCurrency
                                  ? "Base payout currency · fixed rate"
                                  : "Use the approved rate for the effective date"}
                              </small>
                            </div>
                            <div className="finance-fx-converted">
                              <span className="finance-fx-field-label">Converted amount</span>
                              <strong>
                                {converted === null || !claim.primaryPayoutCurrency
                                  ? "—"
                                  : money(converted, claim.primaryPayoutCurrency)}
                              </strong>
                              <small>{hasRate ? "Live estimate" : "Enter a valid rate"}</small>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {(() => {
                      const allRatesValid = claim.currencyTotals.every(
                        (item) =>
                          item.currencyCode === claim.primaryPayoutCurrency ||
                          Number(rates[item.currencyCode]) > 0,
                      );
                      const previewTotal = claim.currencyTotals.reduce((sum, item) => {
                        const rate =
                          item.currencyCode === claim.primaryPayoutCurrency
                            ? 1
                            : Number(rates[item.currencyCode]);
                        return sum + (Number.isFinite(rate) && rate > 0 ? item.amount * rate : 0);
                      }, 0);
                      return (
                        <div className="finance-fx-preview">
                          <div>
                            <span>Estimated payable amount</span>
                            <strong>
                              {allRatesValid
                                ? money(previewTotal, claim.primaryPayoutCurrency)
                                : "Complete all exchange rates"}
                            </strong>
                          </div>
                          <small>
                            Preview only · Final amount is recorded after Finance approval
                          </small>
                        </div>
                      );
                    })()}

                    {claim.currencyResolution && (
                      <label className="finance-fx-correction-reason">
                        <span>Correction reason (required)</span>
                        <textarea
                          value={correctionReason}
                          onChange={(event) => setCorrectionReason(event.target.value)}
                          maxLength={500}
                          rows={2}
                          placeholder="Explain why the previously approved exchange rate is being corrected."
                        />
                      </label>
                    )}

                    <div className="finance-fx-metadata">
                      <label>
                        <span>Rate source / approval reference</span>
                        <input
                          value={rateSource}
                          onChange={(event) => setRateSource(event.target.value)}
                          maxLength={160}
                          placeholder="e.g. Treasury rate sheet or bank quote reference"
                        />
                      </label>
                      <label>
                        <span>Effective date</span>
                        <input
                          type="date"
                          value={effectiveDate}
                          onChange={(event) => setEffectiveDate(event.target.value)}
                        />
                      </label>
                    </div>

                    <div className="finance-fx-editor-footer">
                      <p>
                        Check the rate source and effective date before approving. This action is
                        recorded in the Finance audit trail.
                      </p>
                      {claim.currencyResolution && (
                        <button
                          className="finance-button finance-button-secondary"
                          type="button"
                          onClick={() => setEditingRates(false)}
                          disabled={resolving}
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        className="finance-button finance-button-primary"
                        type="button"
                        disabled={
                          resolving ||
                          !rateSource.trim() ||
                          !effectiveDate ||
                          (Boolean(claim.currencyResolution) && !correctionReason.trim()) ||
                          claim.currencyTotals.some(
                            (item) =>
                              item.currencyCode !== claim.primaryPayoutCurrency &&
                              !(Number(rates[item.currencyCode]) > 0),
                          )
                        }
                        onClick={() =>
                          onResolveCurrency(
                            claim.claimId,
                            Object.fromEntries(
                              claim.currencyTotals.map((item) => [
                                item.currencyCode,
                                item.currencyCode === claim.primaryPayoutCurrency
                                  ? 1
                                  : Number(rates[item.currencyCode]),
                              ]),
                            ),
                            rateSource,
                            effectiveDate,
                            correctionReason,
                          )
                        }
                      >
                        {resolving
                          ? "Saving resolution…"
                          : claim.currencyResolution
                            ? "Save corrected rates"
                            : "Approve FX resolution"}
                      </button>
                    </div>
                  </section>
                )}
              {multiCurrency && !claim.primaryPayoutCurrency && (
                <p className="finance-validation">
                  A verified primary beneficiary bank account is required to determine the payout
                  currency.
                </p>
              )}
              {claim.currencyResolution && (
                <section
                  className="finance-beneficiary-panel"
                  aria-label="Approved currency conversion details"
                >
                  <div className="finance-claim-detail-heading">
                    <strong>Approved currency resolution</strong>
                    <div className="finance-fx-resolution-actions">
                      <span className="finance-status finance-status-ready">Approved</span>
                      {claim.activePayment?.status === "PROCESSING" ? (
                        <span className="finance-integration-note">
                          Editing is paused while payment is processing. Reconcile the payment
                          first.
                        </span>
                      ) : (
                        <button
                          className="finance-button finance-button-secondary"
                          type="button"
                          onClick={() => {
                            setRates(
                              Object.fromEntries(
                                Object.entries(claim.currencyResolution!.rates).map(
                                  ([code, rate]) => [code, String(rate)],
                                ),
                              ),
                            );
                            setRateSource(claim.currencyResolution!.rateSource);
                            setEffectiveDate(claim.currencyResolution!.effectiveDate);
                            setCorrectionReason("");
                            setEditingRates(true);
                          }}
                        >
                          Correct rates
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="finance-fx-summary">
                    <span>Final payable amount</span>
                    <strong>
                      {money(
                        claim.currencyResolution.convertedAmount,
                        claim.currencyResolution.payoutCurrencyCode,
                      )}
                    </strong>
                    <small>Payout currency · {claim.currencyResolution.payoutCurrencyCode}</small>
                  </div>
                  <div className="finance-fx-table-wrap">
                    <table className="finance-fx-table">
                      <thead>
                        <tr>
                          <th scope="col">Original expense</th>
                          <th scope="col">Approved exchange rate</th>
                          <th scope="col">Converted amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {claim.currencyTotals.map((item) => {
                          const rate = claim.currencyResolution!.rates[item.currencyCode];
                          const isPayoutCurrency =
                            item.currencyCode === claim.currencyResolution!.payoutCurrencyCode;
                          const converted = item.amount * rate;
                          return (
                            <tr key={item.currencyCode}>
                              <td>
                                <strong>{money(item.amount, item.currencyCode)}</strong>
                                <small>{item.currencyCode}</small>
                              </td>
                              <td>
                                <strong>
                                  {new Intl.NumberFormat(undefined, {
                                    maximumFractionDigits: 8,
                                  }).format(rate)}
                                </strong>
                                <small>
                                  1 {item.currencyCode} ={" "}
                                  {money(rate, claim.currencyResolution!.payoutCurrencyCode)}
                                </small>
                                {isPayoutCurrency && <small>Base payout currency</small>}
                              </td>
                              <td>
                                <strong>
                                  {money(converted, claim.currencyResolution!.payoutCurrencyCode)}
                                </strong>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <th scope="row" colSpan={2}>
                            Total approved payable
                          </th>
                          <td>
                            <strong>
                              {money(
                                claim.currencyResolution.convertedAmount,
                                claim.currencyResolution.payoutCurrencyCode,
                              )}
                            </strong>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <p className="finance-integration-note">
                    Rate source: {claim.currencyResolution.rateSource} · Effective:{" "}
                    {claim.currencyResolution.effectiveDate}. Original expense amounts are
                    preserved; converted line amounts are displayed using the approved rates.
                  </p>
                </section>
              )}
              <div className="finance-beneficiary-panel">
                <div className="finance-claim-detail-heading">
                  <strong>Beneficiary bank details</strong>
                  <button
                    className="finance-inline-link"
                    type="button"
                    onClick={onRevealBeneficiary}
                    disabled={revealing}
                  >
                    {revealing
                      ? "Retrieving…"
                      : beneficiary
                        ? "Refresh full details"
                        : "Reveal verified details"}
                  </button>
                </div>
                {beneficiary ? (
                  <div className="finance-currency-breakdown">
                    <button
                      className="finance-inline-link"
                      type="button"
                      onClick={() =>
                        void navigator.clipboard.writeText(
                          [
                            `Account holder: ${beneficiary.accountHolderName}`,
                            `Bank: ${beneficiary.bankName}`,
                            `Account number: ${beneficiary.accountNumber}`,
                            `IFSC / routing: ${beneficiary.routingCode ?? "Not provided"}`,
                            `Country: ${beneficiary.countryCode}`,
                            `Currency: ${beneficiary.currencyCode}`,
                          ].join("\\n"),
                        )
                      }
                    >
                      Copy beneficiary details
                    </button>
                    <div>
                      <span>Account holder</span>
                      <strong>{beneficiary.accountHolderName}</strong>
                    </div>
                    <div>
                      <span>Bank</span>
                      <strong>{beneficiary.bankName}</strong>
                    </div>
                    <div>
                      <span>Account number</span>
                      <strong>{beneficiary.accountNumber}</strong>
                    </div>
                    <div>
                      <span>IFSC / routing</span>
                      <strong>{beneficiary.routingCode ?? "Not provided"}</strong>
                    </div>
                    <div>
                      <span>Country / currency</span>
                      <strong>
                        {beneficiary.countryCode} · {beneficiary.currencyCode}
                      </strong>
                    </div>
                    <div>
                      <span>Verification</span>
                      <strong>{beneficiary.verificationStatus}</strong>
                    </div>
                  </div>
                ) : (
                  <p className="finance-integration-note">
                    Reveal is audited and available only for an approved claim with a verified
                    primary beneficiary account in the payout currency.
                  </p>
                )}
              </div>
              <div className="finance-expense-list">
                {claim.expenses.map((expense, index) => (
                  <div key={`${claim.claimId}-${index}`}>
                    <span>
                      {expense.category}
                      {expense.description ? ` · ${expense.description}` : ""}
                    </span>
                    <strong>{money(expense.amount, expense.currencyCode)}</strong>
                  </div>
                ))}
              </div>
              {multiCurrency && !claim.currencyResolution && (
                <p className="finance-validation">
                  The expense currency and verified beneficiary payout currency need reconciliation.
                  Enter the Finance-approved exchange rate and approve the payable amount before
                  payment.
                </p>
              )}
              {!claim.primaryPayoutCurrency && !claim.hasInvalidAmounts && (
                <p className="finance-validation">
                  A verified primary beneficiary bank account is required before this claim can be
                  paid. Add and verify the crew member’s primary bank account in Bank accounts.
                </p>
              )}
              {claim.hasInvalidAmounts && (
                <p className="finance-validation">
                  One or more expense amounts are invalid. Payment is blocked until the claim data
                  is corrected.
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* Finance list density and responsive record cards */
