import Image from "next/image";
import styles from "./login.module.css";

type Props = {
  searchParams: Promise<{ error?: string; loggedOut?: string }>;
};

function FlightIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="m5 25 16-4 15-14c2-2 5-2 7 0l-12 17 8 8-3 3-11-6-9 12-4-1 5-15-11 3-1-3Z" />
    </svg>
  );
}

function ExpenseIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="7" y="12" width="34" height="25" rx="4" />
      <path d="M7 19h34M31 28h4" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M12 6h24v36l-5-3-7 3-7-3-5 3V6Z" />
      <path d="M18 16h12M18 23h12M18 30h9" />
    </svg>
  );
}

function ClaimIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="m24 6 18 10-18 10L6 16 24 6Z" />
      <path d="m8 24 16 9 16-9M8 32l16 9 16-9" />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: Props) {
  const { error, loggedOut } = await searchParams;

  return (
    <main className={styles["login-page"]}>
      <div className={styles["login-topline"]} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <section className={styles["login-branding"]} aria-label="ViLek crew expense management">
        <Image
          src="/Branding/Banner.png"
          alt="ViLek — Digital Flight Ledger"
          width={1774}
          height={887}
          priority
          className={styles["login-brand-image"]}
        />
      </section>

      <section className={styles["login-hero"]} aria-labelledby="login-hero-title">
        <span className={styles["login-heading-accent"]} aria-hidden="true" />
        <h1 id="login-hero-title">
          Crew Expenses.
          <br />
          <span>Made Simple.</span>
        </h1>
        <p className={styles["login-subtitle"]}>
          Track expenses, manage receipts and
          <br className={styles["desktop-break"]} /> streamline claims — all in one place.
        </p>

        <div
          className={styles["login-journey"]}
          aria-label="Flights, Expenses, Receipts and Claims"
        >
          <div className={styles["login-journey-step"]}>
            <span className={styles["login-icon"]}>
              <FlightIcon />
            </span>
            <span>Flights</span>
          </div>
          <i aria-hidden="true" />
          <div className={styles["login-journey-step"]}>
            <span className={styles["login-icon"]}>
              <ExpenseIcon />
            </span>
            <span>Expenses</span>
          </div>
          <i aria-hidden="true" />
          <div className={styles["login-journey-step"]}>
            <span className={styles["login-icon"]}>
              <ReceiptIcon />
            </span>
            <span>Receipts</span>
          </div>
          <i aria-hidden="true" />
          <div className={styles["login-journey-step"]}>
            <span className={styles["login-icon"]}>
              <ClaimIcon />
            </span>
            <span>Claims</span>
          </div>
        </div>
      </section>

      <section className={styles["login-panel"]} aria-label="ViLek secure sign in">
        <div className={styles["login-card"]}>
          <div className={styles["login-card-kicker"]}>
            <span className={`${styles["login-rule"]} ${styles["login-rule--orange"]}`} />
            <span>SECURE ACCESS</span>
            <span className={`${styles["login-rule"]} ${styles["login-rule--green"]}`} />
          </div>

          <h2 className={styles["login-title"]}>Welcome to ViLek</h2>
          <p className={styles["login-description"]}>
            Sign in with your organization’s identity provider
            <br className={styles["card-desktop-break"]} /> to access your ViLek workspace.
          </p>

          {loggedOut === "1" ? (
            <p
              role="status"
              className={`${styles["login-notice"]} ${styles["login-notice--success"]}`}
            >
              You have been signed out of ViLek.
            </p>
          ) : null}
          {error ? (
            <p
              role="alert"
              className={`${styles["login-notice"]} ${styles["login-notice--error"]}`}
            >
              {error}
            </p>
          ) : null}

          <a href="/api/auth/login" className={styles["login-button"]}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 17 15 12 10 7M15 12H3M13 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
            </svg>
            <span>Continue with identity provider</span>
          </a>

          <div className={styles["login-footnote"]}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 1 1 8 0v3M12 14v3" />
            </svg>
            <p>
              Access is available to authorized users
              <br className={styles["card-desktop-break"]} /> provisioned in ViLek.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
