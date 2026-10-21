"use client";

import { useCallback, useEffect, useState } from "react";

type MfaStatus = {
  enabled?: boolean;
  method?: string | null;
  enrolledAt?: string | null;
  recoveryCodes?: string[];
};

type Enrollment = {
  qrCodeDataUrl?: string;
  qrCode?: string;
  qrCodeUrl?: string;
  secret?: string;
  manualSetupKey?: string;
  setupKey?: string;
  otpauthUrl?: string;
  setupUri?: string;
  uri?: string;
  error?: string;
  message?: string;
  [key: string]: unknown;
};

function errorMessage(body: unknown, fallback: string) {
  if (body && typeof body === "object" && "error" in body) {
    const error = (body as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

export function SecurityMfaPanel() {
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [showRegenerateForm, setShowRegenerateForm] = useState(false);
  const [regenerateCode, setRegenerateCode] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [codesSaved, setCodesSaved] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/profile/mfa/status", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const body = (await response.json()) as MfaStatus & { error?: string };
      if (!response.ok) throw new Error(errorMessage(body, "Unable to load MFA status."));
      setStatus(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load MFA status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function beginEnrollment() {
    setStarting(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/profile/mfa/enroll", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      const body = (await response.json()) as Enrollment;
      if (!response.ok) throw new Error(errorMessage(body, "Unable to start MFA enrollment."));
      setEnrollment(body);
      setCode("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start MFA enrollment.");
    } finally {
      setStarting(false);
    }
  }

  async function verifyEnrollment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the six-digit code from your authenticator app.");
      return;
    }
    setVerifying(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/profile/mfa/enroll/verify", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = (await response.json()) as MfaStatus & {
        error?: string;
        message?: string;
        recoveryCodes?: string[];
      };
      if (!response.ok)
        throw new Error(errorMessage(body, "The authenticator code could not be verified."));
      setEnrollment(null);
      setCode("");
      let newCodes = Array.isArray(body.recoveryCodes)
        ? body.recoveryCodes.filter((item): item is string => typeof item === "string")
        : [];
      // Some identity providers return recovery codes from the enrollment verification
      // response; others return them from the immediate post-enrollment status response.
      if (newCodes.length === 0) {
        const statusResponse = await fetch("/api/profile/mfa/status", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (statusResponse.ok) {
          const statusBody = (await statusResponse.json()) as MfaStatus & { recoveryCodes?: string[] };
          if (Array.isArray(statusBody.recoveryCodes)) {
            newCodes = statusBody.recoveryCodes.filter((item): item is string => typeof item === "string");
          }
          setStatus(statusBody);
        }
      }
      setRecoveryCodes(newCodes);
      setCodesSaved(false);
      setNotice(body.message || "Multi-factor authentication has been enabled successfully.");
      if (newCodes.length === 0) {
        setError("MFA is enabled, but the identity provider did not return recovery codes. Check its MFA enrollment response configuration.");
      }
      await loadStatus();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The authenticator code could not be verified.",
      );
    } finally {
      setVerifying(false);
    }
  }

  async function regenerateRecoveryCodes(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = regenerateCode.trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      setError("Enter the current six-digit code from your authenticator app.");
      return;
    }
    setRegenerating(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/profile/mfa/recovery-codes/regenerate", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: normalizedCode }),
      });
      const body = (await response.json()) as { error?: string; message?: string; recoveryCodes?: string[] };
      if (!response.ok) throw new Error(errorMessage(body, "Unable to regenerate recovery codes."));
      const newCodes = Array.isArray(body.recoveryCodes)
        ? body.recoveryCodes.filter((item): item is string => typeof item === "string")
        : [];
      if (newCodes.length === 0) {
        throw new Error("The identity provider did not return recovery codes. No codes are displayed.");
      }
      setRecoveryCodes(newCodes);
      setCodesSaved(false);
      setRegenerateCode("");
      setShowRegenerateForm(false);
      setNotice(body.message || "Recovery codes regenerated. Your previous recovery codes are no longer valid.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to regenerate recovery codes.");
    } finally {
      setRegenerating(false);
    }
  }

  async function copyRecoveryCodes() {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      setNotice("Recovery codes copied. Store them somewhere safe.");
    } catch {
      setError("Could not copy recovery codes. Select and copy them manually.");
    }
  }

  function downloadRecoveryCodes() {
    const blob = new Blob([`ViLek MFA recovery codes\nEach code can be used once. Keep these codes private.\n\n${recoveryCodes.join("\n")}\n`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vilek-recovery-codes.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function disableMfa(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = disableCode.trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      setError("Enter the current six-digit code from your authenticator app.");
      setNotice("");
      return;
    }

    setDisabling(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/profile/mfa/disable", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: normalizedCode }),
      });
      const body = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) throw new Error(errorMessage(body, "Unable to disable MFA."));
      setEnrollment(null);
      setCode("");
      setDisableCode("");
      setShowDisableForm(false);
      setNotice(body.message || "Multi-factor authentication has been disabled.");
      await loadStatus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to disable MFA.");
    } finally {
      setDisabling(false);
    }
  }

  const qrCode = [enrollment?.qrCodeDataUrl, enrollment?.qrCode, enrollment?.qrCodeUrl].find(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  const setupUri = [enrollment?.otpauthUrl, enrollment?.setupUri, enrollment?.uri].find(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
  const setupKey = [enrollment?.manualSetupKey, enrollment?.setupKey, enrollment?.secret].find(
    (value): value is string => typeof value === "string" && value.length > 0,
  );

  return (
    <div className="space-y-6 px-6 py-7 sm:px-9 sm:py-8">
      <section className="rounded-xl border border-[#e2e9ed] bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#087f80]">
              Authenticator app
            </p>
            <h2 className="mt-2 text-lg font-bold text-[#20384b]">Two-factor authentication</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5d7181]">
              Use an authenticator app such as Google Authenticator, Microsoft Authenticator, or
              another TOTP-compatible app.
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold ${status?.enabled ? "bg-[#e7f7ed] text-[#14743b]" : "bg-[#fff4df] text-[#8c5a13]"}`}
          >
            <span
              className={`h-2 w-2 rounded-full ${status?.enabled ? "bg-[#188447]" : "bg-[#bd7a1a]"}`}
            />
            {loading ? "Checking status…" : status?.enabled ? "MFA enabled" : "MFA not enabled"}
          </span>
        </div>
        {status?.enabled ? (
          <>
            <p className="mt-5 rounded-lg border border-[#ccebd7] bg-[#f1fbf4] p-4 text-sm leading-6 text-[#286341]">
              Your authenticator is configured. identity provider verifies your second factor during
              authentication.
              {status.enrolledAt
                ? ` Enrolled ${new Date(status.enrolledAt).toLocaleString()}.`
                : ""}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {!showDisableForm && !showRegenerateForm && (
                <>
                  <button
                    type="button"
                    onClick={() => { setShowRegenerateForm(true); setRegenerateCode(""); setError(""); setNotice(""); }}
                    disabled={loading || disabling || starting || verifying || regenerating}
                    className="inline-flex items-center justify-center rounded-lg border border-[#e7d3a9] bg-white px-5 py-3 text-sm font-bold text-[#8c5a13] transition hover:bg-[#fffaf0] disabled:cursor-not-allowed disabled:opacity-60"
                  >Regenerate recovery codes</button>
                  <button
                    type="button"
                    onClick={() => { setShowDisableForm(true); setDisableCode(""); setError(""); setNotice(""); }}
                    disabled={loading || disabling || starting || verifying || regenerating}
                    className="inline-flex items-center justify-center rounded-lg border border-[#e7b8b4] bg-white px-5 py-3 text-sm font-bold text-[#a42e25] transition hover:bg-[#fff4f2] disabled:cursor-not-allowed disabled:opacity-60"
                  >Disable MFA</button>
                </>
              )}
              {showRegenerateForm && (
                <form onSubmit={regenerateRecoveryCodes} className="w-full rounded-lg border border-[#ead8b4] bg-[#fffdf7] p-4">
                  <h3 className="text-sm font-bold text-[#20384b]">Regenerate recovery codes</h3>
                  <p className="mt-1 text-sm leading-5 text-[#5d7181]">Enter your current six-digit authenticator code. Regenerating codes invalidates all existing recovery codes.</p>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <div><label htmlFor="mfa-regenerate-code" className="mb-2 block text-sm font-semibold text-[#425a68]">Authenticator code</label>
                      <input id="mfa-regenerate-code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={regenerateCode} onChange={(event) => setRegenerateCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" required className="w-56 rounded-lg border border-[#e3d6ba] bg-white px-4 py-3 text-center font-mono tracking-[0.25em] text-[#20384b] outline-none focus:border-[#b98225]" />
                    </div>
                    <button type="submit" disabled={regenerating || regenerateCode.length !== 6} className="rounded-lg bg-[#087f80] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{regenerating ? "Regenerating…" : "Confirm regeneration"}</button>
                    <button type="button" onClick={() => { setShowRegenerateForm(false); setRegenerateCode(""); setError(""); }} disabled={regenerating} className="rounded-lg border border-[#d5e2df] px-4 py-3 text-sm font-semibold text-[#526976]">Cancel</button>
                  </div>
                </form>
              )}
              {showDisableForm ? (
                <form
                  onSubmit={disableMfa}
                  className="mt-4 rounded-lg border border-[#f0d5d2] bg-[#fffaf9] p-4"
                >
                  <h3 className="text-sm font-bold text-[#20384b]">Confirm disabling MFA</h3>
                  <p className="mt-1 text-sm leading-5 text-[#5d7181]">
                    Enter the current six-digit code from your authenticator app to disable
                    multi-factor authentication.
                  </p>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <div>
                      <label
                        htmlFor="mfa-disable-code"
                        className="mb-2 block text-sm font-semibold text-[#425a68]"
                      >
                        Authenticator code
                      </label>
                      <input
                        id="mfa-disable-code"
                        autoComplete="one-time-code"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={disableCode}
                        onChange={(event) =>
                          setDisableCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                        }
                        placeholder="123456"
                        required
                        className="w-56 rounded-lg border border-[#e3c7c4] bg-white px-4 py-3 text-center font-mono tracking-[0.25em] text-[#20384b] outline-none focus:border-[#c15b51] focus:ring-2 focus:ring-[#c15b51]/15"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={disabling || disableCode.length !== 6}
                      className="rounded-lg bg-[#b9382d] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#982c24] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {disabling ? "Disabling MFA…" : "Confirm & disable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDisableForm(false);
                        setDisableCode("");
                        setError("");
                      }}
                      disabled={disabling}
                      className="rounded-lg border border-[#d5e2df] px-4 py-3 text-sm font-semibold text-[#526976] hover:bg-white disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}
              {!showDisableForm && !showRegenerateForm && (
                <p className="w-full mt-2 text-xs leading-5 text-[#7a8d94]">
                  Disabling MFA removes the second-factor requirement from your identity provider account.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="mt-5">
            <button
              type="button"
              onClick={beginEnrollment}
              disabled={loading || starting || Boolean(enrollment)}
              className="inline-flex items-center justify-center rounded-lg bg-[#087f80] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#066c6d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {starting ? "Preparing setup…" : enrollment ? "Enrollment in progress" : "Enable MFA"}
            </button>
          </div>
        )}
      </section>

      {enrollment && !status?.enabled && (
        <section className="overflow-hidden rounded-xl border border-[#e2e9ed] bg-white">
          <header className="border-b border-[#e8eef1] px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#087f80]">Step 1</p>
            <h2 className="mt-2 font-bold text-[#20384b]">Scan the QR code</h2>
          </header>
          <div className="grid gap-6 p-6 md:grid-cols-[200px_1fr]">
            {qrCode ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-[#e2e9ed] bg-[#f9fbfa] p-4">
                {/* identity provider returns this image during the authenticated enrollment flow. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCode}
                  alt="Authenticator setup QR code"
                  className="h-44 w-44 object-contain"
                />
                <p className="mt-3 text-center text-xs text-[#5d7181]">
                  Scan with your authenticator app
                </p>
              </div>
            ) : (
              <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-[#cbd9de] bg-[#f9fbfa] p-4 text-center text-sm text-[#5d7181]">
                identity provider did not return a QR image. Use the setup key or URI instead.
              </div>
            )}
            <div className="space-y-4">
              {setupKey && (
                <div>
                  <label
                    htmlFor="mfa-setup-key"
                    className="mb-2 block text-sm font-semibold text-[#425a68]"
                  >
                    Manual setup key
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="mfa-setup-key"
                      readOnly
                      value={setupKey}
                      className="min-w-0 flex-1 rounded-lg border border-[#dce6e8] bg-[#f7faf8] px-3 py-3 font-mono text-xs text-[#20384b]"
                    />
                    <button
                      type="button"
                      onClick={() => void navigator.clipboard.writeText(setupKey)}
                      className="rounded-lg border border-[#d5e2df] px-3 py-2 text-sm font-semibold text-[#087f80] hover:bg-[#f3faf7]"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
              {setupUri && (
                <div>
                  <label
                    htmlFor="mfa-setup-uri"
                    className="mb-2 block text-sm font-semibold text-[#425a68]"
                  >
                    Setup URI
                  </label>
                  <textarea
                    id="mfa-setup-uri"
                    readOnly
                    value={setupUri}
                    rows={3}
                    className="w-full resize-y rounded-lg border border-[#dce6e8] bg-[#f7faf8] px-3 py-3 font-mono text-xs text-[#20384b]"
                  />
                </div>
              )}
              <p className="text-xs leading-5 text-[#7a8d94]">
                Keep the setup key private. It can be used to generate codes for your account.
              </p>
            </div>
          </div>
          <form onSubmit={verifyEnrollment} className="border-t border-[#e8eef1] bg-[#fbfdfc] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#087f80]">Step 2</p>
            <h2 className="mt-2 font-bold text-[#20384b]">Verify your authenticator</h2>
            <p className="mt-1 text-sm text-[#5d7181]">
              Enter the current six-digit code generated by your authenticator app.
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <label
                  htmlFor="mfa-code"
                  className="mb-2 block text-sm font-semibold text-[#425a68]"
                >
                  Authenticator code
                </label>
                <input
                  id="mfa-code"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  required
                  className="w-56 rounded-lg border border-[#b9d6c6] bg-white px-4 py-3 text-center font-mono tracking-[0.25em] text-[#20384b] outline-none focus:border-[#168447] focus:ring-2 focus:ring-[#168447]/15"
                />
              </div>
              <button
                type="submit"
                disabled={verifying || code.length !== 6}
                className="rounded-lg bg-[#168447] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#126f3b] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {verifying ? "Verifying…" : "Verify & enable"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEnrollment(null);
                  setCode("");
                  setError("");
                }}
                className="rounded-lg border border-[#d5e2df] px-4 py-3 text-sm font-semibold text-[#526976] hover:bg-white"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {recoveryCodes.length > 0 && !codesSaved && (
        <section className="rounded-xl border border-[#e7d3a9] bg-[#fffdf7] p-5 sm:p-6" aria-labelledby="recovery-codes-heading">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8c5a13]">Save these now</p>
          <h2 id="recovery-codes-heading" className="mt-2 text-lg font-bold text-[#20384b]">Your MFA recovery codes</h2>
          <p className="mt-2 text-sm leading-6 text-[#5d7181]">Each code can be used only once to access your account if you cannot use your authenticator. These codes are shown only in this session; store them securely.</p>
          <div className="mt-4 grid grid-cols-1 gap-2 rounded-lg border border-[#eadfca] bg-white p-4 sm:grid-cols-2">
            {recoveryCodes.map((recoveryCode, index) => <code key={`${index}-${recoveryCode}`} className="rounded bg-[#f8f7f2] px-3 py-2 font-mono text-sm text-[#20384b]">{recoveryCode}</code>)}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => void copyRecoveryCodes()} className="rounded-lg border border-[#d5e2df] bg-white px-4 py-3 text-sm font-semibold text-[#087f80]">Copy codes</button>
            <button type="button" onClick={downloadRecoveryCodes} className="rounded-lg border border-[#d5e2df] bg-white px-4 py-3 text-sm font-semibold text-[#087f80]">Download codes</button>
            <button type="button" onClick={() => { setRecoveryCodes([]); setCodesSaved(true); }} className="rounded-lg bg-[#087f80] px-4 py-3 text-sm font-bold text-white">I have saved my codes</button>
          </div>
        </section>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-[#f0c9c6] bg-[#fff4f2] px-4 py-3 text-sm leading-6 text-[#a42e25]"
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="rounded-lg border border-[#ccebd7] bg-[#f1fbf4] px-4 py-3 text-sm leading-6 text-[#286341]"
        >
          {notice}
        </div>
      )}
    </div>
  );
}
