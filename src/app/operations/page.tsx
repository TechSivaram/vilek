"use client";

import Link from "next/link";

export const dynamic = "force-dynamic";

const sections = [
  {
    href: "/operations/flights",
    icon: "✈",
    title: "Flights",
    description:
      "Create and maintain scheduled flights, routes, and operational timing.",
    group: "operations",
    tag: "Scheduling",
  },
  {
    href: "/operations/flight-crew",
    icon: "♧",
    title: "Flight crew",
    description:
      "Assign eligible crew members and designations to scheduled flights.",
    group: "operations",
    tag: "Assignments",
  },
  {
    href: "/operations/crew-members",
    icon: "♧",
    title: "Crew members",
    description: "Maintain crew records used by flight operations.",
    group: "operations",
    tag: "People",
  },
  {
    href: "/operations/crew-designations",
    icon: "✳",
    title: "Crew designations",
    description: "Manage the designations used for crew planning.",
    group: "reference",
    tag: "Reference data",
  },
  {
    href: "/operations/airlines",
    icon: "⇢",
    title: "Airlines",
    description: "Maintain airline reference data for flight records.",
    group: "reference",
    tag: "Reference data",
  },
  {
    href: "/operations/airports",
    icon: "⌖",
    title: "Airports",
    description: "Maintain airport codes, locations, and time zones.",
    group: "reference",
    tag: "Reference data",
  },
  {
    href: "/operations/maintenance",
    icon: "⚙",
    title: "Operational data & settings",
    description:
      "Manage crew eligibility, qualifications, complement rules, operational settings, and audit history.",
    group: "configuration",
    tag: "Rules & governance",
  },
];

function SectionCard({ section }: { section: (typeof sections)[number] }) {
  return (
    <Link href={section.href} className={`ops-card ops-card-${section.group}`}>
      <div className="ops-card-top">
        <span className="ops-icon" aria-hidden="true">
          {section.icon}
        </span>
        <span className="ops-card-tag">{section.tag}</span>
      </div>
      <h3>{section.title}</h3>
      <p>{section.description}</p>
      <span className="ops-card-action">
        Open section <span aria-hidden="true">↗</span>
      </span>
    </Link>
  );
}

export default function FlightOperationsDashboardPage() {
  return (
    <main className="ops-dashboard">
      <section className="ops-hero">
        <div className="ops-hero-copy">
          <div className="ops-eyebrow">
            <span className="ops-eyebrow-dot" /> FLIGHT OPERATIONS WORKSPACE
          </div>
          <h1>Flight Operations</h1>
          <p>
            Plan and manage flights, coordinate crew assignments, and maintain
            the operational reference data your team relies on.
          </p>
        </div>
        <div className="ops-hero-mark" aria-hidden="true">
          <div className="ops-orbit ops-orbit-one" />
          <div className="ops-orbit ops-orbit-two" />
          <span>✈</span>
        </div>
      </section>

      <section className="ops-section" aria-labelledby="ops-core-title">
        <div className="ops-section-heading">
          <div>
            <h2 id="ops-core-title">Daily operations</h2>
            <p>Core tools for flight planning and crew coordination.</p>
          </div>
          <span className="ops-section-count">3 WORKSPACES</span>
        </div>
        <div className="ops-card-grid ops-card-grid-three">
          {sections
            .filter((section) => section.group === "operations")
            .map((section) => (
              <SectionCard key={section.href} section={section} />
            ))}
        </div>
      </section>

      <section className="ops-section" aria-labelledby="ops-reference-title">
        <div className="ops-section-heading">
          <div>
            <h2 id="ops-reference-title">Reference data</h2>
            <p>
              Keep the shared records behind operational planning accurate and
              consistent.
            </p>
          </div>
          <span className="ops-section-count">3 WORKSPACES</span>
        </div>
        <div className="ops-card-grid ops-card-grid-three">
          {sections
            .filter((section) => section.group === "reference")
            .map((section) => (
              <SectionCard key={section.href} section={section} />
            ))}
        </div>
      </section>

      <section className="ops-section" aria-labelledby="ops-config-title">
        <div className="ops-section-heading">
          <div>
            <h2 id="ops-config-title">Configuration &amp; oversight</h2>
            <p>
              Manage eligibility rules, operational settings, and audit history.
            </p>
          </div>
        </div>
        <div className="ops-card-grid ops-card-grid-config">
          {sections
            .filter((section) => section.group === "configuration")
            .map((section) => (
              <SectionCard key={section.href} section={section} />
            ))}
        </div>
      </section>
    </main>
  );
}
