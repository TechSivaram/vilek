"use client";
import { useCallback, useEffect, useState } from "react";
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
  const load = useCallback(async () => {
    const r = await fetch("/api/crew/bank-accounts", { cache: "no-store" });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    setItems(j.accounts ?? []);
  }, []);
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);
  async function decide(id: string, action: "VERIFY" | "REJECT") {
    setBusy(id);
    setError("");
    try {
      const r = await fetch("/api/crew/bank-accounts", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action }),
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
          className="finance-button finance-button-secondary"
          onClick={() => load().catch((e) => setError(e.message))}
        >
          Refresh
        </button>
      </div>
      {error && <div className="finance-alert finance-alert-error">{error}</div>}
      <div className="crew-bank-account-list">
        {items
          .filter((x) => ["PENDING", "NEEDS_REVIEW"].includes(x.verificationStatus))
          .map((a) => (
            <article className="crew-bank-account" key={a.id}>
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
              </div>
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
            </article>
          ))}
        {items.every((x) => !["PENDING", "NEEDS_REVIEW"].includes(x.verificationStatus)) && (
          <p className="finance-empty">No bank accounts require manual review.</p>
        )}
      </div>
    </section>
  );
}
