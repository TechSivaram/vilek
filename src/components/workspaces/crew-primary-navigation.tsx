"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const CREW_NAV_ITEMS = [
  { href: "/crew", label: "Overview", icon: "◫", exact: true },
  { href: "/crew/flights", label: "My flights", icon: "✈" },
  { href: "/crew/expenses", label: "My expenses", icon: "₹" },
  { href: "/crew/claims", label: "My claims", icon: "▤" },
  { href: "/crew/bank-accounts", label: "Bank accounts", icon: "⌑" },
] as const;

export function CrewPrimaryNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="role-dashboard-nav" aria-label="Crew navigation">
      {CREW_NAV_ITEMS.map((item) => {
        const active =
          "exact" in item && item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? "is-active" : undefined}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
          >
            <span className="crew-nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="crew-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
