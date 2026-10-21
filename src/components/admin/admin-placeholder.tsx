import Link from "next/link";

export type AdminPlaceholderConfig = {
  title: string;
  description: string;
  eyebrow?: string;
  planned: string[];
  notice?: string;
};

export function AdminPlaceholder({
  title,
  description,
  eyebrow = "ADMINISTRATION",
  planned,
  notice,
}: AdminPlaceholderConfig) {
  return (
    <>
      <section className="admin-page-heading">
        <div>
          <div className="admin-eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <span className="admin-coming-soon">Coming soon</span>
      </section>
      <section className="admin-placeholder-panel">
        <div className="admin-placeholder-art" aria-hidden="true">
          <span>✳</span>
          <i />
          <b />
        </div>
        <div className="admin-placeholder-copy">
          <div className="admin-placeholder-kicker">THIS SECTION IS PLANNED</div>
          <h2>{title} workspace</h2>
          <p className="admin-placeholder-description">
            This page is part of the ViLek administration workspace. Its management actions will be
            enabled in a later implementation phase.
          </p>
          <h3>Planned capabilities</h3>
          <ul>
            {planned.map((item) => (
              <li key={item}>
                <span aria-hidden="true">✓</span>
                {item}
              </li>
            ))}
          </ul>
          {notice ? <p className="admin-placeholder-notice">{notice}</p> : null}
          <Link href="/admin" className="admin-secondary-button">
            ← Back to dashboard
          </Link>
        </div>
      </section>
    </>
  );
}
