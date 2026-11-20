"use client";

import { createContext, ReactNode, useContext, useState } from "react";

const CrewMobileNavContext = createContext<(() => void) | null>(null);

export function CrewMobileNavToggle() {
  const toggle = useContext(CrewMobileNavContext);
  if (!toggle) return null;
  return (
    <button
      type="button"
      className="crew-mobile-nav-toggle crew-dashboard-mobile-toggle"
      onClick={toggle}
      aria-label="Open navigation menu"
    >
      <span aria-hidden="true">☰</span>
    </button>
  );
}

export function CrewDashboardShell({
  sidebar,
  children,
  className = "",
}: {
  sidebar: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <CrewMobileNavContext.Provider value={() => setMobileNavOpen((value) => !value)}>
      <div
        className={`role-dashboard ${className}${sidebarCollapsed ? " crew-sidebar-collapsed" : ""}${mobileNavOpen ? " crew-mobile-nav-open" : ""}`}
      >
        <aside
          className="role-dashboard-sidebar"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) setMobileNavOpen(false);
          }}
        >
          <button
            type="button"
            className="crew-sidebar-toggle"
            onClick={() => setSidebarCollapsed((value) => !value)}
            aria-label={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}
          >
            <span aria-hidden="true">{sidebarCollapsed ? "›" : "‹"}</span>
          </button>
          {sidebar}
        </aside>
        <div className="role-dashboard-main">{children}</div>
        {mobileNavOpen && (
          <button
            type="button"
            className="crew-mobile-nav-backdrop"
            aria-label="Close navigation menu"
            onClick={() => setMobileNavOpen(false)}
          />
        )}
      </div>
    </CrewMobileNavContext.Provider>
  );
}
