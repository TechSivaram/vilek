import Link from "next/link";

type Props = { searchParams: Promise<{ error?: string; loggedOut?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { error, loggedOut } = await searchParams;
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f5f7fb", fontFamily: "Arial, sans-serif" }}>
      <section style={{ width: "100%", maxWidth: 440, padding: 36, background: "white", border: "1px solid #e3e8ef", borderRadius: 18, boxShadow: "0 16px 48px rgba(18, 38, 63, .08)" }}>
        <p style={{ color: "#0f766e", fontWeight: 700, letterSpacing: 2, fontSize: 12 }}>VILEK · CREW EXPENSES</p>
        <h1 style={{ margin: "12px 0", color: "#14213d", fontSize: 30 }}>Sign in to ViLek</h1>
        <p style={{ color: "#5b6577", lineHeight: 1.6 }}>Continue securely with your organization identity through TSCloak.</p>
        {loggedOut === "1" ? <p role="status" style={{ background: "#ecfdf5", color: "#065f46", padding: 12, borderRadius: 8 }}>You have been signed out of ViLek.</p> : null}
        {error ? <p role="alert" style={{ background: "#fff1f2", color: "#9f1239", padding: 12, borderRadius: 8, overflowWrap: "anywhere" }}>{error}</p> : null}
        <a href="/api/auth/login" style={{ display: "block", marginTop: 24, padding: "13px 16px", textAlign: "center", background: "#0f766e", color: "white", borderRadius: 9, fontWeight: 700, textDecoration: "none" }}>Continue with TSCloak</a>
        <p style={{ color: "#7b8494", fontSize: 12, marginTop: 22 }}>Access is granted only to users provisioned and authorized in ViLek.</p>
      </section>
    </main>
  );
}
