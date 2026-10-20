export type WorkspaceRoleCode =
  | "ADMIN"
  | "CREW"
  | "APPROVER"
  | "FINANCE"
  | "FLIGHT_OPERATIONS_MANAGER";

export type WorkspaceDefinition = {
  code: WorkspaceRoleCode;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  href: string;
  eyebrow: string;
  heading: string;
  summary: string;
  capabilities: { icon: string; title: string; description: string; href: string }[];
};

export const WORKSPACES: WorkspaceDefinition[] = [
  {
    code: "CREW",
    name: "Crew",
    shortName: "Crew workspace",
    description: "Manage your flights, expenses, receipts and reimbursement claims.",
    icon: "✈",
    href: "/crew",
    eyebrow: "YOUR FLIGHTS · YOUR EXPENSES",
    heading: "Crew workspace",
    summary: "Keep your flight-related expenses and reimbursement claims organized.",
    capabilities: [
      { icon: "↗", title: "My expenses", description: "Review and organize flight-related expenses.", href: "/crew#expenses" },
      { icon: "▤", title: "My claims", description: "Prepare claims and follow their progress.", href: "/crew#claims" },
      { icon: "✈", title: "My flights", description: "View your flight assignments and related details.", href: "/crew#flights" },
    ],
  },
  {
    code: "APPROVER",
    name: "Approver",
    shortName: "Approver workspace",
    description: "Review submitted reimbursement claims and manage approval work.",
    icon: "✓",
    href: "/approver",
    eyebrow: "CLAIM REVIEW · DECISIONS",
    heading: "Approver workspace",
    summary: "Focus on claims awaiting review and the decisions that need your attention.",
    capabilities: [
      { icon: "▤", title: "Pending approvals", description: "Review submitted claims and supporting information.", href: "/approver#pending" },
      { icon: "◷", title: "Review history", description: "Return to previously reviewed claims.", href: "/approver#history" },
    ],
  },
  {
    code: "FINANCE",
    name: "Finance",
    shortName: "Finance workspace",
    description: "Process approved reimbursements and review financial exceptions.",
    icon: "₹",
    href: "/finance",
    eyebrow: "REIMBURSEMENTS · FINANCIAL CONTROL",
    heading: "Finance workspace",
    summary: "Manage approved reimbursements and keep payment processing moving.",
    capabilities: [
      { icon: "₹", title: "Approved claims", description: "Review claims ready for financial processing.", href: "/finance#approved" },
      { icon: "↗", title: "Payment history", description: "Review processed reimbursements and exceptions.", href: "/finance#payments" },
    ],
  },
  {
    code: "FLIGHT_OPERATIONS_MANAGER",
    name: "Flight Operations",
    shortName: "Flight operations workspace",
    description: "Manage flight records, crew assignments and operational planning.",
    icon: "◈",
    href: "/operations",
    eyebrow: "FLIGHTS · CREW · SCHEDULES",
    heading: "Flight operations workspace",
    summary: "Coordinate flight records and crew assignments from one operational workspace.",
    capabilities: [
      { icon: "✈", title: "Flights", description: "Maintain flight records and operational details.", href: "/operations#flights" },
      { icon: "♙", title: "Crew assignments", description: "Review crew records and assignments.", href: "/operations#crew" },
    ],
  },
  {
    code: "ADMIN",
    name: "Administration",
    shortName: "Admin workspace",
    description: "Manage users, roles, reference data and system configuration.",
    icon: "⚙",
    href: "/admin",
    eyebrow: "SYSTEM · ACCESS · CONFIGURATION",
    heading: "Administration workspace",
    summary: "Manage ViLek access, roles, finance reference data and system-wide configuration. Flight and crew data belong to Flight Operations.",
    capabilities: [
      { icon: "♙", title: "Users & access", description: "Manage users, roles and role assignments.", href: "/admin/users" },
      { icon: "⚙", title: "System settings", description: "Review configuration and system operations.", href: "/admin/settings" },
    ],
  },
];

export function getWorkspace(code: string) {
  return WORKSPACES.find((workspace) => workspace.code === code);
}

export function getWorkspacesForRoles(roleCodes: readonly string[]) {
  return WORKSPACES.filter((workspace) => roleCodes.includes(workspace.code));
}
