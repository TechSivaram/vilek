"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";

const CrewMobileNavContext = createContext<{ toggle: () => void; open: boolean } | null>(null);

export function CrewMobileNavToggle() {
  const navigation = useContext(CrewMobileNavContext);
  if (!navigation) return null;
  return (
    <button
      type="button"
      className="crew-mobile-nav-toggle crew-dashboard-mobile-toggle"
      onClick={navigation.toggle}
      aria-label={navigation.open ? "Close navigation menu" : "Open navigation menu"}
      aria-expanded={navigation.open}
      aria-controls="workspace-primary-navigation"
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

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);

  return (
    <CrewMobileNavContext.Provider
      value={{ toggle: () => setMobileNavOpen((value) => !value), open: mobileNavOpen }}
    >
      <div
        className={`role-dashboard ${className}${sidebarCollapsed ? " crew-sidebar-collapsed" : ""}${mobileNavOpen ? " crew-mobile-nav-open" : ""}`}
      >
        <aside
          id="workspace-primary-navigation"
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
