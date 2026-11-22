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
export function CrewBankAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
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
      if (!r.ok) throw new Error(j.error);
      setAccounts(j.accounts ?? []);
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
      <section className="finance-panel">
        <div className="finance-panel-heading">
          <div>
            <span className="finance-eyebrow">BENEFICIARY ACCOUNTS</span>
            <h2>Your bank accounts</h2>
            <p>
              Only verified active accounts can be selected for reimbursement. Account numbers are
              encrypted and displayed in masked form.
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
                  </div>
                </div>
                {a.verificationStatus === "VERIFIED" && !a.isPrimary && (
                  <button
                    className="finance-button finance-button-secondary"
                    onClick={() => void act({ id: a.id, action: "SET_PRIMARY" })}
                  >
                    Make primary
                  </button>
                )}
                {a.verificationStatus !== "VERIFIED" && (
                  <small>Primary selection is available after verification.</small>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="finance-panel">
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
              onChange={(e) => setForm({ ...form, countryCode: e.target.value.toUpperCase() })}
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
              onChange={(e) => setForm({ ...form, currencyCode: e.target.value.toUpperCase() })}
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
          <button className="finance-button finance-button-primary" type="submit" disabled={saving}>
            {saving ? "Registering…" : "Register bank account"}
          </button>
        </form>
      </section>
    </div>
  );
}
