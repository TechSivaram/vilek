import "./login.css";

type Props = { searchParams: Promise<{ error?: string; loggedOut?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { error, loggedOut } = await searchParams;
  return (
    <main className="login-page">
      <section className="login-card">
        <p className="login-brand">VILEK · CREW EXPENSES</p>
        <h1 className="login-title">Sign in to ViLek</h1>
        <p className="login-description">
          Continue securely with your organization identity through TSCloak.
        </p>
        {loggedOut === "1" ? (
          <p role="status" className="login-notice login-notice--success">
            You have been signed out of ViLek.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="login-notice login-notice--error">
            {error}
          </p>
        ) : null}
        <a href="/api/auth/login" className="login-button">
          Continue with TSCloak
        </a>
        <p className="login-footnote">
          Access is granted only to users provisioned and authorized in ViLek.
        </p>
      </section>
    </main>
  );
}
