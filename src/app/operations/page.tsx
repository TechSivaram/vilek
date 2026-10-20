import Link from "next/link";

export const dynamic = "force-dynamic";

const sections = [
  {
    href: "/operations/flights",
    icon: "✈",
    title: "Flights",
    description:
      "Create and maintain scheduled flights, routes, and operational timing.",
  },
  {
    href: "/operations/flight-crew",
    icon: "♧",
    title: "Flight Crew",
    description:
      "Assign eligible crew members and designations to scheduled flights.",
  },
  {
    href: "/operations/crew-members",
    icon: "♧",
    title: "Crew members",
    description: "Maintain crew records used by flight operations.",
  },
  {
    href: "/operations/crew-designations",
    icon: "✳",
    title: "Crew designations",
    description: "Manage the designations used for crew planning.",
  },
  {
    href: "/operations/airlines",
    icon: "⇢",
    title: "Airlines",
    description: "Maintain airline reference data for flight records.",
  },
  {
    href: "/operations/airports",
    icon: "⌖",
    title: "Airports",
    description: "Maintain airport codes, locations, and time zones.",
  },
  {
    href: "/operations/maintenance",
    icon: "⚙",
    title: "Operational data & settings",
    description:
      "Maintain crew eligibility, qualifications, complement rules, operational settings, and review audit history.",
  },
];

export default function FlightOperationsDashboardPage() {
  return (
    <>
      <section className="admin-page-heading">
        <div>
          <div className="admin-eyebrow">FLIGHT OPERATIONS</div>
          <h1>Flight Operations</h1>
          <p>
            Manage flight records and the reference data required for
            operational planning.
          </p>
        </div>
      </section>
      <section
        className="admin-resource-grid"
        aria-label="Flight Operations features"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1rem",
        }}
      >
        {sections.map((section) => (
          <Link
            href={section.href}
            key={section.href}
            className="admin-panel"
            style={{
              display: "block",
              textDecoration: "none",
              color: "inherit",
              padding: "1.25rem",
            }}
          >
            <div
              style={{ fontSize: "1.6rem", marginBottom: ".75rem" }}
              aria-hidden="true"
            >
              {section.icon}
            </div>
            <h2 style={{ margin: "0 0 .5rem" }}>{section.title}</h2>
            <p style={{ margin: 0 }}>{section.description}</p>
            <div style={{ marginTop: "1rem", fontWeight: 600 }}>
              Open section →
            </div>
          </Link>
        ))}
      </section>
    </>
  );
}
